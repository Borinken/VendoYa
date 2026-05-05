// Test envío de WhatsApp desde producción
async function testWhatsApp() {
  console.log('📱 Probando API de WhatsApp en producción...')
  
  const url = 'https://vendoya-5y6vin6ti-borinkens-projects.vercel.app/api/whatsapp/send'
  
  const payload = {
    phone: '+34604347363',
    message: '🎉 ¡Vendoya CRM configurado correctamente! Tu sistema está operativo y listo para usar.'
  }
  
  console.log('📤 Enviando request...')
  console.log('   URL:', url)
  console.log('   Payload:', payload)
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    })
    
    const data = await response.json()
    
    console.log('\n📊 Respuesta:')
    console.log('   Status:', response.status)
    console.log('   Data:', JSON.stringify(data, null, 2))
    
    if (response.ok) {
      console.log('\n✅ ¡Mensaje enviado exitosamente!')
      console.log('📲 Revisa tu WhatsApp: +34604347363')
    } else {
      console.log('\n❌ Error al enviar:', data.error || 'Error desconocido')
    }
    
  } catch (error) {
    console.error('\n❌ Error en request:', error.message)
  }
}

testWhatsApp()
