/**
 * WhatsApp Helper - Utilidades para enviar mensajes de WhatsApp
 * Soporta mensajes simples y Content Templates de Twilio
 */

export interface WhatsAppMessage {
  phone: string
  message?: string
  contentSid?: string
  contentVariables?: Record<string, string>
}

export interface WhatsAppResponse {
  success: boolean
  messageSid?: string
  status?: string
  error?: string
}

/**
 * Envía un mensaje simple de WhatsApp
 */
export async function sendSimpleWhatsApp(
  phone: string, 
  message: string
): Promise<WhatsAppResponse> {
  try {
    const response = await fetch('/api/whatsapp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, message })
    })

    return await response.json()
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}

/**
 * Envía un mensaje usando Content Template
 */
export async function sendTemplateWhatsApp(
  phone: string,
  contentSid: string,
  variables?: Record<string, string>
): Promise<WhatsAppResponse> {
  try {
    const response = await fetch('/api/whatsapp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        phone, 
        contentSid, 
        contentVariables: variables 
      })
    })

    return await response.json()
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}

/**
 * Templates predefinidos
 */
export const WhatsAppTemplates = {
  /**
   * Template de recordatorio de cita
   * Variables: date, time
   */
  appointmentReminder: (date: string, time: string) => ({
    contentSid: 'HXb5b62575e6e4ff6129ad7c8efe1f983e',
    variables: { '1': date, '2': time }
  }),

  /**
   * Notificación de nuevas propiedades
   * Usar mensaje simple ya que no tenemos template personalizado aún
   */
  newProperties: (count: number, filterName: string) => ({
    message: `🏠 *Vendoya CRM - Nueva Captura*\n\n` +
      `Se encontraron *${count} nuevas propiedades* que coinciden con tu filtro:\n\n` +
      `📋 Filtro: ${filterName}\n` +
      `⏰ Fecha: ${new Date().toLocaleString('es-ES')}\n\n` +
      `Revisa el CRM para ver los detalles completos.`
  }),

  /**
   * Notificación de visita programada
   */
  visitScheduled: (propertyAddress: string, date: string, time: string) => ({
    message: `🏠 *Visita Programada*\n\n` +
      `Propiedad: ${propertyAddress}\n` +
      `📅 Fecha: ${date}\n` +
      `🕐 Hora: ${time}\n\n` +
      `¿Necesitas cambiar la cita? Responde este mensaje.`
  }),

  /**
   * Alerta de precio reducido
   */
  priceReduced: (propertyTitle: string, oldPrice: number, newPrice: number) => ({
    message: `💰 *¡Precio Reducido!*\n\n` +
      `${propertyTitle}\n\n` +
      `Antes: ${oldPrice.toLocaleString('es-ES')}€\n` +
      `Ahora: ${newPrice.toLocaleString('es-ES')}€\n` +
      `Ahorro: ${(oldPrice - newPrice).toLocaleString('es-ES')}€\n\n` +
      `¡No pierdas esta oportunidad!`
  })
}

/**
 * Ejemplo de uso:
 * 
 * // Mensaje simple
 * await sendSimpleWhatsApp('+34604347363', '¡Hola desde Vendoya!')
 * 
 * // Template de cita
 * const template = WhatsAppTemplates.appointmentReminder('12/1', '3pm')
 * await sendTemplateWhatsApp('+34604347363', template.contentSid, template.variables)
 * 
 * // Nuevas propiedades
 * const msg = WhatsAppTemplates.newProperties(5, 'Pisos en Madrid')
 * await sendSimpleWhatsApp('+34604347363', msg.message)
 */
