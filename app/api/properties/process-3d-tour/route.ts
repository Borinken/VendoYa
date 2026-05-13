import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutos para procesamiento

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials');
  }

  return createClient(supabaseUrl, supabaseKey);
}

interface UploadedPhoto {
  url: string;
  fileName: string;
  index: number;
}

export async function POST(request: Request) {
  try {
    const { propertyId, photos } = await request.json() as {
      propertyId: string;
      photos: UploadedPhoto[];
    };

    if (!propertyId || !photos || photos.length < 20) {
      return NextResponse.json(
        { error: 'Se requiere propertyId y al menos 20 fotos' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // 1. Crear registro del tour en estado "processing"
    const { data: tour, error: tourError } = await supabase
      .from('property_3d_tours')
      .insert({
        property_id: propertyId,
        photo_count: photos.length,
        processing_status: 'processing',
        processing_started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (tourError || !tour) {
      throw new Error('Error al crear tour: ' + tourError?.message);
    }

    // 2. Guardar referencias de las fotos
    const photoInserts = photos.map(photo => ({
      tour_id: tour.id,
      photo_url: photo.url,
      photo_index: photo.index,
    }));

    const { error: photosError } = await supabase
      .from('property_3d_photos')
      .insert(photoInserts);

    if (photosError) {
      throw new Error('Error al guardar fotos: ' + photosError.message);
    }

    // 3. AQUÍ VA EL PROCESAMIENTO REAL
    // Por ahora simulamos el procesamiento y usamos un placeholder
    // En producción, aquí llamarías a:
    // - Luma AI API
    // - Polycam API
    // - Un servidor Python con COLMAP + Gaussian Splatting
    // - Un worker en background con Bull/BullMQ

    // Simulación de procesamiento (reemplazar con procesamiento real)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // URL placeholder - en producción sería el archivo .splat real
    const placeholderSplatUrl = `/api/properties/${propertyId}/3d-tour/placeholder.splat`;
    
    // Generar imagen de preview (primera foto)
    const previewUrl = photos[0].url;

    // 4. Actualizar tour a completado
    const { error: updateError } = await supabase
      .from('property_3d_tours')
      .update({
        processing_status: 'completed',
        processing_completed_at: new Date().toISOString(),
        splat_file_url: placeholderSplatUrl,
        preview_image_url: previewUrl,
        quality_score: 0.85, // Placeholder
        file_size_mb: 15.5, // Placeholder
      })
      .eq('id', tour.id);

    if (updateError) {
      throw new Error('Error al actualizar tour: ' + updateError.message);
    }

    return NextResponse.json({
      success: true,
      tourId: tour.id,
      splatUrl: placeholderSplatUrl,
      message: '✅ Tour 3D creado exitosamente',
      note: '⚠️  NOTA: Actualmente usando placeholder. Integrar servicio de procesamiento real (Luma AI, Polycam, COLMAP)',
    });

  } catch (error) {
    console.error('Error processing 3D tour:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}
