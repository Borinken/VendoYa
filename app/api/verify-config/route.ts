import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data, error } = await supabase
      .from('system_config')
      .select('config_key, config_value, description')
      .order('config_key')

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        hint: 'La tabla system_config no existe. Ejecuta el SQL en Supabase.'
      }, { status: 500 })
    }

    const accountSid = data?.find(d => d.config_key === 'twilio_account_sid')
    const authToken = data?.find(d => d.config_key === 'twilio_auth_token')
    const whatsappNumber = data?.find(d => d.config_key === 'twilio_whatsapp_number')

    return NextResponse.json({
      success: true,
      tableExists: true,
      recordCount: data?.length || 0,
      config: data?.map(item => ({
        key: item.config_key,
        value: item.config_key.includes('token') ? '****' : item.config_value,
        description: item.description
      })),
      status: {
        accountSid: !!accountSid?.config_value,
        authToken: !!authToken?.config_value,
        whatsappNumber: !!whatsappNumber?.config_value,
        ready: !!accountSid?.config_value && !!authToken?.config_value && !!whatsappNumber?.config_value
      }
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}
