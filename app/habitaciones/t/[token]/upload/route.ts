import { NextResponse } from 'next/server'
import { portalInfo, rateLimited } from '@/lib/hab/server-portal'
import { serviceClient } from '@/lib/hab/server-admin'
import { validateUpload } from '@/lib/hab/types'

export const dynamic = 'force-dynamic'
const bad = (msg: string, status: number) => NextResponse.json({ error: msg }, { status })
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

export async function POST(req: Request, { params }: { params: { token: string } }) {
  if (await rateLimited('tup', params.token, 20)) return bad('Demasiadas subidas seguidas', 429)
  let info; try { info = await portalInfo(params.token) } catch { return bad('Servicio no disponible', 503) }
  if (!info) return bad('Enlace no válido o caducado', 404) // el token se valida ANTES de usar service_role
  const file = (await req.formData().catch(() => null))?.get('file')
  if (!(file instanceof File)) return bad('Falta el archivo', 400)
  const err = validateUpload(file, 'hab-photos'); if (err) return bad(err, 400)
  // La ruta la fija el servidor: nunca viene del cliente.
  const path = `${info.org_id}/tenant-link/${info.link_id}/${crypto.randomUUID()}.${EXT[file.type]}`
  try {
    const { error } = await serviceClient().storage.from('hab-photos').upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false })
    if (error) return bad('No se pudo subir la foto', 500)
  } catch { return bad('Subida de fotos no disponible', 503) }
  return NextResponse.json({ path })
}
