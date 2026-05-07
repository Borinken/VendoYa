import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials');
  }

  return createClient(supabaseUrl, supabaseKey);
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseClient();
    const { id: leadId } = params;
    const body = await request.json();

    const { type, content, direction, metadata } = body;

    if (!type) {
      return NextResponse.json(
        { error: 'El campo type es requerido' },
        { status: 400 }
      );
    }

    // Crear interacción
    const { data: interaction, error } = await supabase
      .from('lead_interactions')
      .insert({
        lead_id: leadId,
        type,
        content,
        direction: direction || 'outbound',
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating interaction:', error);
      return NextResponse.json(
        { error: 'Error al crear interacción' },
        { status: 500 }
      );
    }

    // Actualizar estado del lead si es necesario
    if (type === 'call' || type === 'meeting') {
      await supabase
        .from('urgent_leads')
        .update({ status: 'contactado' })
        .eq('id', leadId)
        .eq('status', 'nuevo'); // Solo si aún está en "nuevo"
    }

    return NextResponse.json(interaction);
  } catch (error: unknown) {
    console.error('Error creating interaction:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseClient();
    const { id: leadId } = params;

    const { data: interactions, error } = await supabase
      .from('lead_interactions')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Error obteniendo interacciones' },
        { status: 500 }
      );
    }

    return NextResponse.json(interactions);
  } catch (error: unknown) {
    console.error('Error fetching interactions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}
