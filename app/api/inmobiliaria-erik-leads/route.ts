import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase credentials');
  return createClient(url, key);
}

const VALID_TIPOS = ['casa_pueblo', 'piso', 'chalet', 'finca', 'otra'];
const VALID_REFORMAS = ['si_bastante', 'un_poco', 'no_mucho', 'esta_bien'];

function checkAdmin(request: Request): boolean {
  const adminPass = process.env.LEADS_ADMIN_PASSWORD;
  if (!adminPass) return false;
  const auth = request.headers.get('authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  return token === adminPass;
}

// =========================
// POST: crear lead (público)
// =========================
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const nombre = String(body.nombre || '').trim().slice(0, 200);
    const telefono = String(body.telefono || '').trim().slice(0, 50);
    const ubicacion = String(body.ubicacion || '').trim().slice(0, 500);
    const tipo_vivienda = String(body.tipo_vivienda || '').trim();
    const necesita_reforma = String(body.necesita_reforma || '').trim();
    const comentarios = String(body.comentarios || '').trim().slice(0, 2000) || null;

    if (!nombre || !telefono || !ubicacion) {
      return NextResponse.json(
        { error: 'Nombre, teléfono y ubicación son obligatorios' },
        { status: 400 }
      );
    }

    if (!VALID_TIPOS.includes(tipo_vivienda)) {
      return NextResponse.json(
        { error: 'Tipo de vivienda inválido' },
        { status: 400 }
      );
    }

    if (!VALID_REFORMAS.includes(necesita_reforma)) {
      return NextResponse.json(
        { error: 'Estado de reforma inválido' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Capturar IP/UA para anti-spam básico
    const headers = request.headers;
    const ip =
      headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      headers.get('x-real-ip') ||
      null;
    const userAgent = headers.get('user-agent') || null;

    const { data, error } = await supabase
      .from('inmobiliaria_erik_leads')
      .insert({
        nombre,
        telefono,
        ubicacion,
        tipo_vivienda,
        necesita_reforma,
        comentarios,
        source: body.source || 'web',
        utm_source: body.utm_source || null,
        utm_medium: body.utm_medium || null,
        utm_campaign: body.utm_campaign || null,
        ip_address: ip,
        user_agent: userAgent,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Insert lead error:', error);
      return NextResponse.json(
        { error: 'Error al guardar el lead' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, leadId: data.id });
  } catch (err) {
    console.error('POST lead error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}

// =========================
// GET: listar leads (admin)
// =========================
export async function GET(request: Request) {
  if (!checkAdmin(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('inmobiliaria_erik_leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ leads: data || [] });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error' },
      { status: 500 }
    );
  }
}
