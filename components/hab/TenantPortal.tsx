'use client'
import { useEffect, useState } from 'react'
import { AlertTriangle, Lightbulb, MessageCircle, MessageSquareWarning } from 'lucide-react'
import { demoContractUrl, demoPortalInfo, demoPortalSubmit, demoPortalUpload } from '@/lib/hab/demo-repo'
import { isDemo } from '@/lib/hab/env'
import { incidentMessage, waLink } from '@/lib/hab/whatsapp'
import { portalSubmitInput, validateUpload, type IncidentCategory, type PortalInfo } from '@/lib/hab/types'
import { Badge, Notice, fmtDate } from './ui'

const CATS: [IncidentCategory, string, typeof AlertTriangle][] = [['Avería', 'Avería', AlertTriangle], ['Queja', 'Queja', MessageSquareWarning], ['Sugerencia', 'Sugerencia', Lightbulb]]
const ST = { open: 'Abierta', seen: 'Vista', in_progress: 'En curso', resolved: 'Resuelta' } as const

// Mini-portal público (sin login) identificado por el token del enlace personal.
export function TenantPortal({ token }: { token: string }) {
  const demo = isDemo()
  const [info, setInfo] = useState<PortalInfo | null | undefined>(undefined)
  const [cat, setCat] = useState<IncidentCategory>('Avería'); const [desc, setDesc] = useState(''); const [photos, setPhotos] = useState<{ path: string; url: string }[]>([])
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [done, setDone] = useState<{ code: string; category: IncidentCategory } | null>(null)

  const load = async () => {
    if (demo) { setInfo(demoPortalInfo(token)); return }
    const r = await fetch(`/habitaciones/t/${token}/api`, { cache: 'no-store' }); setInfo(r.ok ? await r.json() : null)
  }
  useEffect(() => { void load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function addPhoto(f: File | undefined) {
    if (!f) return; const v = validateUpload(f, 'hab-photos'); if (v) { setErr(v); return }
    if (photos.length >= 5) { setErr('Máximo 5 fotos'); return }
    setBusy(true); setErr('')
    try {
      let path: string
      if (demo) path = await demoPortalUpload(f)
      else { const fd = new FormData(); fd.set('file', f); const r = await fetch(`/habitaciones/t/${token}/upload`, { method: 'POST', body: fd }); const j = await r.json(); if (!r.ok) throw new Error(j.error); path = j.path }
      setPhotos(p => [...p, { path, url: URL.createObjectURL(f) }])
    } catch (e) { setErr(e instanceof Error ? e.message : 'No se pudo subir la foto') } finally { setBusy(false) }
  }
  async function send(e: React.FormEvent) {
    e.preventDefault(); const r = portalSubmitInput.safeParse({ category: cat, description: desc, photo_paths: photos.map(p => p.path) })
    if (!r.success) { setErr(r.error.issues[0].message); return }
    setBusy(true); setErr('')
    try {
      let out: { code: string }
      if (demo) out = demoPortalSubmit(token, r.data)
      else { const res = await fetch(`/habitaciones/t/${token}/api`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(r.data) }); const j = await res.json(); if (!res.ok) throw new Error(j.error); out = j }
      setDone({ code: out.code, category: cat }); setDesc(''); setPhotos([]); await load()
    } catch (x) { setErr(x instanceof Error ? x.message : 'No se pudo enviar') } finally { setBusy(false) }
  }

  if (info === undefined) return <main style={{ padding: '2rem' }}><p className="muted" role="status">Cargando…</p></main>
  if (!info) return <main style={{ maxWidth: 480, margin: '0 auto', padding: '3rem 1.25rem' }}><h1>Enlace no válido</h1><p className="muted" style={{ marginTop: '.75rem' }}>Este enlace ha caducado o fue revocado. Pide uno nuevo a tu arrendador.</p></main>

  return (
    <main style={{ maxWidth: 560, margin: '0 auto', padding: '1.5rem 1.25rem 4rem' }} className="h-rise">
      <p style={{ fontFamily: 'Bricolage, sans-serif', fontWeight: 700, color: 'var(--h-accent)' }}>Mi habitación</p>
      <h1 style={{ margin: '.4rem 0' }}>Hola, {info.tenant_name}</h1>
      <p className="muted">{info.room_label} · {info.property_name}</p>

      {done ? (
        <div className="h-panel" style={{ marginTop: '1.5rem', display: 'grid', gap: '1rem' }}>
          <h2>Aviso enviado</h2><p>Tu código es <strong style={{ fontSize: '1.3rem' }}>{done.code}</strong>. Guárdalo por si quieres consultar el estado.</p>
          <Notice tone="ok">{info.auto_reply}</Notice>
          {info.org_whatsapp && <a className="h-btn primary" target="_blank" rel="noreferrer" href={waLink(info.org_whatsapp, incidentMessage(info.templates, { category: done.category, name: info.tenant_name, room: info.room_label, code: done.code }))}><MessageCircle size={18} aria-hidden /> Avisar también por WhatsApp</a>}
          <button className="h-btn" onClick={() => setDone(null)}>Enviar otro aviso</button>
        </div>
      ) : (
        <form onSubmit={send} noValidate className="h-panel" style={{ marginTop: '1.5rem', display: 'grid', gap: '1rem' }}>
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}><legend className="muted small" style={{ marginBottom: '.5rem' }}>¿Qué quieres comunicar?</legend>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '.5rem' }}>
              {CATS.map(([k, l, Icon]) => (
                <label key={k} className="h-btn" style={{ flexDirection: 'column', minHeight: 84, padding: '.6rem', borderColor: cat === k ? 'var(--h-accent)' : undefined, background: cat === k ? 'var(--h-accent-soft)' : undefined, cursor: 'pointer' }}>
                  <input type="radio" name="cat" checked={cat === k} onChange={() => setCat(k)} style={{ position: 'absolute', opacity: 0 }} /><Icon size={22} aria-hidden />{l}</label>
              ))}</div></fieldset>
          <label className="h-field"><span>Cuéntanos qué ocurre *</span><textarea className="h-textarea" value={desc} onChange={e => setDesc(e.target.value)} aria-invalid={!!err && desc.length < 5} /></label>
          <div className="flex flex-wrap gap-2">{photos.map(p => /* eslint-disable-next-line @next/next/no-img-element */ <img key={p.path} src={p.url} alt="Foto adjunta" width={64} height={64} style={{ objectFit: 'cover', borderRadius: 8, width: 64, height: 64 }} />)}</div>
          <label className="h-btn sm" style={{ width: 'fit-content' }}>Añadir foto (opcional)<input type="file" hidden accept="image/jpeg,image/png,image/webp" capture="environment" disabled={busy || photos.length >= 5} onChange={e => { void addPhoto(e.target.files?.[0]); e.target.value = '' }} /></label>
          {err && <p role="alert" style={{ color: 'var(--h-bad)' }}>{err}</p>}
          <button className="h-btn primary" disabled={busy}>{busy ? 'Enviando…' : 'Enviar aviso'}</button>
        </form>
      )}

      {info.contract_pdf_path && (
        <section className="h-panel" style={{ marginTop: '1.5rem', display: 'grid', gap: '.75rem' }}><h2>Mi contrato</h2>
          <p className="muted small">Solo lectura. Este enlace caduca o puede ser revocado por tu arrendador.</p>
          <a className="h-btn" href={demo ? demoContractUrl(info.contract_pdf_path) ?? '#' : `/habitaciones/t/${token}/contract`} download={demo ? 'contrato.pdf' : undefined}>Descargar contrato (PDF)</a></section>
      )}
      {info.incidents.length > 0 && <section style={{ marginTop: '2rem' }}><h2>Mis avisos anteriores</h2>
        {info.incidents.map(i => <div key={i.code} className="h-row"><span><strong>{i.code}</strong> · {i.title}<br /><span className="muted small">{fmtDate(i.created_at)}</span></span><Badge tone={i.status === 'resolved' ? 'ok' : 'warn'}>{ST[i.status]}</Badge></div>)}</section>}

      <p className="muted small" style={{ marginTop: '2rem' }}>Responsable de tus datos: <strong>{info.org_name}</strong> (la organización de tu arrendador). Tus datos solo sirven para gestionar este aviso y se guardan en su registro privado. No se piden ni se guardan datos como sexo o nacionalidad.</p>
    </main>
  )
}
