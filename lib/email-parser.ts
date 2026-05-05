import OpenAI from 'openai'

// Configurar Groq API (gratis)
const useGroq = true
const apiKey = useGroq ? process.env.GROQ_API_KEY : process.env.OPENAI_API_KEY
const baseURL = useGroq ? 'https://api.groq.com/openai/v1' : undefined

const openai = new OpenAI({
  apiKey: apiKey || 'demo-key',
  baseURL
})

export interface EmailData {
  from: string
  to: string
  subject: string
  body: string
  date: Date
  attachments?: string[]
}

export interface ParsedEmailData {
  source: 'idealista' | 'fotocasa' | 'realadvisor' | 'habitaclia' | 'owner' | 'buyer' | 'unknown'
  type: 'lead_buyer' | 'lead_seller' | 'property_inquiry' | 'owner_contact' | 'general'
  contact: {
    name?: string
    email?: string
    phone?: string
  }
  property?: {
    reference?: string
    address?: string
    city?: string
    type?: string
    price?: number
    operation?: 'venta' | 'alquiler'
  }
  message: string
  intent: string
  priority: 'high' | 'medium' | 'low'
  requiresFollowup: boolean
  suggestedTasks: string[]
}

/**
 * Detecta el origen del email basándose en el remitente y contenido
 */
export function detectEmailSource(email: EmailData): ParsedEmailData['source'] {
  const fromLower = email.from.toLowerCase()
  const subjectLower = email.subject.toLowerCase()
  const bodyLower = email.body.toLowerCase()
  
  // Detectar portales inmobiliarios
  if (fromLower.includes('idealista') || bodyLower.includes('idealista.com')) {
    return 'idealista'
  }
  if (fromLower.includes('fotocasa') || bodyLower.includes('fotocasa.es')) {
    return 'fotocasa'
  }
  if (fromLower.includes('realadvisor') || bodyLower.includes('realadvisor')) {
    return 'realadvisor'
  }
  if (fromLower.includes('habitaclia') || bodyLower.includes('habitaclia')) {
    return 'habitaclia'
  }
  
  // Detectar si es propietario o comprador por palabras clave
  if (
    subjectLower.includes('vender') || 
    subjectLower.includes('tasar') ||
    bodyLower.includes('quiero vender') ||
    bodyLower.includes('soy propietario')
  ) {
    return 'owner'
  }
  
  if (
    subjectLower.includes('comprar') || 
    subjectLower.includes('alquilar') ||
    subjectLower.includes('me interesa') ||
    bodyLower.includes('quiero comprar') ||
    bodyLower.includes('busco piso')
  ) {
    return 'buyer'
  }
  
  return 'unknown'
}

/**
 * Usa IA para extraer información estructurada del email
 */
