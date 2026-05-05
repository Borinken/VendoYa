import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Paso 1: Crear la tabla si no existe
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS system_config (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        config_key VARCHAR(100) UNIQUE NOT NULL,
        config_value TEXT,
        is_encrypted BOOLEAN DEFAULT FALSE,
        description TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `
    
    try {
      const { error: tableError } = await supabase.rpc('exec_sql', {
        sql: createTableSQL
      })
      
      if (tableError && !tableError.message.includes('does not exist')) {
        // Si el error no es "función no existe", intenta insertar de todos modos
        console.log('Table might exist or RPC not available:', tableError.message)
      }
    } catch {
      console.log('Could not create table via RPC, attempting direct insert')
    }

    // Configuración a insertar
    const configs = [
      {
        config_key: 'twilio_account_sid',
        config_value: 'ACc3e5774a1190b865c73ad5e03c25f883',
        is_encrypted: true,
        description: 'Twilio Account SID'
      },
      {
        config_key: 'twilio_auth_token',
        config_value: '',
        is_encrypted: true,
        description: 'Twilio Auth Token - INGRESAR EN LA UI'
      },
      {
        config_key: 'twilio_whatsapp_number',
        config_value: 'whatsapp:+14155238886',
        is_encrypted: false,
        description: 'Número de WhatsApp de Twilio'
      },
      {
        config_key: 'default_recipient_whatsapp',
        config_value: 'whatsapp:+34604347363',
        is_encrypted: false,
        description: 'Tu número de WhatsApp'
      },
      {
        config_key: 'whatsapp_template_appointment',
        config_value: 'HXb5b62575e6e4ff6129ad7c8efe1f983e',
        is_encrypted: false,
        description: 'Template de citas'
      },
      {
        config_key: 'scraping_delay_min',
        config_value: '2000',
        is_encrypted: false,
        description: 'Delay mínimo entre requests (ms)'
      },
      {
        config_key: 'scraping_delay_max',
        config_value: '5000',
        is_encrypted: false,
        description: 'Delay máximo entre requests (ms)'
      },
      {
        config_key: 'scraping_max_concurrent',
        config_value: '3',
        is_encrypted: false,
        description: 'Máximo de scrapers concurrentes'
      }
    ]

    const results = []
    
    for (const config of configs) {
      const { error } = await supabase
        .from('system_config')
        .upsert(config, { onConflict: 'config_key' })
      
      results.push({
        key: config.config_key,
        status: error ? 'error' : 'success',
        message: error?.message || 'OK'
      })
    }

    // Verificar
    const { data, error: selectError } = await supabase
      .from('system_config')
      .select('config_key, config_value, description')
      .order('config_key')

    return NextResponse.json({
      success: true,
      results,
      data,
      selectError: selectError?.message
    })

  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    )
  }
}
