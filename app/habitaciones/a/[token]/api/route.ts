import { NextResponse } from 'next/server'
import { anonClient, applicantInfo, rateLimited } from '@/lib/hab/server-portal'

export const dynamic = 'force-dynamic'
const json = (b: unknown, status = 200) => NextResponse.json(b, { status, headers: { 'Cache-Control': 'no-store' } })

export async function GET(_: Request, { params }: { params: { token: string } }) {
  try { const i = await applicantInfo(params.token); return i ? json(i) : json({ error: 'Enlace no válido o caducado' }, 404) } catch { return json({ error: 'Servicio no disponible' }, 503) }
}

// Guarda borrador o envía. La base solo admite las claves permitidas (lista blanca) y exige consentimiento al enviar.
export async function POST(req: Request, { params }: { params: { token: string } }) {
  if (await rateLimited('aapi', params.token, 30)) return json({ error: 'Demasiados envíos seguidos' }, 429)
  const b = await req.json().catch(() => null) as { name?: string; email?: string; phone?: string; answers?: unknown; consent?: boolean; submit?: boolean; withdraw?: boolean } | null
  if (!b) return json({ error: 'Datos no válidos' }, 400)
  const sb = anonClient()
  if (b.withdraw) { const { error } = await sb.rpc('hab_application_withdraw', { p_token: params.token }); return error ? json({ error: 'No se pudo retirar' }, 400) : json({ ok: true }) }
  const { error } = await sb.rpc('hab_application_save', { p_token: params.token, p_name: String(b.name ?? ''), p_email: String(b.email ?? ''), p_phone: String(b.phone ?? ''), p_answers: b.answers ?? {}, p_consent: b.consent === true, p_submit: b.submit === true })
  return error ? json({ error: error.message.slice(0, 160) }, 400) : json({ ok: true })
}
