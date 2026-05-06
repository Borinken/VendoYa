import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('email_accounts')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Cuenta eliminada' });
  } catch (error: unknown) {
    console.error('Error al eliminar cuenta:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error al eliminar cuenta';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// GET: Obtener cuenta específica
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    return NextResponse.json({ account: data });
  } catch (error: unknown) {
    console.error('Error al obtener cuenta:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error al obtener cuenta';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
