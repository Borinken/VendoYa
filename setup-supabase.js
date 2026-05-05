/**
 * Script de configuración de Supabase
 * Ejecuta: node setup-supabase.js
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Leer .env.local manualmente
const envPath = path.join(__dirname, '.env.local')
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
let supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=')
    const value = valueParts.join('=').trim()
    if (key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = value
    if (key === 'SUPABASE_SERVICE_ROLE_KEY') supabaseServiceKey = value
  })
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Variables de entorno no encontradas')
  console.error('Asegúrate de tener NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupDatabase() {
  console.log('🚀 Iniciando configuración de Supabase...\n')

  // Configuración a insertar
  console.log('📋 Insertando configuración en system_config...\n')
  
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

  for (const config of configs) {
    const { error } = await supabase
      .from('system_config')
      .upsert(config, { onConflict: 'config_key' })
    
    if (error) {
      console.log(`⚠️  ${config.config_key}: ${error.message}`)
    } else {
      console.log(`✅ ${config.config_key}: Configurado`)
    }
  }

  // Verificar configuración
  console.log('\n📋 Verificando configuración...')
  
  const { data, error: selectError } = await supabase
    .from('system_config')
    .select('config_key, config_value, description')
    .order('config_key')

  if (selectError) {
    console.error('❌ Error al verificar:', selectError.message)
  } else {
    console.log('\n✅ Configuración guardada:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    data.forEach(item => {
      const value = item.config_value || '(vacío)'
      const displayValue = item.config_key.includes('token') ? '****' : value
      console.log(`${item.config_key.padEnd(35)} | ${displayValue}`)
    })
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  }

  console.log('🎉 ¡Configuración completada!\n')
  console.log('📝 SIGUIENTE PASO:')
  console.log('   Ve a: https://vendoya-cv83q00zy-borinkens-projects.vercel.app/dashboard/config')
  console.log('   Ingresa tu Twilio Auth Token y guarda\n')
}

setupDatabase().catch(error => {
  console.error('❌ Error fatal:', error)
  process.exit(1)
})
