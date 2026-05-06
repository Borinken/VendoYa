import { NextRequest, NextResponse } from 'next/server'
import { GmailClient } from '@/lib/gmail-client'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * POST /api/email/sync
 * Sincroniza emails de Gmail y los procesa automáticamente
 * Ahora carga automáticamente las credenciales de la cuenta del usuario
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json()
    
    // Opción 1: Sincronizar cuenta específica por ID
    if (body.accountId) {
      const { data: account, error } = await supabase
        .from('email_accounts')
        .select('*')
        .eq('id', body.accountId)
        .eq('active', true)
        .single();

      if (error || !account) {
        return NextResponse.json(
          { success: false, error: 'Cuenta no encontrada o inactiva' },
          { status: 404 }
        );
      }

      const result = await syncAccount(account, body.maxResults || 10, request);
      return NextResponse.json(result);
    }

    // Opción 2: Sincronizar todas las cuentas activas
    const { data: accounts, error } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('active', true);

    if (error) throw error;

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No hay cuentas de email configuradas. Configura tu Gmail primero.',
        redirect: '/dashboard/email-config'
      }, { status: 404 });
    }

    // Sincronizar todas las cuentas
    const results = await Promise.all(
      accounts.map(account => syncAccount(account, body.maxResults || 10, request))
    );

    const totalProcessed = results.reduce((sum, r) => sum + (r.processed || 0), 0);
    const totalErrors = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      totalAccounts: accounts.length,
      totalProcessed,
      totalErrors,
      results
    });

  } catch (error: unknown) {
    console.error('Error en sincronización:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error en sincronización';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

interface EmailAccount {
  id: string;
  email: string;
  credentials: { access_token?: string };
}

async function syncAccount(account: EmailAccount, maxResults: number, request: NextRequest) {
  const email = account.email;
  const supabase = getSupabaseClient();
  
  try {
    const credentials = account.credentials;
    const accessToken = credentials?.access_token;

    if (!accessToken) {
      return {
        success: false,
        email,
        error: 'No se encontró access token'
      };
    }

    const query = 'is:unread'
    
    // Crear cliente de Gmail
    const gmailClient = new GmailClient({
      accessToken,
      email
    })
    
    // Obtener mensajes recientes
    const messages = await gmailClient.getRecentMessages(maxResults, query)
    
    if (messages.length === 0) {
      // Actualizar last_check
      await supabase
        .from('email_accounts')
        .update({ last_check: new Date().toISOString() })
        .eq('id', account.id);

      return {
        success: true,
        email,
        message: 'No hay emails nuevos',
        processed: 0
      };
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

    // Actualizar last_check y last_error
    await supabase
      .from('email_accounts')
      .update({ 
        last_check: new Date().toISOString(),
        last_error: errors.length > 0 ? `${errors.length} errores` : null
      })
      .eq('id', account.id);
    
    return {
      success: true,
      email,
      message: `Procesados ${processed.length} de ${messages.length} emails`,
      processed: processed.length,
      errors: errors.length,
      details: {
        processed,
        errors
      }
    };
    
  } catch (error: unknown) {
    console.error('Error syncing account:', email, error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

    // Guardar error en la cuenta
    await supabase
      .from('email_accounts')
      .update({ 
        last_check: new Date().toISOString(),
        last_error: errorMessage
      })
      .eq('id', account.id);

    return {
      success: false,
      email,
      error: errorMessage
    };
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