export async function parseEmailWithAI(email: EmailData): Promise<ParsedEmailData> {
  const source = detectEmailSource(email)
  
  const prompt = `
Eres un asistente de CRM inmobiliario. Analiza este email y extrae la información estructurada.

EMAIL:
De: ${email.from}
Asunto: ${email.subject}
Cuerpo: ${email.body}

EXTRAE:
1. Nombre completo del contacto
2. Teléfono (con código de país si es posible)
3. Email
4. Tipo de consulta: lead_buyer (busca comprar/alquilar), lead_seller (quiere vender), property_inquiry (pregunta sobre inmueble específico), owner_contact (propietario contactando), general
5. Si menciona un inmueble específico: referencia, dirección, ciudad, tipo (piso/casa/local), precio, operación (venta/alquiler)
6. Intención principal del mensaje (resumen en 1 frase)
7. Prioridad: high (urgente, primera visita, oferta), medium (interesado, solicita info), low (consulta general)
8. Si requiere seguimiento urgente
9. Tareas sugeridas para el agente (máximo 3)

IMPORTANTE:
- Si no encuentras algún dato, déjalo vacío
- Los números de teléfono pueden estar en formato español (+34) o internacional
- Las referencias de Idealista suelen ser códigos alfanuméricos
- Devuelve SOLO JSON válido, sin explicaciones

FORMATO DE RESPUESTA (JSON):
{
  "contact": {
    "name": "string o null",
    "email": "string o null",
    "phone": "string o null"
  },
  "type": "lead_buyer|lead_seller|property_inquiry|owner_contact|general",
  "property": {
    "reference": "string o null",
    "address": "string o null",
    "city": "string o null",
    "type": "string o null",
    "price": number o null,
    "operation": "venta|alquiler o null"
  },
  "message": "string",
  "intent": "string",
  "priority": "high|medium|low",
  "requiresFollowup": boolean,
  "suggestedTasks": ["tarea1", "tarea2"]
}
`

  try {
    const completion = await openai.chat.completions.create({
      model: useGroq ? 'llama-3.3-70b-versatile' : 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    })

    const result = JSON.parse(completion.choices[0].message.content || '{}')
    
    return {
      source,
      type: result.type || 'general',
      contact: {
        name: result.contact?.name || extractNameFromEmail(email.from),
        email: result.contact?.email || extractEmailAddress(email.from),
        phone: result.contact?.phone || extractPhoneFromText(email.body)
      },
      property: result.property || undefined,
      message: result.message || email.body.substring(0, 500),
      intent: result.intent || 'Consulta general',
      priority: result.priority || 'medium',
      requiresFollowup: result.requiresFollowup ?? true,
      suggestedTasks: result.suggestedTasks || ['Responder email', 'Agendar seguimiento']
    }
  } catch (error) {
    console.error('Error parsing email with AI:', error)
    
    // Fallback: parsing básico sin IA
    return {
      source,
      type: 'general',
      contact: {
        name: extractNameFromEmail(email.from),
        email: extractEmailAddress(email.from),
        phone: extractPhoneFromText(email.body)
      },
      message: email.body.substring(0, 500),
      intent: email.subject,
      priority: 'medium',
      requiresFollowup: true,
      suggestedTasks: ['Responder email']
    }
  }
}

/**
 * Extrae el nombre del formato "Nombre Apellido <email@domain.com>"
 */
function extractNameFromEmail(from: string): string | undefined {
  const match = from.match(/^([^<]+)\s*</)
  if (match) {
    return match[1].trim().replace(/"/g, '')
  }
  return undefined
}

/**
 * Extrae la dirección de email
 */
function extractEmailAddress(from: string): string {
  const match = from.match(/<([^>]+)>/) || from.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)
  return match ? match[1] : from
}

/**
 * Extrae números de teléfono del texto
 */
function extractPhoneFromText(text: string): string | undefined {
  // Patrones comunes de teléfono español
  const patterns = [
    /\+34\s?[6-9]\d{2}\s?\d{2}\s?\d{2}\s?\d{2}/,  // +34 XXX XX XX XX
    /[6-9]\d{2}\s?\d{2}\s?\d{2}\s?\d{2}/,          // XXX XX XX XX
    /\+34\s?[6-9]\d{8}/,                           // +34XXXXXXXXX
    /[6-9]\d{8}/                                    // XXXXXXXXX
  ]
  
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      return match[0].replace(/\s/g, '')
    }
  }
  
  return undefined
}

/**
 * Crea un resumen del email para notificaciones
 */
export function createEmailSummary(parsed: ParsedEmailData): string {
  const sourceLabel = {
    idealista: '📍 Idealista',
    fotocasa: '🏠 Fotocasa',
    realadvisor: '💼 RealAdvisor',
    habitaclia: '🔑 Habitaclia',
    owner: '👤 Propietario',
    buyer: '🤝 Comprador',
    unknown: '📧 Email'
  }[parsed.source]
  
  const typeLabel = {
    lead_buyer: 'Cliente interesado',
    lead_seller: 'Captación',
    property_inquiry: 'Consulta inmueble',
    owner_contact: 'Contacto propietario',
    general: 'Consulta general'
  }[parsed.type]
  
  let summary = `${sourceLabel} - ${typeLabel}\n`
  
  if (parsed.contact.name) {
    summary += `👤 ${parsed.contact.name}\n`
  }
  if (parsed.contact.phone) {
    summary += `📱 ${parsed.contact.phone}\n`
  }
  if (parsed.property?.address) {
    summary += `📍 ${parsed.property.address}\n`
  }
  if (parsed.property?.price) {
    summary += `💰 ${parsed.property.price.toLocaleString('es-ES')}€\n`
  }
  
  summary += `\n${parsed.intent}`
  
  return summary
}
