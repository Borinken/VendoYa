'use client'
import { useEffect, useState } from 'react'
import { Camera } from 'lucide-react'
import { useHab } from './HabProvider'
import type { Bucket } from '@/lib/hab/types'

export function useSnap() { const { data } = useHab(); return data }
export const Loading = () => <p className="muted" role="status">Cargando…</p>

export function Thumb({ path, bucket = 'hab-photos' }: { path: string; bucket?: Bucket }) {
  const { repo } = useHab(); const [url, setUrl] = useState<string | null>(null)
  useEffect(() => { let on = true; repo.fileUrl(bucket, path).then(u => on && setUrl(u)); return () => { on = false } }, [repo, bucket, path])
  // eslint-disable-next-line @next/next/no-img-element
  return url ? <img src={url} alt="Foto adjunta" width={72} height={72} style={{ objectFit: 'cover', borderRadius: 8, width: 72, height: 72 }} /> : <span className="muted small">…</span>
}

// Selector de fotos (cámara o galería). Valida tipo y tamaño en repo.upload y devuelve las rutas subidas.
export function PhotoPicker({ paths, onChange, max = 10, label = 'Añadir fotos' }: { paths: string[]; onChange: (p: string[]) => void; max?: number; label?: string }) {
  const { repo, notify } = useHab(); const [busy, setBusy] = useState(false)
  async function pick(files: FileList | null) {
    if (!files) return
    setBusy(true)
    try {
      const out = [...paths]
      for (const f of Array.from(files)) { if (out.length >= max) { notify(`Máximo ${max} fotos`, 'bad'); break }; out.push(await repo.upload('hab-photos', f)) }
      onChange(out)
    } catch (e) { notify(e instanceof Error ? e.message : 'No se pudo subir', 'bad') } finally { setBusy(false) }
  }
  return (
    <div style={{ display: 'grid', gap: '.5rem' }}>
      <div className="flex flex-wrap gap-2">{paths.map(p => <Thumb key={p} path={p} />)}</div>
      <label className="h-btn sm" style={{ width: 'fit-content' }}>
        <Camera size={16} aria-hidden /> {busy ? 'Subiendo…' : label}
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple capture="environment" hidden disabled={busy || paths.length >= max} onChange={e => { void pick(e.target.files); e.target.value = '' }} />
      </label>
    </div>
  )
}

export function download(name: string, content: string | Blob, type = 'text/plain') {
  const blob = content instanceof Blob ? content : new Blob([content], { type })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}
