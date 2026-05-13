import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials');
  }

  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Webhook de Polycam para recibir notificaciones cuando un tour 3D termina de procesarse
 * Configura este endpoint en: https://poly.cam/dashboard/webhooks
 */
export async function POST(request: Request) {
  try {
    const webhookSecret = process.env.POLYCAM_WEBHOOK_SECRET;
    
    // Verificar firma del webhook (opcional pero recomendado)
    if (webhookSecret) {
      const signature = request.headers.get('polycam-signature');
      // TODO: Verificar firma si Polycam la provee
    }

    const body = await request.json();
    const { event, data } = body;

    console.log('📥 Webhook recibido de Polycam:', event);

    // Procesar según el tipo de evento
    switch (event) {
      case 'capture.completed':
        await handleCaptureCompleted(data);
        break;
      
      case 'capture.failed':
        await handleCaptureFailed(data);
        break;
      
      default:
        console.log('⚠️  Evento no manejado:', event);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('❌ Error procesando webhook de Polycam:', error);
    return NextResponse.json(
      { error: 'Error procesando webhook' },
      { status: 500 }
    );
  }
}

async function handleCaptureCompleted(data: any) {
  const { capture_id, splat_url, preview_url, file_size_mb, quality_score } = data;

  console.log(`✅ Capture completado en Polycam: ${capture_id}`);

  const supabase = getSupabaseClient();

  // Buscar el tour por polycam_capture_id
  const { data: tours, error: findError } = await supabase
    .from('property_3d_tours')
    .select('*')
    .eq('polycam_capture_id', capture_id)
    .single();

  if (findError || !tours) {
    console.error('❌ No se encontró tour con capture_id:', capture_id);
    return;
  }

  // Actualizar el tour con los datos finales
  const { error: updateError } = await supabase
    .from('property_3d_tours')
    .update({
      processing_status: 'completed',
      processing_completed_at: new Date().toISOString(),
      splat_file_url: splat_url,
      preview_image_url: preview_url || tours.preview_image_url,
      file_size_mb: file_size_mb || null,
      quality_score: quality_score || null,
    })
    .eq('id', tours.id);

  if (updateError) {
    console.error('❌ Error actualizando tour:', updateError);
    return;
  }

  console.log(`✅ Tour ${tours.id} actualizado con éxito`);

  // TODO: Opcional - Enviar notificación al usuario
  // - Email
  // - Push notification
  // - WhatsApp
}

async function handleCaptureFailed(data: any) {
  const { capture_id, error_message } = data;

  console.log(`❌ Capture falló en Polycam: ${capture_id}`);

  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('property_3d_tours')
    .update({
      processing_status: 'failed',
      error_message: error_message || 'Error desconocido en Polycam',
    })
    .eq('polycam_capture_id', capture_id);

  if (error) {
    console.error('❌ Error actualizando tour fallido:', error);
  }
}
