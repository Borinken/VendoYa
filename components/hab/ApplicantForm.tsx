'use client'
import { useEffect, useState } from 'react'
import { demoApplicantInfo, demoApplicantSave, demoApplicantUpload, demoApplicantWithdraw } from '@/lib/hab/demo-repo'
import { isDemo } from '@/lib/hab/env'
import { applicantSaveInput, applicationAnswers, CONSENT_TEXT, DOC_KINDS, validateUpload, type ApplicantInfo, type ApplicationAnswers, type DocKind } from '@/lib/hab/types'
import { Check, Notice, SelectField, TextField, eur } from './ui'

export const EMPLOYMENT: [string, string][] = [['', 'Elige una opción'], ['employee', 'Trabajo por cuenta ajena'], ['self', 'Autónomo'], ['student', 'Estudiante'], ['pensioner', 'Pensionista'], ['other_income', 'Otra situación con ingresos']]
export const SENIORITY: [string, string][] = [['', 'No indicada'], ['<6m', 'Menos de 6 meses'], ['6-12m', '6 a 12 meses'], ['1-3y', '1 a 3 años'], ['>3y', 'Más de 3 años']]
export const CONTRACT: [string, string][] = [['', 'No indicado'], ['permanent', 'Indefinido'], ['temporary', 'Temporal'], ['na', 'No aplica']]
export const INCOME: [string, string][] = [['', 'Elige un tramo'], ['<1000', 'Menos de 1.000 €'], ['1000-1500', '1.000 a 1.500 €'], ['1500-2000', '1.500 a 2.000 €'], ['2000-3000', '2.000 a 3.000 €'], ['>3000', 'Más de 3.000 €']]
export const REASON: [string, string][] = [['', 'Elige una opción'], ['temp_work', 'Trabajo temporal'], ['studies', 'Estudios'], ['other', 'Otro']]
const STEPS = ['Tus datos', 'Situación laboral', 'Ingresos y estancia', 'Convivencia', 'Referencia', 'Documentos', 'Enviar']

