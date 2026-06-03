import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function checkAdmin(request: Request): boolean {
  const adminPass = process.env.LEADS_ADMIN_PASSWORD;
  if (!adminPass) return false;
  // Permitir password por header o ?key= para descarga directa desde navegador
  const auth = request.headers.get('authorization') || '';
  const headerToken = auth.replace(/^Bearer\s+/i, '').trim();
  const url = new URL(request.url);
  const queryToken = url.searchParams.get('key') || '';
  return headerToken === adminPass || queryToken === adminPass;
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

const TIPO_LABEL: Record<string, string> = {
  casa_pueblo: 'Casa de Pueblo',
  piso: 'Piso',
  chalet: 'Chalet',
  finca: 'Finca / Cortijo',
  otra: 'Otra',
};

const REFORMA_LABEL: Record<string, string> = {
  si_bastante: 'Sí, bastante',
  un_poco: 'Un poco',
  no_mucho: 'No mucho',
  esta_bien: 'Está bien',
};

export async function GET(request: Request) {
  if (!checkAdmin(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { error: 'Missing Supabase credentials' },
      { status: 500 }
    );
  }

  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from('inmobiliaria_erik_leads')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const headers = [
    'Fecha',
    'Nombre',
    'Teléfono',
    'Ubicación',
    'Tipo de vivienda',
    'Necesita reforma',
    'Comentarios',
    'Estado',
    'Origen',
    'UTM Source',
    'UTM Campaign',
  ];

  const rows = (data || []).map((r) => [
    new Date(r.created_at).toLocaleString('es-ES'),
    r.nombre,
    r.telefono,
    r.ubicacion,
    TIPO_LABEL[r.tipo_vivienda] || r.tipo_vivienda,
    REFORMA_LABEL[r.necesita_reforma] || r.necesita_reforma,
    r.comentarios || '',
    r.estado,
    r.source || '',
    r.utm_source || '',
    r.utm_campaign || '',
  ]);

  // BOM para que Excel detecte UTF-8 correctamente
  const csv =
    '\uFEFF' +
    [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\r\n');

  const filename = `leads-inmobiliaria-erik-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
