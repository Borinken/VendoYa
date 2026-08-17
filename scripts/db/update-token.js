// Script para actualizar Auth Token en Supabase
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://iuqumqztkzpfefkgguuq.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1cXVtcXp0a3pwZmVma2dndXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzkyNTIyNywiZXhwIjoyMDkzNTAxMjI3fQ.rjrR32YKRQVutuNd0T1CvZ0YFRjoimrdnGfWy0x5cNc'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function updateAuthToken() {
  const authToken = '20453adf8286af06e892601ac12746d0'
  
  console.log('🔐 Actualizando Auth Token en Supabase...')
  
  const { data, error } = await supabase
    .from('system_config')
    .update({ 
      config_value: authToken,
      updated_at: new Date().toISOString()
    })
    .eq('config_key', 'twilio_auth_token')
    .select()
  
  if (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
  
  console.log('✅ Auth Token actualizado exitosamente')
  console.log('📊 Datos actualizados:', data)
  
  // Verificar que quedó guardado
  const { data: config, error: readError } = await supabase
    .from('system_config')
    .select('*')
    .eq('config_key', 'twilio_auth_token')
    .single()
  
  if (readError) {
    console.error('❌ Error al verificar:', readError)
  } else {
    console.log('🔍 Verificación:', {
      key: config.config_key,
      valueLength: config.config_value?.length || 0,
      hasValue: !!config.config_value && config.config_value.length > 0,
      updated_at: config.updated_at
    })
  }
}

updateAuthToken()
