import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { phone, message, contentSid, contentVariables } = await request.json()

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone es requerido' },
        { status: 400 }
      )
    }

    // Validar que tenga message O contentSid
    if (!message && !contentSid) {
      return NextResponse.json(
        { error: 'Debe proporcionar message o contentSid' },
        { status: 400 }
      )
    }

    // Obtener credenciales de Twilio desde la configuración
    const { data: configData, error: configError } = await supabase
      .from('system_config')
      .select('config_key, config_value')
      .in('config_key', ['twilio_account_sid', 'twilio_auth_token', 'twilio_whatsapp_number'])

    if (configError) {
      console.error('Error obteniendo configuración:', configError)
      return NextResponse.json(
        { error: 'Error al obtener configuración' },
        { status: 500 }
      )
    }

    const config: Record<string, string> = {}
    configData?.forEach(item => {
      config[item.config_key] = item.config_value
    })

    const accountSid = config['twilio_account_sid']
    const authToken = config['twilio_auth_token']
    const fromNumber = config['twilio_whatsapp_number']

    if (!accountSid || !authToken || !fromNumber) {
      return NextResponse.json(
        { error: 'Credenciales de Twilio no configuradas. Ve a Configuración.' },
        { status: 400 }
      )
    }

    // Formatear número de destino
    let toNumber = phone
    if (!toNumber.startsWith('whatsapp:')) {
      toNumber = `whatsapp:${toNumber}`
    }

    // Enviar mensaje usando Twilio API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
    
    // Preparar parámetros según el tipo de mensaje
    const params: Record<string, string> = {
      From: fromNumber,
      To: toNumber,
    }

    if (contentSid) {
      // Usar Content Template
      params.ContentSid = contentSid
      if (contentVariables) {
        params.ContentVariables = typeof contentVariables === 'string' 
          ? contentVariables 
          : JSON.stringify(contentVariables)
      }
    } else {
      // Usar mensaje simple
      params.Body = message
    }
    
    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(params),
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('Error de Twilio:', result)
      return NextResponse.json(
        { error: result.message || 'Error al enviar mensaje' },
        { status: response.status }
      )
    }

    return NextResponse.json({
      success: true,
      messageSid: result.sid,
      status: result.status,
    })

  } catch (error) {
    console.error('Error en API de WhatsApp:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
