import { NextResponse } from 'next/server'
import { anonClient, rateLimited } from '@/lib/hab/server-portal'
import { recordSignature, sendCode, signInfo } from '@/lib/hab/sign-server'
import { signInput } from '@/lib/hab/types'

export const dynamic = 'force-dynamic'
const json = (b: unknown, status = 200) => NextResponse.json(b, { status, headers: { 'Cache-Control': 'no-store' } })

export async function GET(_: Request, { params }: { params: { token: string } }) {
  if (await rateLimited('fget', params.token, 30)) return json({ error: 'Demasiadas visitas seguidas' }, 429)
  try { const i = await signInfo(params.token); return i ? json(i) : json({ error: 'Enlace no válido, usado o caducado' }, 404) } catch { return json({ error: 'Servicio no disponible' }, 503) }
}

// POST { action: 'code' } envía el código; POST { name, consent, signature, code? } firma. Límite: 6 intentos por enlace y hora.
export async function POST(req: Request, { params }: { params: { token: string } }) {
  void anonClient // (el límite usa la base de datos vía server-portal)
  if (await rateLimited('fpost', params.token, 6, 3600)) return json({ error: 'Demasiados intentos con este enlace' }, 429)
  const b = await req.json().catch(() => null)
  if (b?.action === 'code') { const r = await sendCode(params.token); return r.ok ? json({ ok: true }) : json({ error: r.error }, 400) }
  const v = signInput.safeParse(b); if (!v.success) return json({ error: v.error.issues[0]?.message ?? 'Datos no válidos' }, 400)
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || req.headers.get('x-real-ip') || ''
  try { return json(await recordSignature(params.token, v.data, ip, req.headers.get('user-agent') ?? '')) } catch (e) { return json({ error: e instanceof Error ? e.message : 'No se pudo firmar' }, 400) }
}
