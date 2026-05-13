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

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const propertyId = formData.get('propertyId') as string;
    const index = formData.get('index') as string;

    if (!file || !propertyId) {
      return NextResponse.json(
        { error: 'Archivo y propertyId requeridos' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Crear nombre único para el archivo
    const fileExt = file.name.split('.').pop();
    const fileName = `${propertyId}/photos/${Date.now()}-${index}.${fileExt}`;

    // Subir archivo a Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('property-3d-photos')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return NextResponse.json(
        { error: 'Error al subir archivo' },
        { status: 500 }
      );
    }

    // Obtener URL pública
    const { data: urlData } = supabase.storage
      .from('property-3d-photos')
      .getPublicUrl(fileName);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      fileName: fileName,
      index: parseInt(index),
    });

  } catch (error) {
    console.error('Error in upload:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}
