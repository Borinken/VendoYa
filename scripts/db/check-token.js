// Verificar Auth Token en Supabase
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://iuqumqztkzpfefkgguuq.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1cXVtcXp0a3pwZmVma2dndXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzkyNTIyNywiZXhwIjoyMDkzNTAxMjI3fQ.rjrR32YKRQVutuNd0T1CvZ0YFRjoimrdnGfWy0x5cNc'

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
