const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const envPath = path.join(__dirname, '.env.local')
let supabaseUrl, supabaseServiceKey

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=')
    const value = valueParts.join('=').trim()
    if (key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = value
    if (key === 'SUPABASE_SERVICE_ROLE_KEY') supabaseServiceKey = value
  })
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function verify() {
  console.log('🔍 Verificando configuración en Supabase...\n')
  
  const { data, error } = await supabase
    .from('system_config')
    .select('config_key, config_value, description')
    .order('config_key')

  if (error) {
    console.log('❌ Error:', error.message)
    return
  }

  if (!data || data.length === 0) {
    console.log('⚠️  La tabla existe pero está vacía')
    return
  }

  console.log('✅ CONFIGURACIÓN ENCONTRADA:\n')
  data.forEach(item => {
    const val = item.config_key.includes('token') && item.config_value 
      ? '****' 
      : (item.config_value || '(vacío)')
    console.log(`   ${item.config_key.padEnd(32)} = ${val}`)
  })
  
  console.log('\n')
  
  // Verificar campos críticos
  const accountSid = data.find(d => d.config_key === 'twilio_account_sid')
  const authToken = data.find(d => d.config_key === 'twilio_auth_token')
  const whatsappNumber = data.find(d => d.config_key === 'twilio_whatsapp_number')
  
  console.log('📋 ESTADO:\n')
  console.log(`   Account SID:      ${accountSid ? '✅ Configurado' : '❌ Falta'}`)
  console.log(`   Auth Token:       ${authToken?.config_value ? '✅ Configurado' : '⚠️  FALTA - Agregar en /dashboard/config'}`)
  console.log(`   WhatsApp Number:  ${whatsappNumber ? '✅ Configurado' : '❌ Falta'}`)
  
  console.log('\n')
  
  if (!authToken?.config_value) {
    console.log('⏭️  SIGUIENTE PASO:')
    console.log('   1. Ve a: https://vendoya-hwxuip8lq-borinkens-projects.vercel.app/dashboard/config')
    console.log('   2. Ingresa tu Twilio Auth Token')
    console.log('   3. Click en "Guardar Cambios"\n')
  } else {
    console.log('🎉 ¡TODO LISTO! Puedes probar el sistema.\n')
  }
}

verify()
