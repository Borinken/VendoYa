import { NextRequest, NextResponse } from 'next/server'
import { GmailClient } from '@/lib/gmail-client'

export const runtime = 'edge'

/**
 * POST /api/email/sync
 * Sincroniza emails de Gmail y los procesa automáticamente
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (!body.accessToken || !body.email) {
      return NextResponse.json(
        { success: false, error: 'Faltan accessToken y email' },
        { status: 400 }
      )
    }
    
    const maxResults = body.maxResults || 10
    const query = body.query || 'is:unread'
    
    // Crear cliente de Gmail
    const gmailClient = new GmailClient({
      accessToken: body.accessToken,
      email: body.email
    })
    
    // Obtener mensajes recientes
    const messages = await gmailClient.getRecentMessages(maxResults, query)
    
    if (messages.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay emails nuevos',
        processed: 0
      })
    }
    
    // Procesar cada mensaje
    const processed = []
    const errors = []
    
    for (const message of messages) {
      try {
        // Procesar email con la API existente
        const processResponse = await fetch(`${request.nextUrl.origin}/api/email/process`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: message.from,
            to: message.to,
            subject: message.subject,
            body: message.body,
            date: message.date.toISOString(),
            attachments: message.attachments.map(a => a.filename)
          })
        })
        
        const processResult = await processResponse.json()
        
        if (processResult.success) {
          // Marcar como leído y agregar etiqueta
          await gmailClient.markAsRead(message.id)
          await gmailClient.addLabel(message.id, 'CRM-Processed')
          
          processed.push({
            messageId: message.id,
            subject: message.subject,
            contactId: processResult.data?.contactId,
            tasksCreated: processResult.data?.tasksCreated
          })
        } else {
          errors.push({
            messageId: message.id,
            subject: message.subject,
            error: processResult.error
          })
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
        errors.push({
          messageId: message.id,
          subject: message.subject,
          error: errorMessage
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Procesados ${processed.length} de ${messages.length} emails`,
      data: {
        total: messages.length,
        processed: processed.length,
        errors: errors.length,
        details: {
          processed,
          errors
        }
      }
    })
    
  } catch (error: unknown) {
    console.error('Error syncing emails:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}

/**
 * GET /api/email/sync
 * Documentación del endpoint
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/email/sync',
    method: 'POST',
    description: 'Sincroniza emails de Gmail automáticamente y los procesa',
    requiredFields: {
      accessToken: 'string - Token de acceso de Gmail OAuth',
      email: 'string - Dirección de email a sincronizar'
    },
    optionalFields: {
      maxResults: 'number - Máximo de emails a procesar (default: 10)',
      query: 'string - Query de Gmail para filtrar emails (default: is:unread)'
    },
    setup: {
      step1: 'Obtener credenciales OAuth de Google Cloud Console',
      step2: 'Configurar OAuth consent screen',
      step3: 'Agregar scopes: https://www.googleapis.com/auth/gmail.readonly, https://www.googleapis.com/auth/gmail.modify',
      step4: 'Obtener access token usando OAuth 2.0',
      step5: 'Llamar a este endpoint con el access token'
    },
    features: [
      'Lee emails no leídos automáticamente',
      'Procesa cada email con IA',
      'Crea contactos y tareas',
      'Marca emails como leídos',
      'Agrega etiqueta CRM-Processed',
      'Maneja errores individualmente'
    ],
    automation: {
      description: 'Puedes configurar un cron job que llame a este endpoint cada 15 minutos',
      example: 'curl -X POST https://tu-dominio.com/api/email/sync -H "Content-Type: application/json" -d \'{"accessToken":"ya29.xxx","email":"info@vendoya.es"}\''
    }
  })
}
