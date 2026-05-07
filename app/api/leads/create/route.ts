import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Inicialización segura de Supabase
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials');
  }

  return createClient(supabaseUrl, supabaseKey);
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();

    const {
      address,
      city,
      postalCode,
      propertyType,
      urgentSituation,
      situationDetails,
      photos,
      name,
      email,
      phone,
      source,
    } = body;

    // Validaciones básicas
    if (!address || !city || !urgentSituation || !phone) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Generar valoración automática con IA
    const valuation = await generateValuation({
      address,
      city,
      postalCode,
      propertyType,
      urgentSituation,
      photos,
    });

    // Crear lead en la base de datos
    const { data: lead, error } = await supabase
      .from('urgent_leads')
      .insert({
        address,
        city,
        postal_code: postalCode,
        property_type: propertyType,
        urgent_situation: urgentSituation,
        situation_details: situationDetails,
        photos: photos || [],
        name,
        email,
        phone,
        source: source || 'directo',
        estimated_value: valuation.estimatedValue,
        valuation_data: valuation,
        status: 'nuevo',
        priority: determinePriority(urgentSituation),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating lead:', error);
      return NextResponse.json(
        { error: 'Error al crear lead' },
        { status: 500 }
      );
    }

    // Programar mensajes de seguimiento automático
    await scheduleFollowUpMessages(supabase, lead.id, phone, name);

    // Enviar WhatsApp inmediato con valoración
    await sendWhatsAppValuation(phone, name, valuation, lead.id);

    // Crear interacción inicial
    await supabase.from('lead_interactions').insert({
      lead_id: lead.id,
      type: 'whatsapp',
      direction: 'outbound',
      content: `Valoración enviada: ${valuation.estimatedValue}€`,
    });

    return NextResponse.json({
      success: true,
      leadId: lead.id,
      estimatedValue: valuation.estimatedValue,
    });
  } catch (error: unknown) {
    console.error('Error in create lead:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}

// Generar valoración automática con IA (Groq)
async function generateValuation(data: {
  address: string;
  city: string;
  postalCode?: string;
  propertyType: string;
  urgentSituation: string;
  photos: string[];
}) {
  const groqApiKey = process.env.GROQ_API_KEY;

  if (!groqApiKey) {
    // Fallback: valoración simple basada en ciudad
    return generateSimpleValuation(data);
  }

  try {
    const prompt = `Eres un tasador inmobiliario experto en España. Analiza esta propiedad y proporciona una valoración estimada en formato JSON.

Datos de la propiedad:
- Dirección: ${data.address}
- Ciudad: ${data.city}
- Código postal: ${data.postalCode || 'No especificado'}
- Tipo: ${data.propertyType}
- Situación: ${data.urgentSituation}
- Número de fotos: ${data.photos.length}

Proporciona la respuesta SOLO en formato JSON con esta estructura exacta:
{
  "estimatedValue": 250000,
  "minValue": 230000,
  "maxValue": 270000,
  "pricePerSqm": 2500,
  "marketAnalysis": "Breve análisis del mercado en esta zona",
  "recommendations": ["Recomendación 1", "Recomendación 2"],
  "urgencyImpact": "Cómo la situación urgente afecta al precio"
}`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'Eres un tasador inmobiliario experto. Responde SOLO con JSON válido.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error('Error en Groq API');
    }

    const result = await response.json();
    const content = result.choices[0]?.message?.content;

    // Extraer JSON del contenido
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    throw new Error('No se pudo parsear la respuesta de IA');
  } catch (error) {
    console.error('Error generating AI valuation:', error);
    return generateSimpleValuation(data);
  }
}

// Valoración simple sin IA (fallback)
function generateSimpleValuation(data: {
  city: string;
  propertyType: string;
  urgentSituation: string;
}) {
  // Precios promedio por m² en principales ciudades españolas
  const cityPrices: Record<string, number> = {
    madrid: 3500,
    barcelona: 4200,
    valencia: 2100,
    sevilla: 1900,
    zaragoza: 1700,
    málaga: 2400,
    bilbao: 3200,
    alicante: 1800,
  };

  const cityNormalized = data.city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const pricePerSqm = cityPrices[cityNormalized] || 2000; // Default 2000€/m²

  // Estimar m² según tipo de propiedad
  const avgSqm: Record<string, number> = {
    piso: 80,
    casa: 150,
    atico: 90,
    duplex: 120,
    estudio: 40,
    local: 100,
    terreno: 500,
    otro: 80,
  };

  const sqm = avgSqm[data.propertyType] || 80;
  const baseValue = pricePerSqm * sqm;

  // Ajuste por urgencia (situaciones urgentes reducen precio)
  const urgencyDiscount: Record<string, number> = {
    herencia: 0.95,
    divorcio: 0.93,
    embargo: 0.85,
    ruina: 0.75,
    mudanza: 0.92,
    liquidez: 0.88,
    okupacion: 0.70,
    otro: 0.95,
  };

  const discount = urgencyDiscount[data.urgentSituation] || 0.9;
  const estimatedValue = Math.round(baseValue * discount);
  const minValue = Math.round(estimatedValue * 0.9);
  const maxValue = Math.round(estimatedValue * 1.1);

  return {
    estimatedValue,
    minValue,
    maxValue,
    pricePerSqm,
    marketAnalysis: `El mercado en ${data.city} está activo con un precio promedio de ${pricePerSqm}€/m². Tu propiedad tipo ${data.propertyType} se encuentra en un rango competitivo.`,
    recommendations: [
      'Considera una tasación presencial para mayor precisión',
      'El mercado actual favorece ventas rápidas con buen precio',
      'Nuestros agentes pueden ayudarte a maximizar el valor',
    ],
    urgencyImpact: getUrgencyMessage(data.urgentSituation),
  };
}

function getUrgencyMessage(situation: string): string {
  const messages: Record<string, string> = {
    herencia: 'Las herencias pueden beneficiarse de ventas rápidas para liquidar el patrimonio.',
    divorcio: 'En casos de divorcio, una venta ágil puede facilitar la liquidación de bienes.',
    embargo: 'Actuar rápido puede evitar pérdidas mayores y proteger tu historial crediticio.',
    ruina: 'Propiedades que necesitan reforma pueden venderse "tal cual" a inversores.',
    mudanza: 'Ventas por mudanza urgente suelen completarse en 30-60 días.',
    liquidez: 'Podemos conectarte con compradores que cierran operaciones rápido.',
    okupacion: 'Existen inversores especializados en propiedades con esta situación.',
    otro: 'Analizaremos tu caso específico para ofrecerte la mejor solución.',
  };

  return messages[situation] || messages.otro;
}

function determinePriority(situation: string): string {
  const highPriority = ['embargo', 'liquidez', 'okupacion'];
  const mediumPriority = ['divorcio', 'mudanza'];

  if (highPriority.includes(situation)) return 'alta';
  if (mediumPriority.includes(situation)) return 'media';
  return 'media';
}

// Programar mensajes de seguimiento
async function scheduleFollowUpMessages(
  supabase: ReturnType<typeof createClient>,
  leadId: string,
  phone: string,
  name: string
) {
  const now = new Date();

  const messages = [
    {
      lead_id: leadId,
      type: 'whatsapp',
      template: 'day_1',
      scheduled_for: new Date(now.getTime() + 24 * 60 * 60 * 1000), // +1 día
      content: `Hola ${name}, ayer recibiste la valoración de tu vivienda. ¿Tienes alguna duda? Nuestros expertos pueden ayudarte a vender rápido y al mejor precio. ¿Hablamos? 📞`,
    },
    {
      lead_id: leadId,
      type: 'whatsapp',
      template: 'day_3',
      scheduled_for: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // +3 días
      content: `${name}, ¿sigues interesado/a en vender tu propiedad en ${name}? Tenemos compradores activos buscando en tu zona. Podemos agendar una visita esta semana. ¿Te viene bien? 🏠`,
    },
    {
      lead_id: leadId,
      type: 'whatsapp',
      template: 'day_7',
      scheduled_for: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // +7 días
      content: `Hola ${name}, hace una semana solicitaste la valoración. Si aún no has vendido, podemos ayudarte. Tenemos una red de +500 agencias que pueden conseguirte ofertas en 48h. ¿Te interesa? 🚀`,
    },
  ];

  await supabase.from('scheduled_messages').insert(messages);
}

// Enviar WhatsApp con valoración (simulado - necesitarás WhatsApp Business API)
async function sendWhatsAppValuation(
  phone: string,
  name: string,
  valuation: { estimatedValue: number; minValue: number; maxValue: number },
  leadId: string
) {
  // TODO: Integrar con WhatsApp Business API (Twilio, WhatsApp Cloud API, etc.)
  // Por ahora, solo simulamos el envío
  console.log(`[WhatsApp] Enviando valoración a ${phone}:`);
  console.log(`Hola ${name}, tu vivienda está valorada en ${valuation.estimatedValue}€`);
  console.log(`Rango: ${valuation.minValue}€ - ${valuation.maxValue}€`);
  console.log(`Link: ${process.env.NEXT_PUBLIC_URL}/vende-rapido/valoracion/${leadId}`);

  // Ejemplo de integración con Twilio (descomentar cuando tengas cuenta):
  /*
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER;

  if (twilioAccountSid && twilioAuthToken) {
    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: `whatsapp:${twilioWhatsAppNumber}`,
        To: `whatsapp:${phone}`,
        Body: `Hola ${name}, ¡tu valoración está lista! 🏠\n\nTu vivienda está valorada en: ${valuation.estimatedValue}€\n\nVe los detalles completos aquí: ${process.env.NEXT_PUBLIC_URL}/vende-rapido/valoracion/${leadId}\n\n¿Quieres vender rápido? Responde SÍ y te contactamos en menos de 1 hora.`
      }),
    });
  }
  */

  return true;
}
