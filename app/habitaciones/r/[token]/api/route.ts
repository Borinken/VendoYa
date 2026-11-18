import { NextResponse } from 'next/server'
import { anonClient, rateLimited } from '@/lib/hab/server-portal'
import { referenceAnswerInput } from '@/lib/hab/types'

export const dynamic = 'force-dynamic'
const json = (b: unknown, status = 200) => NextResponse.json(b, { status, headers: { 'Cache-Control': 'no-store' } })

export async function GET(_: Request, { params }: { params: { token: string } }) {
  if (!/^[0-9a-f]{64}$/.test(params.token)) return json({ error: 'Enlace no válido' }, 404)
  const { data, error } = await anonClient().rpc('hab_reference_info', { p_token: params.token })
  return error || !data ? json({ error: 'Enlace no válido' }, 404) : json(data)
}

export async function POST(req: Request, { params }: { params: { token: string } }) {
  if (await rateLimited('ref', params.token, 8)) return json({ error: 'Demasiados envíos seguidos' }, 429)
  const v = referenceAnswerInput.safeParse(await req.json().catch(() => null))
  if (!v.success) return json({ error: v.error.issues[0]?.message ?? 'Datos no válidos' }, 400)
  const { error } = await anonClient().rpc('hab_reference_answer', { p_token: params.token, p_response: v.data })
  return error ? json({ error: 'No se pudo guardar (¿ya respondiste?)' }, 400) : json({ ok: true })
}
