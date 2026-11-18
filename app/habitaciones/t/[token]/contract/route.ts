import { NextResponse } from 'next/server'
import { portalInfo, rateLimited } from '@/lib/hab/server-portal'
import { serviceClient } from '@/lib/hab/server-admin'

export const dynamic = 'force-dynamic'

// Descarga del contrato (solo lectura) con el enlace personal del inquilino: valida el token, y solo entonces
// genera una URL firmada de 60 s con service_role (solo servidor). Caduca y se revoca con el enlace.
export async function GET(_: Request, { params }: { params: { token: string } }) {
  if (await rateLimited('tdl', params.token, 20)) return NextResponse.json({ error: 'Demasiadas descargas seguidas' }, { status: 429 })
  let info; try { info = await portalInfo(params.token) } catch { return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 }) }
  if (!info?.contract_pdf_path) return NextResponse.json({ error: 'No hay contrato disponible' }, { status: 404 })
  try {
    const { data, error } = await serviceClient().storage.from('hab-docs').createSignedUrl(info.contract_pdf_path, 60, { download: 'contrato.pdf' })
    if (error || !data) return NextResponse.json({ error: 'No se pudo generar la descarga' }, { status: 500 })
    return NextResponse.redirect(data.signedUrl, 302)
  } catch { return NextResponse.json({ error: 'Descarga no disponible' }, { status: 503 }) }
}
