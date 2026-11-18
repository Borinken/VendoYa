import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { rateLimited } from '@/lib/hab/server-portal'
import { serviceClient } from '@/lib/hab/server-admin'
import { getServerSession } from '@/lib/hab/session'
import { timingSafeEqual } from 'node:crypto'

export const dynamic = 'force-dynamic'

// Lista recursivamente los ficheros bajo un prefijo (las carpetas vienen sin id).
async function listAll(sb: SupabaseClient, bucket: string, prefix: string, depth = 0): Promise<string[]> {
  if (depth > 4) return []
  const out: string[] = []
  for (let offset = 0; offset < 5000; offset += 100) {
    const { data } = await sb.storage.from(bucket).list(prefix.replace(/\/$/, ''), { limit: 100, offset })
    if (!data?.length) break
    for (const it of data) {
      if (it.id) out.push(`${prefix}${it.name}`)
      else out.push(...(await listAll(sb, bucket, `${prefix}${it.name}/`, depth + 1)))
    }
    if (data.length < 100) break
  }
  return out
}

// Vacía la cola hab_storage_trash (ficheros de cuentas y solicitudes borradas). Solo procesa lo que la base ya marcó
// para borrar (idempotente); exige CRON_SECRET o administrador de plataforma, y lleva límite de frecuencia.
function cronOk(req: Request) {
  const secret = process.env.CRON_SECRET; if (!secret) return false
  const a = Buffer.from(req.headers.get('authorization') ?? ''), b = Buffer.from(`Bearer ${secret}`)
  return a.length === b.length && timingSafeEqual(a, b)
}

// Vercel Cron llama por GET con Authorization: Bearer CRON_SECRET; un administrador de plataforma puede lanzarla por POST con su sesión.
export async function GET(req: Request) { return run(req) }
export async function POST(req: Request) { return run(req) }

async function run(req: Request) {
  if (!cronOk(req) && !(await getServerSession().catch(() => null))?.platformAdmin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (await rateLimited('cleanup', 'global', 12, 60)) return NextResponse.json({ error: 'Demasiadas llamadas' }, { status: 429 })
  try {
    const sb = serviceClient()
    const { data: rows } = await sb.from('hab_storage_trash').select('id,bucket,path,is_prefix').limit(100)
    let removed = 0
    for (const r of rows ?? []) {
      const paths = r.is_prefix ? await listAll(sb, r.bucket, r.path) : [r.path]
      for (let i = 0; i < paths.length; i += 100) await sb.storage.from(r.bucket).remove(paths.slice(i, i + 100))
      await sb.from('hab_storage_trash').delete().eq('id', r.id); removed += paths.length
    }
    return NextResponse.json({ removed })
  } catch { return NextResponse.json({ error: 'Limpieza no disponible' }, { status: 503 }) }
}
