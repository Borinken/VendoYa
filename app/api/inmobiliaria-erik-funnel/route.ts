import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase credentials');
  return createClient(url, key);
}

const VALID_STEPS = [
  'page_view',
  'welcome_view',
  'step_1_tipo',
  'step_2_zona',
  'step_3_urgencia',
  'step_4_contacto_view',
  'step_4_contacto_submit_attempt',
  'submit_success',
  'submit_error',
  'back_clicked',
  'page_unload',
];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const session_id = String(body.session_id || '').trim().slice(0, 100);
    const step = String(body.step || '').trim();

    if (!session_id || !VALID_STEPS.includes(step)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const headers = request.headers;
    const ip =
      headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      headers.get('x-real-ip') ||
      null;
    const userAgent = headers.get('user-agent') || null;

    const supabase = getSupabase();
    await supabase.from('inmobiliaria_erik_funnel').insert({
      session_id,
      step,
      source: body.source || null,
      utm_source: body.utm_source || null,
      utm_campaign: body.utm_campaign || null,
      ip_address: ip,
      user_agent: userAgent,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

function checkAdmin(request: Request): boolean {
  const adminPass = process.env.LEADS_ADMIN_PASSWORD;
  if (!adminPass) return false;
  const url = new URL(request.url);
  const queryKey = url.searchParams.get('key');
  if (queryKey === adminPass) return true;
  const auth = request.headers.get('authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  return token === adminPass;
}

// GET: agregado del embudo (admin)
export async function GET(request: Request) {
  if (!checkAdmin(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const supabase = getSupabase();

    // Ultimos 7 dias por defecto
    const url = new URL(request.url);
    const days = Math.min(
      Math.max(parseInt(url.searchParams.get('days') || '7', 10), 1),
      90
    );
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('inmobiliaria_erik_funnel')
      .select('session_id, step, created_at, source, utm_source, utm_campaign')
      .gte('created_at', since)
      .order('created_at', { ascending: true })
      .limit(50000);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    type Row = {
      session_id: string;
      step: string;
      created_at: string;
      source: string | null;
      utm_source: string | null;
      utm_campaign: string | null;
    };

    // Reducir a por-sesion: el paso mas avanzado alcanzado
    const STEP_ORDER: Record<string, number> = {
      page_view: 0,
      welcome_view: 1,
      step_1_tipo: 2,
      step_2_zona: 3,
      step_3_urgencia: 4,
      step_4_contacto_view: 5,
      step_4_contacto_submit_attempt: 6,
      submit_success: 7,
    };

    const reached: Record<string, number> = {};
    for (const r of (data || []) as Row[]) {
      const s = STEP_ORDER[r.step];
      if (s === undefined) continue;
      if (!reached[r.session_id] || s > reached[r.session_id]) {
        reached[r.session_id] = s;
      }
    }

    const stages = [
      { key: 'page_view', label: '1. Llega a la página' },
      { key: 'welcome_view', label: '2. Ve el welcome' },
      { key: 'step_1_tipo', label: '3. Click en Tipo' },
      { key: 'step_2_zona', label: '4. Click en Zona' },
      { key: 'step_3_urgencia', label: '5. Click en Urgencia' },
      { key: 'step_4_contacto_view', label: '6. Llega al form' },
      { key: 'step_4_contacto_submit_attempt', label: '7. Click en enviar' },
      { key: 'submit_success', label: '8. Lead enviado' },
    ];

    const totalSessions = Object.keys(reached).length;
    const funnel = stages.map((stage, idx) => {
      const count = Object.values(reached).filter((v) => v >= idx).length;
      return {
        step: stage.key,
        label: stage.label,
        count,
        pct: totalSessions ? Math.round((count / totalSessions) * 100) : 0,
      };
    });

    return NextResponse.json({
      days,
      total_sessions: totalSessions,
      funnel,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error' },
      { status: 500 }
    );
  }
}
