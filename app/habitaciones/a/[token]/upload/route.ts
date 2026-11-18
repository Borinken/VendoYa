import { NextResponse } from 'next/server'
import { anonClient, applicantInfo, rateLimited } from '@/lib/hab/server-portal'
import { serviceClient } from '@/lib/hab/server-admin'
import { validateUpload } from '@/lib/hab/types'

export const dynamic = 'force-dynamic'
const bad = (m: string, s: number) => NextResponse.json({ error: m }, { status: s })
const EXT: Record<string, string> = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png' }
const KINDS = ['payslip', 'work_contract', 'study_proof', 'income_proof', 'reference_letter']

// Sube un documento del candidato. service_role solo aquí y solo tras validar el token; la ruta la fija el servidor.
export async function POST(req: Request, { params }: { params: { token: string } }) {
  if (await rateLimited('aup', params.token, 20)) return bad('Demasiadas subidas seguidas', 429)
  let info; try { info = await applicantInfo(params.token) } catch { return bad('Servicio no disponible', 503) }
  if (!info || info.status !== 'sent') return bad('Solicitud no disponible', 404)
  const fd = await req.formData().catch(() => null); const file = fd?.get('file'); const kind = String(fd?.get('kind') ?? '')
  if (!(file instanceof File) || !KINDS.includes(kind)) return bad('Datos no válidos', 400)
  const err = validateUpload(file, 'hab-docs'); if (err) return bad(err, 400)
  const path = `${info.org_id}/applications/${info.id}/${crypto.randomUUID()}.${EXT[file.type]}`
  try {
    const { error } = await serviceClient().storage.from('hab-docs').upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false })
    if (error) return bad('No se pudo subir el documento', 500)
  } catch { return bad('Subida no disponible', 503) }
  const { error } = await anonClient().rpc('hab_application_add_doc', { p_token: params.token, p_kind: kind, p_path: path })
  return error ? bad(error.message.slice(0, 120), 400) : NextResponse.json({ ok: true })
}
