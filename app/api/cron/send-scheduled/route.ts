import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials');
  }

  return createClient(supabaseUrl, supabaseKey);
}

export async function GET(request: Request) {
  try {
    // Verificar token de autorización (para seguridad)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'dev-secret-change-me';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const supabase = getSupabaseClient();
    const now = new Date();

    // Obtener mensajes pendientes que deben enviarse ahora
    const { data: pendingMessages, error } = await supabase
      .from('scheduled_messages')
      .select(`
        *,
        urgent_leads (
          id,
          name,
          phone,
          email,
          city,
          address
        )
      `)
      .eq('status', 'pending')
      .lte('scheduled_for', now.toISOString())
      .limit(50); // Procesar máximo 50 por ejecución

    if (error) {
      console.error('Error fetching pending messages:', error);
      return NextResponse.json(
        { error: 'Error obteniendo mensajes pendientes' },
        { status: 500 }
      );
    }

    if (!pendingMessages || pendingMessages.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        message: 'No hay mensajes pendientes',
      });
    }

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Procesar cada mensaje
    for (const message of pendingMessages) {
      try {
        const lead = message.urgent_leads;
        
        if (!lead) {
          results.failed++;
          results.errors.push(`Lead no encontrado para mensaje ${message.id}`);
          continue;
        }

        // Enviar según el tipo
        let success = false;
        
        if (message.type === 'whatsapp') {
          success = await sendWhatsAppMessage(lead, message.content);
        } else if (message.type === 'email') {
          success = await sendEmailMessage(lead, message.content);
        } else if (message.type === 'sms') {
          success = await sendSMSMessage(lead, message.content);
        }

        if (success) {
          // Marcar como enviado
          await supabase
            .from('scheduled_messages')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
            })
            .eq('id', message.id);

          // Actualizar flags en urgent_leads
          const updateData: any = {};
          if (message.template === 'day_1') {
            updateData.follow_up_day_1_sent = true;
          } else if (message.template === 'day_3') {
            updateData.follow_up_day_3_sent = true;
          } else if (message.template === 'day_7') {
            updateData.follow_up_day_7_sent = true;
          }
          updateData.last_follow_up_at = new Date().toISOString();

          await supabase
            .from('urgent_leads')
            .update(updateData)
            .eq('id', lead.id);

          // Registrar interacción
          await supabase.from('lead_interactions').insert({
            lead_id: lead.id,
            type: message.type,
            direction: 'outbound',
            content: message.content,
            metadata: {
              template: message.template,
              automated: true,
            },
          });

          results.sent++;
        } else {
          results.failed++;
          results.errors.push(`Error enviando mensaje ${message.id}`);
          
          await supabase
            .from('scheduled_messages')
            .update({
              status: 'failed',
              error_message: 'Error al enviar mensaje',
            })
            .eq('id', message.id);
        }
      } catch (error: unknown) {
        console.error('Error processing message:', error);
        results.failed++;
        results.errors.push(
          `Error procesando mensaje ${message.id}: ${error instanceof Error ? error.message : 'Unknown'}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.sent + results.failed,
      sent: results.sent,
      failed: results.failed,
      errors: results.errors.length > 0 ? results.errors : undefined,
    });
  } catch (error: unknown) {
    console.error('Error in send-scheduled:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}

// Enviar WhatsApp (integración con Twilio o WhatsApp Business API)
async function sendWhatsAppMessage(lead: any, content: string): Promise<boolean> {
  try {
    // TODO: Integrar con tu proveedor de WhatsApp (Twilio, WhatsApp Cloud API, etc.)
    console.log(`[WhatsApp] Enviando a ${lead.phone}:`, content);

    // Ejemplo con Twilio (descomentar cuando tengas configuración):
    /*
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER;

    if (!twilioAccountSid || !twilioAuthToken || !twilioWhatsAppNumber) {
      console.warn('Twilio credentials not configured');
      return false;
    }

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization:
            'Basic ' +
            Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: `whatsapp:${twilioWhatsAppNumber}`,
          To: `whatsapp:${lead.phone}`,
          Body: content,
        }),
      }
    );

    return response.ok;
    */

    // Por ahora, simular éxito
    return true;
  } catch (error) {
    console.error('Error sending WhatsApp:', error);
    return false;
  }
}

// Enviar Email
async function sendEmailMessage(lead: any, content: string): Promise<boolean> {
  try {
    // TODO: Integrar con tu proveedor de email (Resend, SendGrid, etc.)
    console.log(`[Email] Enviando a ${lead.email}:`, content);

    // Ejemplo con Resend (descomentar cuando tengas API key):
    /*
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      console.warn('Resend API key not configured');
      return false;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Vendoya <hola@vendoya.es>',
        to: lead.email,
        subject: 'Seguimiento de tu valoración - Vendoya',
        html: content,
      }),
    });

    return response.ok;
    */

    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

// Enviar SMS
async function sendSMSMessage(lead: any, content: string): Promise<boolean> {
  try {
    // TODO: Integrar con tu proveedor de SMS (Twilio, etc.)
    console.log(`[SMS] Enviando a ${lead.phone}:`, content);

    return true;
  } catch (error) {
    console.error('Error sending SMS:', error);
    return false;
  }
}
