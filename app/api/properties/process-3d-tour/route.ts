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

    // 3. PROCESAMIENTO REAL CON POLYCAM API (FREE TIER: 10 scans/mes)
    console.log(`🚀 Iniciando procesamiento con Polycam para tour ${tour.id}`);
    
    const polycamApiKey = process.env.POLYCAM_API_KEY;
    
    if (!polycamApiKey) {
      // Si no hay API key, usar modo placeholder
      console.warn('⚠️  POLYCAM_API_KEY no configurada. Usando modo placeholder.');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const placeholderSplatUrl = `/api/properties/${propertyId}/3d-tour/placeholder.splat`;
      const previewUrl = photos[0].url;
      
      await supabase
        .from('property_3d_tours')
        .update({
          processing_status: 'completed',
          processing_completed_at: new Date().toISOString(),
          splat_file_url: placeholderSplatUrl,
          preview_image_url: previewUrl,
          quality_score: 0.85,
          file_size_mb: 15.5,
        })
        .eq('id', tour.id);

      return NextResponse.json({
        success: true,
        tourId: tour.id,
        splatUrl: placeholderSplatUrl,
        message: '✅ Tour 3D creado (modo placeholder)',
        warning: '⚠️  Configura POLYCAM_API_KEY para procesamiento real. Ver POLYCAM_SETUP.md',
      });
    }

    try {
      // Crear un nuevo proyecto en Polycam
      const createProjectResponse = await fetch('https://api.polycam.ai/v1/captures', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${polycamApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `Tour 3D - Property ${propertyId}`,
          type: 'photogrammetry',
          public: false,
        }),
      });

      if (!createProjectResponse.ok) {
        throw new Error(`Polycam API error: ${createProjectResponse.status}`);
      }

      const projectData = await createProjectResponse.json();
      const captureId = projectData.id;

      console.log(`✅ Proyecto Polycam creado: ${captureId}`);

      // Subir fotos a Polycam
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        console.log(`📤 Subiendo foto ${i + 1}/${photos.length} a Polycam...`);

        // Descargar la foto de Supabase
        const photoResponse = await fetch(photo.url);
        const photoBlob = await photoResponse.blob();

        // Subir a Polycam
        const formData = new FormData();
        formData.append('file', photoBlob, photo.fileName);
        formData.append('index', i.toString());

        await fetch(`https://api.polycam.ai/v1/captures/${captureId}/images`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${polycamApiKey}`,
          },
          body: formData,
        });
      }

      console.log(`✅ ${photos.length} fotos subidas a Polycam`);

      // Iniciar procesamiento en Polycam
      const processResponse = await fetch(`https://api.polycam.ai/v1/captures/${captureId}/process`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${polycamApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quality: 'high',
          output_format: 'gaussian_splat',
        }),
      });

      if (!processResponse.ok) {
        throw new Error(`Error iniciando procesamiento: ${processResponse.status}`);
      }

      console.log(`🔄 Procesamiento iniciado en Polycam para ${captureId}`);

      // Polycam procesará en background. Guardar el ID para consultar después
      const { error: updateError } = await supabase
        .from('property_3d_tours')
        .update({
          processing_status: 'processing',
          splat_file_url: null, // Se actualizará cuando Polycam termine
          preview_image_url: photos[0].url,
          polycam_capture_id: captureId, // Guardar para webhook o polling
        })
        .eq('id', tour.id);

      if (updateError) {
        throw new Error('Error al actualizar tour: ' + updateError.message);
      }

      return NextResponse.json({
        success: true,
        tourId: tour.id,
        captureId: captureId,
        status: 'processing',
        message: '✅ Tour 3D enviado a Polycam para procesamiento',
        note: '⏱️  El procesamiento toma 10-30 minutos. Polycam enviará notificación al completar.',
        estimatedTime: '10-30 minutos',
      });

    } catch (polycamError) {
      console.error('❌ Error con Polycam API:', polycamError);
      
      // Marcar como fallido
      await supabase
        .from('property_3d_tours')
        .update({
          processing_status: 'failed',
          error_message: polycamError instanceof Error ? polycamError.message : 'Error desconocido',
        })
        .eq('id', tour.id);

      throw polycamError;
    }

  } catch (error) {
    console.error('Error processing 3D tour:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}
