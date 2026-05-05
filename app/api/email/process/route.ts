import { NextRequest, NextResponse } from 'next/server'
import { parseEmailWithAI, createEmailSummary, EmailData } from '@/lib/email-parser'
import { supabase } from '@/lib/supabase'

export const runtime = 'edge'

/**
 * POST /api/email/process
 * Procesa un email y crea automáticamente contactos, leads y tareas
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validar datos del email
    if (!body.from || !body.subject || !body.body) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos requeridos: from, subject, body' },
        { status: 400 }
      )
    }
    
    const emailData: EmailData = {
      from: body.from,
      to: body.to || '',
      subject: body.subject,
      body: body.body,
      date: body.date ? new Date(body.date) : new Date(),
      attachments: body.attachments || []
    }
    
    // Parsear email con IA
    const parsed = await parseEmailWithAI(emailData)
    
    // 1. Crear o actualizar contacto
    let contactId: string | null = null
    if (parsed.contact.email) {
      const { data: existingContact } = await supabase
        .from('contacts')
        .select('id')
        .eq('email', parsed.contact.email)
        .single()
      
      if (existingContact) {
        // Actualizar contacto existente
        contactId = existingContact.id
        
        await supabase
          .from('contacts')
          .update({
            first_name: parsed.contact.name?.split(' ')[0] || '',
            last_name: parsed.contact.name?.split(' ').slice(1).join(' ') || '',
            phone: parsed.contact.phone || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', contactId)
      } else {
        // Crear nuevo contacto
        const { data: newContact, error: contactError } = await supabase
          .from('contacts')
          .insert({
            first_name: parsed.contact.name?.split(' ')[0] || 'Sin nombre',
            last_name: parsed.contact.name?.split(' ').slice(1).join(' ') || '',
            email: parsed.contact.email,
            phone: parsed.contact.phone || null,
            lead_status: parsed.type === 'lead_buyer' ? 'warm' : 'cold',
            source: parsed.source === 'unknown' ? 'email' : parsed.source,
            notes: `Email recibido: ${parsed.intent}\n\nMensaje:\n${parsed.message}`
          })
          .select()
          .single()
        
        if (contactError) {
          console.error('Error creating contact:', contactError)
        } else {
          contactId = newContact.id
        }
      }
    }
    
    // 2. Si hay información de propiedad, verificar si existe o crear placeholder
    let propertyId: string | null = null
    if (parsed.property && (parsed.property.reference || parsed.property.address)) {
      // Buscar propiedad existente por referencia
      if (parsed.property.reference) {
        const { data: existingProp } = await supabase
          .from('properties')
          .select('id')
          .ilike('title', `%${parsed.property.reference}%`)
          .single()
        
        if (existingProp) {
          propertyId = existingProp.id
        }
      }
      
      // Si no existe y tenemos suficiente info, crear placeholder
      if (!propertyId && parsed.property.address) {
        const { data: newProp, error: propError } = await supabase
          .from('properties')
          .insert({
            title: parsed.property.address,
            address: parsed.property.address,
            city: parsed.property.city || 'Madrid',
            property_type: parsed.property.type || 'piso',
            price: parsed.property.price || 0,
            status: 'pending', // Pendiente de verificación
            operation_type: parsed.property.operation || 'venta',
            description: `Propiedad mencionada en email: ${parsed.message.substring(0, 200)}...`,
            bedrooms: 0,
            bathrooms: 0,
            surface: 0
          })
          .select()
          .single()
        
        if (!propError && newProp) {
          propertyId = newProp.id
        }
      }
    }
    
    // 3. Registrar el email en la base de datos
    const { data: emailRecord, error: emailError } = await supabase
      .from('email_logs')
      .insert({
        from_email: parsed.contact.email || emailData.from,
        to_email: emailData.to,
        subject: emailData.subject,
        body: emailData.body,
        source: parsed.source,
        type: parsed.type,
        priority: parsed.priority,
        contact_id: contactId,
        property_id: propertyId,
        parsed_data: parsed,
        processed: true,
        processed_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (emailError) {
      console.error('Error logging email:', emailError)
    }
    
    // 4. Crear tareas de seguimiento
    const tasks: { id: string; title: string }[] = []
    for (const taskDescription of parsed.suggestedTasks) {
      const { data: task } = await supabase
        .from('tasks')
        .insert({
          title: taskDescription,
          description: `Generada automáticamente desde email:\n${emailData.subject}\n\nContacto: ${parsed.contact.name || 'Sin nombre'}`,
          status: 'pending',
          priority: parsed.priority,
          due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 horas
          contact_id: contactId,
          property_id: propertyId,
          created_from: 'email'
        })
        .select()
        .single()
      
      if (task) {
        tasks.push(task)
      }
    }
    
    // 5. Generar resumen
    const summary = createEmailSummary(parsed)
    
    return NextResponse.json({
      success: true,
      message: 'Email procesado correctamente',
      data: {
        parsed,
        summary,
        contactId,
        propertyId,
        emailRecordId: emailRecord?.id,
        tasksCreated: tasks.length,
        tasks
      }
    })
    
  } catch (error: unknown) {
    console.error('Error processing email:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}

/**
 * GET /api/email/process
 * Documentación del endpoint
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/email/process',
    method: 'POST',
    description: 'Procesa emails automáticamente y crea contactos, leads y tareas en el CRM',
    requiredFields: {
      from: 'string - Email del remitente',
      subject: 'string - Asunto del email',
      body: 'string - Cuerpo del email'
    },
    optionalFields: {
      to: 'string - Email del destinatario',
      date: 'string - Fecha del email (ISO 8601)',
      attachments: 'string[] - URLs de adjuntos'
    },
    features: [
      'Reconoce emails de Idealista, Fotocasa, RealAdvisor, Habitaclia',
      'Extrae nombre, teléfono, email automáticamente',
      'Detecta tipo de consulta (comprador/vendedor/consulta)',
      'Identifica propiedades mencionadas',
      'Crea/actualiza contactos automáticamente',
      'Genera tareas de seguimiento',
      'Prioriza emails automáticamente',
      'Usa IA (Groq) para extracción inteligente'
    ],
    example: {
      request: {
        from: 'Juan Pérez <juan.perez@gmail.com>',
        to: 'info@vendoya.es',
        subject: 'Interesado en piso Salamanca',
        body: 'Hola, me interesa visitar el piso en Calle Velázquez 45. Mi teléfono es 612345678. Gracias.'
      },
      response: {
        success: true,
        data: {
          parsed: {
            source: 'buyer',
            type: 'property_inquiry',
            contact: {
              name: 'Juan Pérez',
              email: 'juan.perez@gmail.com',
              phone: '612345678'
            },
            property: {
              address: 'Calle Velázquez 45',
              city: 'Madrid'
            },
            priority: 'high',
            requiresFollowup: true
          },
          contactId: 'uuid',
          tasksCreated: 2
        }
      }
    }
  })
}
