'use client'
import { useEffect, useState } from 'react'
import { demoReferenceAnswer, demoReferenceInfo } from '@/lib/hab/demo-repo'
import { isDemo } from '@/lib/hab/env'
import { referenceAnswerInput, type ReferenceInfo } from '@/lib/hab/types'
import { Notice, SelectField, TextField } from './ui'

// Página pública (sin login) donde responde el arrendador anterior que el candidato indicó como referencia.
export function ReferenceForm({ token }: { token: string }) {
  const demo = isDemo()
  const [info, setInfo] = useState<ReferenceInfo | null | undefined>(undefined); const [v, setV] = useState({ months: '', punctual: '', condition: '', comment: '' })
  const [err, setErr] = useState(''); const [done, setDone] = useState(false); const [busy, setBusy] = useState(false)
  useEffect(() => { (async () => { setInfo(demo ? demoReferenceInfo(token) : await fetch(`/habitaciones/r/${token}/api`, { cache: 'no-store' }).then(r => (r.ok ? r.json() : null))) })() }, [token, demo])

  async function send(e: React.FormEvent) {
    e.preventDefault(); setErr('')
    const p = referenceAnswerInput.safeParse({ months: Math.round(Number(v.months)), punctual: v.punctual, property_condition: v.condition, comment: v.comment })
    if (!p.success || v.months === '') { setErr('Completa el tiempo de alquiler, la puntualidad y el estado del inmueble'); return }
    setBusy(true)
    try {
      if (demo) demoReferenceAnswer(token, p.data)
      else { const r = await fetch(`/habitaciones/r/${token}/api`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p.data) }); const j = await r.json(); if (!r.ok) throw new Error(j.error) }
      setDone(true)
    } catch (x) { setErr(x instanceof Error ? x.message : 'No se pudo enviar') } finally { setBusy(false) }
  }
  if (info === undefined) return <main style={{ padding: '2rem' }}><p className="muted" role="status">Cargando…</p></main>
  if (!info) return <main style={{ maxWidth: 480, margin: '0 auto', padding: '3rem 1.25rem' }}><h1>Enlace no válido</h1><p className="muted" style={{ marginTop: '.75rem' }}>Este enlace no existe o ha caducado.</p></main>
  if (done || info.answered) return <main style={{ maxWidth: 480, margin: '0 auto', padding: '3rem 1.25rem' }} className="h-rise"><h1>Gracias</h1><p className="muted" style={{ marginTop: '.75rem' }}>Tu respuesta se ha guardado. Una persona la revisará; no hay decisiones automáticas.</p></main>
  return (
    <main style={{ maxWidth: 540, margin: '0 auto', padding: '1.5rem 1.25rem 4rem' }} className="h-rise">
      <p style={{ fontFamily: 'Bricolage, sans-serif', fontWeight: 700, color: 'var(--h-accent)' }}>Referencia de alquiler</p>
      <h1 style={{ margin: '.4rem 0' }}>Hola, {info.reference_name}</h1>
      <p className="muted"><strong>{info.applicant_name}</strong> te ha indicado como arrendador anterior. Son tres preguntas breves sobre el alquiler, nada más.</p>
      <form onSubmit={send} noValidate className="h-panel" style={{ marginTop: '1.25rem', display: 'grid', gap: '1rem' }}>
        <TextField label="¿Cuántos meses estuvo alquilado?" type="number" value={v.months} onChange={x => setV(s => ({ ...s, months: x }))} required />
        <SelectField label="Pago de la renta" value={v.punctual} onChange={x => setV(s => ({ ...s, punctual: x }))} options={[['', 'Elige una opción'], ['always', 'Siempre puntual'], ['mostly', 'Casi siempre puntual'], ['sometimes', 'A veces con retraso'], ['rarely', 'Con retrasos frecuentes']]} />
        <SelectField label="Estado del inmueble al terminar" value={v.condition} onChange={x => setV(s => ({ ...s, condition: x }))} options={[['', 'Elige una opción'], ['good', 'Bueno'], ['normal', 'Normal por el uso'], ['poor', 'Con daños']]} />
        <label className="h-field"><span>Comentario breve (opcional)</span><textarea className="h-textarea" maxLength={500} value={v.comment} onChange={e => setV(s => ({ ...s, comment: e.target.value }))} /></label>
        <Notice>Por favor, no incluyas datos personales sensibles (salud, origen, religión, familia…): solo hechos del alquiler.</Notice>
        {err && <p role="alert" style={{ color: 'var(--h-bad)' }}>{err}</p>}
        <button className="h-btn primary" disabled={busy}>{busy ? 'Enviando…' : 'Enviar respuesta'}</button>
      </form>
      <p className="muted small" style={{ marginTop: '1.5rem' }}>Responsable de los datos: <strong>{info.org_name}</strong>. Tu respuesta solo se usa para valorar esta solicitud y se borra con ella.</p>
    </main>
  )
}
