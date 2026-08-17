// Test envío de WhatsApp
const { createClient } = require('@supabase/supabase-js')
const twilio = require('twilio')

const supabaseUrl = 'https://iuqumqztkzpfefkgguuq.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1cXVtcXp0a3pwZmVma2dndXVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzkyNTIyNywiZXhwIjoyMDkzNTAxMjI3fQ.rjrR32YKRQVutuNd0T1CvZ0YFRjoimrdnGfWy0x5cNc'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testWhatsApp() {
  console.log('📱 Obteniendo credenciales de Supabase...')
  
  const { data: config } = await supabase
    .from('system_config')
    .select('*')
    .in('config_key', ['twilio_account_sid', 'twilio_auth_token', 'twilio_whatsapp_number'])
  
  const accountSid = config?.find(c => c.config_key === 'twilio_account_sid')?.config_value
  const authToken = config?.find(c => c.config_key === 'twilio_auth_token')?.config_value
  const fromNumber = config?.find(c => c.config_key === 'twilio_whatsapp_number')?.config_value
  
  console.log('📋 Credenciales:')
  console.log('  Account SID:', accountSid)
  console.log('  Auth Token:', authToken ? `${authToken.substring(0, 10)}...` : 'NO ENCONTRADO')
  console.log('  From Number:', fromNumber)
  
  if (!accountSid || !authToken || !fromNumber) {
    console.error('❌ Faltan credenciales')
    return
  }
  
  try {
    console.log('\n🚀 Iniciando cliente Twilio...')
    const client = twilio(accountSid, authToken)
    
    console.log('📤 Enviando mensaje de prueba...')
    const message = await client.messages.create({
      from: fromNumber,
      to: 'whatsapp:+34604347363',
      body: '🎉 ¡Vendoya CRM configurado correctamente! Tu sistema está listo para usar.'
    })
    
    console.log('✅ Mensaje enviado exitosamente!')
    console.log('   SID:', message.sid)
    console.log('   Status:', message.status)
    console.log('   Desde:', message.from)
    console.log('   Hacia:', message.to)
    console.log('\n📲 Revisa tu WhatsApp en el número +34604347363')
    
  } catch (error) {
    console.error('❌ Error al enviar:', error.message)
    if (error.code) console.error('   Código:', error.code)
    if (error.moreInfo) console.error('   Info:', error.moreInfo)
  }
}

testWhatsApp()
