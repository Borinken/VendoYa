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
  'cta_welcome_click',
  'step_1_view',
  'step_1_tipo',
  'step_2_view',
  'step_2_zona',
  'step_3_view',
  'step_3_urgencia', // legacy
  'step_3_details_complete',
  'step_4_price_view',
  'step_4_price_continue',
  'step_4_contacto_view', // legacy
  'step_4_contacto_submit_attempt', // legacy
  'step_5_contacto_view',
  'step_5_contacto_submit_attempt',
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
    // Soportamos eventos legacy (anterior funnel) y los nuevos
    const STEP_ORDER: Record<string, number> = {
      page_view: 0,
      welcome_view: 1,
      cta_welcome_click: 2,
      step_1_view: 2,
      step_1_tipo: 3,
      step_2_view: 3,
      step_2_zona: 4,
      step_3_view: 4,
      step_3_urgencia: 5, // legacy
      step_3_details_complete: 5,
      step_4_price_view: 6,
      step_4_price_continue: 6,
      step_4_contacto_view: 7, // legacy
      step_4_contacto_submit_attempt: 7, // legacy
      step_5_contacto_view: 7,
      step_5_contacto_submit_attempt: 7,
      submit_success: 8,
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
      { key: 'cta_welcome_click', label: '3. Click "Calcular precio"' },
      { key: 'step_1_tipo', label: '4. Elige tipo' },
      { key: 'step_2_zona', label: '5. Elige zona' },
      { key: 'step_3_details_complete', label: '6. Completa detalles' },
      { key: 'step_4_price_continue', label: '7. Ve precio y avanza' },
      { key: 'step_5_contacto_submit_attempt', label: '8. Click en enviar' },
      { key: 'submit_success', label: '9. Lead enviado' },
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
