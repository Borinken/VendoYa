import { NextResponse } from 'next/server'
import { rateLimited } from '@/lib/hab/server-portal'
import { signPdfUrl } from '@/lib/hab/sign-server'

export const dynamic = 'force-dynamic'
// Muestra el contrato a quien va a firmar: valida el token y redirige a una URL firmada de 2 minutos.
export async function GET(_: Request, { params }: { params: { token: string } }) {
  if (await rateLimited('fpdf', params.token, 30)) return NextResponse.json({ error: 'Demasiadas visitas' }, { status: 429 })
  try { const u = await signPdfUrl(params.token); return u ? NextResponse.redirect(u, 302) : NextResponse.json({ error: 'No disponible' }, { status: 404 }) } catch { return NextResponse.json({ error: 'No disponible' }, { status: 503 }) }
}
