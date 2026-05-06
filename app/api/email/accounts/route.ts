import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

// GET: Listar cuentas de email
export async function GET() {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('email_accounts')
      .select('id, email, provider, active, last_check, last_error, auto_process, check_interval_minutes')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ accounts: data });
  } catch (error: unknown) {
    console.error('Error al obtener cuentas:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error al obtener cuentas';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// POST: Crear/actualizar cuenta manualmente
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    const { email, provider, credentials } = body;

    if (!email || !provider) {
      return NextResponse.json(
        { error: 'Email y provider son requeridos' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('email_accounts')
      .upsert({
        email,
        provider,
        credentials,
        active: true,
        last_check: new Date().toISOString()
      }, {
        onConflict: 'email'
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ account: data });
  } catch (error: unknown) {
    console.error('Error al crear cuenta:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error al crear cuenta';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
