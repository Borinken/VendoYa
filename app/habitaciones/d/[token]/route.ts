import { NextResponse } from 'next/server'
import { rateLimited } from '@/lib/hab/server-portal'
import { downloadUrl } from '@/lib/hab/sign-server'

export const dynamic = 'force-dynamic'
// Descarga de solo lectura del contrato (enlace de 30 días, regenerable por el propietario).
export async function GET(_: Request, { params }: { params: { token: string } }) {
  if (await rateLimited('dl', params.token, 20)) return NextResponse.json({ error: 'Demasiadas descargas' }, { status: 429 })
  try { const u = await downloadUrl(params.token); return u ? NextResponse.redirect(u, 302) : NextResponse.json({ error: 'Enlace no válido o caducado' }, { status: 404 }) } catch { return NextResponse.json({ error: 'No disponible' }, { status: 503 }) }
}
