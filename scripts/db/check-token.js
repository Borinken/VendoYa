// Verificar Auth Token en Supabase
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://iuqumqztkzpfefkgguuq.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkToken() {
  const { data, error } = await supabase
    .from('system_config')
    .select('*')
    .eq('config_key', 'twilio_auth_token')
    .single()
  
  if (error) {
    console.error('❌ Error:', error)
    return
  }
  
  console.log('🔍 Auth Token en DB:')
  console.log('  Key:', data.config_key)
  console.log('  Value:', data.config_value)
  console.log('  Value Length:', data.config_value?.length)
  console.log('  Value Type:', typeof data.config_value)
  console.log('  Is Truthy:', !!data.config_value)
  console.log('  Is Empty String:', data.config_value === '')
  console.log('  First 10 chars:', data.config_value?.substring(0, 10))
  console.log('  Last 10 chars:', data.config_value?.substring(data.config_value.length - 10))
}

checkToken()
