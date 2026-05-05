/**
 * Conector para Gmail API
 * Permite leer emails de cuentas Gmail y procesarlos automáticamente
 */

export interface GmailMessage {
  id: string
  threadId: string
  from: string
  to: string
  subject: string
  body: string
  date: Date
  labels: string[]
  attachments: Array<{
    filename: string
    mimeType: string
    size: number
    attachmentId: string
  }>
}

export interface GmailConfig {
  accessToken: string
  refreshToken?: string
  email: string
}

/**
 * Cliente para Gmail API
 */
export class GmailClient {
  private accessToken: string
  private email: string
  
  constructor(config: GmailConfig) {
    this.accessToken = config.accessToken
    this.email = config.email
  }
  
  /**
   * Obtiene mensajes recientes de Gmail
   */
  async getRecentMessages(maxResults: number = 10, query?: string): Promise<GmailMessage[]> {
    try {
      // Obtener lista de IDs de mensajes
      const searchQuery = query || `to:${this.email} is:unread`
      const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=${encodeURIComponent(searchQuery)}`
      
      const listResponse = await fetch(listUrl, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!listResponse.ok) {
        throw new Error(`Gmail API error: ${listResponse.statusText}`)
      }
      
      const listData = await listResponse.json()
      
      if (!listData.messages || listData.messages.length === 0) {
        return []
      }
      
      // Obtener detalles de cada mensaje
      const messages: GmailMessage[] = []
      
      for (const messageRef of listData.messages) {
        const message = await this.getMessage(messageRef.id)
        if (message) {
          messages.push(message)
        }
      }
      
      return messages
    } catch (error) {
      console.error('Error fetching Gmail messages:', error)
      throw error
    }
  }
  
  /**
   * Obtiene un mensaje específico por ID
   */
  async getMessage(messageId: string): Promise<GmailMessage | null> {
    try {
      const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error(`Gmail API error: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      // Parsear headers
      const headers = data.payload.headers
      const getHeader = (name: string) => 
        headers.find((h: { name: string; value: string }) => h.name.toLowerCase() === name.toLowerCase())?.value || ''
      
      // Extraer cuerpo del mensaje
      let body = ''
      if (data.payload.parts) {
        // Mensaje multipart
        for (const part of data.payload.parts) {
          if (part.mimeType === 'text/plain' && part.body?.data) {
            body += this.decodeBase64Url(part.body.data)
          } else if (part.mimeType === 'text/html' && !body && part.body?.data) {
            // Si no hay texto plano, usar HTML
            body += this.stripHtml(this.decodeBase64Url(part.body.data))
          }
        }
      } else if (data.payload.body?.data) {
        // Mensaje simple
        body = this.decodeBase64Url(data.payload.body.data)
      }
      
      // Extraer adjuntos
      const attachments: GmailMessage['attachments'] = []
      if (data.payload.parts) {
        for (const part of data.payload.parts) {
          if (part.filename && part.body?.attachmentId) {
            attachments.push({
              filename: part.filename,
              mimeType: part.mimeType,
              size: part.body.size || 0,
              attachmentId: part.body.attachmentId
            })
          }
        }
      }
      
      return {
        id: data.id,
        threadId: data.threadId,
        from: getHeader('From'),
        to: getHeader('To'),
        subject: getHeader('Subject'),
        body: body.trim(),
        date: new Date(parseInt(data.internalDate)),
        labels: data.labelIds || [],
        attachments
      }
    } catch (error) {
      console.error(`Error fetching message ${messageId}:`, error)
      return null
    }
  }
  
  /**
   * Marca un mensaje como leído
   */
  async markAsRead(messageId: string): Promise<boolean> {
    try {
      const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          removeLabelIds: ['UNREAD']
        })
      })
      
      return response.ok
    } catch (error) {
      console.error(`Error marking message ${messageId} as read:`, error)
      return false
    }
  }
  
  /**
   * Agrega una etiqueta a un mensaje
   */
  async addLabel(messageId: string, labelName: string): Promise<boolean> {
    try {
      // Primero obtener o crear la etiqueta
      const labelId = await this.getOrCreateLabel(labelName)
      if (!labelId) return false
      
      const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          addLabelIds: [labelId]
        })
      })
      
      return response.ok
    } catch (error) {
      console.error(`Error adding label to message ${messageId}:`, error)
      return false
    }
  }
  
  /**
   * Obtiene o crea una etiqueta
   */
  private async getOrCreateLabel(name: string): Promise<string | null> {
    try {
      // Listar etiquetas existentes
      const listUrl = 'https://gmail.googleapis.com/gmail/v1/users/me/labels'
      const listResponse = await fetch(listUrl, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      })
      
      if (!listResponse.ok) return null
      
      const listData = await listResponse.json()
      const existingLabel = listData.labels?.find((l: { id: string; name: string }) => l.name === name)
      
      if (existingLabel) {
        return existingLabel.id
      }
      
      // Crear nueva etiqueta
      const createUrl = 'https://gmail.googleapis.com/gmail/v1/users/me/labels'
      const createResponse = await fetch(createUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          labelListVisibility: 'labelShow',
          messageListVisibility: 'show'
        })
      })
      
      if (!createResponse.ok) return null
      
      const createData = await createResponse.json()
      return createData.id
    } catch (error) {
      console.error('Error getting/creating label:', error)
      return null
    }
  }
  
  /**
   * Decodifica contenido Base64 URL-safe
   */
  private decodeBase64Url(str: string): string {
    try {
      // Convertir Base64 URL-safe a Base64 estándar
      let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
      
      // Agregar padding si es necesario
      while (base64.length % 4) {
        base64 += '='
      }
      
      // Decodificar
      if (typeof window !== 'undefined') {
        return decodeURIComponent(escape(atob(base64)))
      } else {
        return Buffer.from(base64, 'base64').toString('utf-8')
      }
    } catch (error) {
      console.error('Error decoding base64:', error)
      return str
    }
  }
  
  /**
   * Elimina tags HTML de un string
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }
}

/**
 * Ejemplo de uso:
 * 
 * const client = new GmailClient({
 *   accessToken: 'ya29.xxx...',
 *   email: 'info@vendoya.es'
 * })
 * 
 * const messages = await client.getRecentMessages(10)
 * for (const message of messages) {
 *   console.log(message.subject, message.from)
 *   await client.markAsRead(message.id)
 *   await client.addLabel(message.id, 'CRM-Processed')
 * }
 */