export function ApplicantForm({ token }: { token: string }) {
  const demo = isDemo()
  const [info, setInfo] = useState<ApplicantInfo | null | undefined>(undefined); const [step, setStep] = useState(0)
  const [c, setC] = useState({ name: '', email: '', phone: '', consent: false }); const [a, setA] = useState<Record<string, string | number | boolean>>({ adults: 1, pets: false, smoker: false, duration_months: 12 })
  const [ref, setRef] = useState({ name: '', email: '', phone: '' }); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [saved, setSaved] = useState(false)

  const load = async () => { const i = demo ? demoApplicantInfo(token) : await fetch(`/habitaciones/a/${token}/api`, { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)); setInfo(i); return i as ApplicantInfo | null }
  useEffect(() => { void load().then(i => { if (i) { setC(x => ({ ...x, name: i.applicant_name, email: i.email, phone: i.phone, consent: false })); setA(x => ({ ...x, ...(i.answers as Record<string, string | number | boolean>) })); if (i.answers.previous_landlord) setRef(i.answers.previous_landlord) } }) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k: string) => (v: string | number | boolean) => setA(x => ({ ...x, [k]: v }))
  const answers = (): ApplicationAnswers => ({ ...(a as ApplicationAnswers), ...(ref.name.trim() ? { previous_landlord: ref } : {}) })

  async function post(submit: boolean) {
    setBusy(true); setErr('')
    try {
      if (submit) {
        const cv = applicantSaveInput.safeParse(c); if (!cv.success) throw new Error(cv.error.issues[0].message)
        if (!c.consent) throw new Error('Marca la casilla de consentimiento para enviar')
        const av = applicationAnswers.safeParse(answers()); if (!av.success) throw new Error('Completa los datos obligatorios: ' + av.error.issues[0].path.join('.'))
        const missing = info!.required_docs.filter(k => !info!.docs.some(d => d.kind === k)); if (missing.length) throw new Error('Faltan documentos: ' + missing.map(k => DOC_KINDS[k]).join(', '))
      }
      if (demo) demoApplicantSave(token, c, answers(), submit)
      else { const r = await fetch(`/habitaciones/a/${token}/api`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...c, answers: answers(), submit }) }); const j = await r.json(); if (!r.ok) throw new Error(j.error) }
      setSaved(true); await load()
    } catch (e) { setErr(e instanceof Error ? e.message : 'No se pudo guardar') } finally { setBusy(false) }
  }
  async function upload(kind: DocKind, f: File | undefined) {
    if (!f) return; const v = validateUpload(f, 'hab-docs'); if (v) { setErr(v); return }
    setBusy(true); setErr('')
    try {
      if (demo) await demoApplicantUpload(token, kind, f)
      else { const fd = new FormData(); fd.set('file', f); fd.set('kind', kind); const r = await fetch(`/habitaciones/a/${token}/upload`, { method: 'POST', body: fd }); const j = await r.json(); if (!r.ok) throw new Error(j.error) }
      await load()
    } catch (e) { setErr(e instanceof Error ? e.message : 'No se pudo subir') } finally { setBusy(false) }
  }
  async function withdraw() {
    if (!confirm('¿Retirar tu solicitud?')) return
    if (demo) demoApplicantWithdraw(token); else await fetch(`/habitaciones/a/${token}/api`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ withdraw: true }) })
    await load()
  }

  if (info === undefined) return <main style={{ padding: '2rem' }}><p className="muted" role="status">Cargando…</p></main>
  if (!info) return <main style={{ maxWidth: 480, margin: '0 auto', padding: '3rem 1.25rem' }}><h1>Enlace no válido</h1><p className="muted" style={{ marginTop: '.75rem' }}>Este enlace ha caducado o no existe. Pide uno nuevo a quien te lo envió.</p></main>
  if (info.status !== 'sent') return (
    <main style={{ maxWidth: 520, margin: '0 auto', padding: '2rem 1.25rem' }} className="h-rise"><h1>{info.status === 'withdrawn' ? 'Solicitud retirada' : 'Solicitud recibida'}</h1>
      <p className="muted" style={{ marginTop: '.75rem' }}>Habitación «{info.room_label}» · {info.property_name}. {info.status === 'submitted' || info.status === 'in_review' ? 'Una persona revisará tu solicitud y te responderá. No hay decisiones automáticas.' : 'Tu solicitud ya no admite cambios.'}</p>
      {(info.status === 'submitted' || info.status === 'in_review') && <button className="h-btn" style={{ marginTop: '1rem' }} onClick={withdraw}>Retirar mi solicitud</button>}
      <p className="muted small" style={{ marginTop: '1.5rem' }}>Responsable de tus datos: <strong>{info.org_name}</strong>. Puedes pedirle el borrado cuando quieras.</p></main>
  )
  const body = [
    <div key="0" style={{ display: 'grid', gap: '1rem' }}>
      <div className="h-panel"><h3>{info.room_label} · {info.property_name}</h3><p className="muted">Renta: {eur(info.rent_cents)}/mes</p>
        {info.notes_public && <p style={{ marginTop: '.5rem' }}>{info.notes_public}</p>}
        <p className="muted small" style={{ marginTop: '.5rem' }}>Documentos que se piden: {info.required_docs.length ? info.required_docs.map(k => DOC_KINDS[k]).join(', ') : 'ninguno obligatorio'}. Los mismos criterios se aplican a todas las solicitudes.</p></div>
      <TextField label="Nombre y apellidos" value={c.name} onChange={v => setC(x => ({ ...x, name: v }))} required />
      <TextField label="Correo" type="email" value={c.email} onChange={v => setC(x => ({ ...x, email: v }))} required />
      <TextField label="Teléfono" value={c.phone} onChange={v => setC(x => ({ ...x, phone: v }))} hint="Con prefijo, p. ej. +34600123456" />
      <div className="h-panel"><p className="small">Responsable de tus datos: <strong>{info.org_name}</strong> (la organización de quien alquila la habitación).</p>
        <Check label={CONSENT_TEXT} checked={c.consent} onChange={v => setC(x => ({ ...x, consent: v }))} />
        <p className="muted small">No te pedimos sexo, nacionalidad, estado civil, hijos, salud ni otras características personales. DNI y fecha de nacimiento solo se piden si te aprueban, al preparar el contrato.</p></div>
    </div>,
    <div key="1" style={{ display: 'grid', gap: '1rem' }}>
      <SelectField label="Situación laboral" value={String(a.employment ?? '')} onChange={set('employment')} options={EMPLOYMENT} />
      <TextField label="Empresa o centro" value={String(a.employer ?? '')} onChange={set('employer')} />
      <SelectField label="Antigüedad aproximada" value={String(a.seniority ?? '')} onChange={set('seniority')} options={SENIORITY} />
      <SelectField label="Tipo de contrato" value={String(a.contract_type ?? '')} onChange={set('contract_type')} options={CONTRACT} />
    </div>,
    <div key="2" style={{ display: 'grid', gap: '1rem' }}>
      <SelectField label="Tramo de ingresos netos mensuales" value={String(a.income_bracket ?? '')} onChange={set('income_bracket')} options={INCOME} />
      <TextField label="Fecha de entrada prevista" type="date" value={String(a.move_in ?? '')} onChange={set('move_in')} required />
      <TextField label="Duración prevista (meses)" type="number" value={Number(a.duration_months ?? 12)} onChange={v => set('duration_months')(Math.round(Number(v)) || 0)} required />
      <SelectField label="Motivo del alquiler" value={String(a.reason ?? '')} onChange={set('reason')} options={REASON} />
    </div>,
    <div key="3" style={{ display: 'grid', gap: '.5rem' }}>
      <TextField label="Adultos que ocuparán la habitación" type="number" value={Number(a.adults ?? 1)} onChange={v => set('adults')(Math.round(Number(v)) || 1)} required />
      <Check label="Tengo mascota" checked={a.pets === true} onChange={set('pets')} /><Check label="Fumo" checked={a.smoker === true} onChange={set('smoker')} />
      <p className="muted small">Solo para aplicar las reglas de la casa a todas las personas por igual.</p>
    </div>,
    <div key="4" style={{ display: 'grid', gap: '1rem' }}>
      <p className="muted">Opcional: una persona que alquiló antes a tu nombre. Podrá responder con su propio enlace.</p>
      <TextField label="Nombre" value={ref.name} onChange={v => setRef(x => ({ ...x, name: v }))} /><TextField label="Correo" value={ref.email} onChange={v => setRef(x => ({ ...x, email: v }))} /><TextField label="Teléfono" value={ref.phone} onChange={v => setRef(x => ({ ...x, phone: v }))} />
    </div>,
    <div key="5" style={{ display: 'grid', gap: '1rem' }}>
      <p className="muted">PDF o imagen, máximo 10 MB cada uno. Solo se usan para esta solicitud.</p>
      {(info.required_docs.length ? info.required_docs : (Object.keys(DOC_KINDS) as DocKind[])).map(k => {
        const n = info.docs.filter(d => d.kind === k).length
        return <label key={k} className="h-field"><span>{DOC_KINDS[k]} {info.required_docs.includes(k) ? '*' : '(opcional)'} {n > 0 && `· ${n} subido(s)`}</span>
          <input className="h-input" type="file" accept="application/pdf,image/jpeg,image/png" disabled={busy} onChange={e => { void upload(k, e.target.files?.[0]); e.target.value = '' }} /></label>
      })}
    </div>,
    <div key="6" style={{ display: 'grid', gap: '1rem' }}>
      <Notice>Revisa tus datos y envía. Una persona revisará tu solicitud con los mismos criterios que al resto; no hay puntuación ni decisión automática.</Notice>
      <button className="h-btn primary" disabled={busy} onClick={() => post(true)}>{busy ? 'Enviando…' : 'Enviar solicitud'}</button>
    </div>,
  ]
  return (
    <main style={{ maxWidth: 560, margin: '0 auto', padding: '1.5rem 1.25rem 4rem' }} className="h-rise">
      <p style={{ fontFamily: 'Bricolage, sans-serif', fontWeight: 700, color: 'var(--h-accent)' }}>Solicitud de alquiler</p>
      <h1 style={{ margin: '.4rem 0' }}>{STEPS[step]}</h1><p className="muted">Paso {step + 1} de {STEPS.length}. Puedes guardar un borrador y volver con este mismo enlace.</p>
      <section className="h-panel" style={{ marginTop: '1.25rem' }}>{body[step]}</section>
      {err && <p role="alert" style={{ color: 'var(--h-bad)', marginTop: '.75rem' }}>{err}</p>}{saved && !err && <p role="status" className="muted small" style={{ marginTop: '.75rem' }}>Borrador guardado.</p>}
      <div className="flex flex-wrap justify-between gap-2" style={{ marginTop: '1rem' }}>
        <button className="h-btn" disabled={step === 0} onClick={() => setStep(step - 1)}>Anterior</button>
        <button className="h-btn" disabled={busy} onClick={() => post(false)}>Guardar borrador</button>
        {step < STEPS.length - 1 && <button className="h-btn primary" onClick={() => setStep(step + 1)}>Siguiente</button>}
      </div>
    </main>
  )
}
