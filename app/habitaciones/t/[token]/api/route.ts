import { NextResponse } from 'next/server'
import { portalInfo, rateLimited, anonClient } from '@/lib/hab/server-portal'
import { portalSubmitInput } from '@/lib/hab/types'

export const dynamic = 'force-dynamic'
const bad = (msg: string, status: number) => NextResponse.json({ error: msg }, { status, headers: { 'Cache-Control': 'no-store' } })

export async function GET(_: Request, { params }: { params: { token: string } }) {
  try {
    const info = await portalInfo(params.token)
    return info ? NextResponse.json(info, { headers: { 'Cache-Control': 'no-store' } }) : bad('Enlace no válido o caducado', 404)
  } catch { return bad('Servicio no disponible', 503) }
}

export async function POST(req: Request, { params }: { params: { token: string } }) {
  if (await rateLimited('tapi', params.token)) return bad('Demasiados envíos seguidos; inténtalo en unos minutos', 429)
  const body = portalSubmitInput.safeParse(await req.json().catch(() => null))
  if (!body.success) return bad(body.error.issues[0]?.message ?? 'Datos no válidos', 400)
  const { data, error } = await anonClient().rpc('hab_tenant_link_submit', { p_token: params.token, p_category: body.data.category, p_description: body.data.description, p_photos: body.data.photo_paths })
  if (error) return bad(error.message.includes('Demasiados') ? error.message : 'No se pudo enviar el aviso', error.message.includes('Demasiados') ? 429 : 400)
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
}
