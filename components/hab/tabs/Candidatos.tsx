'use client'
import { Fragment, useState } from 'react'
import { Copy, ExternalLink, MessageCircle } from 'lucide-react'
import { useHab } from '../HabProvider'
import { CONTRACT, EMPLOYMENT, INCOME, REASON, SENIORITY } from '../ApplicantForm'
import { Loading, useSnap } from '../shared'
import { Badge, Check, Disclosure, Empty, Notice, Page, SelectField, TextField, eur, fmtDate } from '../ui'
import { DOC_KINDS, REASON_CODES, type Application, type ApplicationAnswers, type AppStatus, type DocKind, type Snapshot } from '@/lib/hab/types'
import { roomLabel } from '@/lib/hab/reports'
import { waLink } from '@/lib/hab/whatsapp'

export const CANDIDATE_NOTICE = 'Decide siempre una persona. Aplica los mismos criterios a todos los candidatos. No uses sexo, nacionalidad ni otras características protegidas.'
// Estados en texto neutro, sin colores de semáforo.
const ST: Record<AppStatus, string> = { sent: 'Enlace enviado', submitted: 'Recibida', in_review: 'En revisión', approved: 'Aprobada', rejected: 'Rechazada', withdrawn: 'Retirada', expired: 'Expirada' }
const lab = (opts: [string, string][], v?: string) => opts.find(([k]) => k === v)?.[1] || '—'
// Mismo orden para todos los candidatos: solo datos declarados.
const FIELDS: [string, (a: ApplicationAnswers) => string][] = [
  ['Situación laboral', a => lab(EMPLOYMENT, a.employment)], ['Empresa o centro', a => a.employer || '—'], ['Antigüedad', a => lab(SENIORITY, a.seniority)], ['Tipo de contrato', a => lab(CONTRACT, a.contract_type)],
  ['Ingresos netos mensuales', a => lab(INCOME, a.income_bracket)], ['Fecha de entrada', a => (a.move_in ? fmtDate(a.move_in) : '—')], ['Duración prevista', a => (a.duration_months ? `${a.duration_months} meses` : '—')],
  ['Motivo', a => lab(REASON, a.reason)], ['Adultos', a => (a.adults ? String(a.adults) : '—')], ['Mascotas', a => (a.pets === undefined ? '—' : a.pets ? 'Sí' : 'No')], ['Fumador', a => (a.smoker === undefined ? '—' : a.smoker ? 'Sí' : 'No')],
  ['Referencia de arrendador anterior', a => a.previous_landlord?.name || '—'],
]

function RefBlock({ a, d }: { a: Application; d: Snapshot }) {
  const { repo, act, notify } = useHab(); const [link, setLink] = useState('')
  const p = a.answers.previous_landlord; const ref = d.references.find(r => r.application_id === a.id)
  if (!p?.name) return null
  const ask = async () => { const r = await act(() => repo.createReference(a.id), 'Enlace de referencia creado'); if (r) setLink(`${location.origin}/habitaciones/r/${r.token}`) }
  return (
    <div className="h-panel" style={{ display: 'grid', gap: '.5rem' }}><h3>Referencia de {p.name}</h3>
      {ref?.response ? <p className="small">Respondió el {fmtDate(ref.answered_at)}: {ref.response.months} meses · pago {ref.response.punctual} · inmueble {ref.response.property_condition}{ref.response.comment ? ` · «${ref.response.comment}»` : ''}</p> : <p className="muted small">Sin respuesta todavía.</p>}
      {!ref?.response && <button className="h-btn sm" style={{ width: 'fit-content' }} onClick={ask}>Pedir referencia (enlace propio)</button>}
      {link && <div className="flex flex-wrap gap-2 items-center"><code className="small" style={{ userSelect: 'all', overflowWrap: 'anywhere' }}>{link}</code><button className="h-btn sm" onClick={() => navigator.clipboard.writeText(link).then(() => notify('Enlace copiado'))}><Copy size={14} aria-hidden /> Copiar</button>{p.phone && <a className="h-btn sm" target="_blank" rel="noreferrer" href={waLink(p.phone, 'Hola, ' + a.applicant_name + ' te ha indicado como referencia de alquiler. Son tres preguntas breves: ' + link)}><MessageCircle size={14} aria-hidden /> WhatsApp</a>}</div>}
    </div>
  )
}

function Candidate({ a, d, selected, onSelect }: { a: Application; d: Snapshot; selected: boolean; onSelect: (v: boolean) => void }) {
  const { repo, act, notify } = useHab(); const [reason, setReason] = useState(''); const [note, setNote] = useState(''); const docs = d.applicationDocs.filter(x => x.application_id === a.id)
  const pending = a.status === 'submitted' || a.status === 'in_review'
  const open = async (path: string) => { const u = await repo.fileUrl('hab-docs', path); if (u) window.open(u, '_blank', 'noreferrer'); else notify('No se pudo abrir el documento', 'bad') }
  const result = (approved: boolean) => `Hola ${a.applicant_name}, gracias por tu interés en la habitación. ${approved ? 'Tu solicitud ha sido aceptada: nos pondremos en contacto para preparar el contrato.' : 'En esta ocasión no continuamos con tu solicitud. Gracias por el tiempo dedicado.'}`
  return (
    <div className="h-panel" style={{ display: 'grid', gap: '.75rem', background: 'var(--h-bg)' }}>
      <div className="flex flex-wrap justify-between gap-2"><div><h3>{a.applicant_name || 'Candidato sin completar'}</h3><p className="muted small">{a.email}{a.phone ? ` · ${a.phone}` : ''} · {a.submitted_at ? `enviada ${fmtDate(a.submitted_at)}` : 'sin enviar'}</p></div>
        <span className="flex gap-2 items-start"><Badge>{ST[a.status]}</Badge>{a.retention_until && <span className="muted small">Se borra el {fmtDate(a.retention_until)}</span>}</span></div>
      {a.status !== 'sent' && <>
        <Check label="Contacto verificado (comprobado por mí)" checked={a.contact_verified} onChange={v => act(() => repo.setContactVerified(a.id, v))} />
        <dl style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 40%) 1fr', gap: '.25rem .75rem', margin: 0 }}>{FIELDS.map(([l, f]) => <Fragment key={l}><dt className="muted small">{l}</dt><dd style={{ margin: 0 }}>{f(a.answers)}</dd></Fragment>)}</dl>
        <RefBlock a={a} d={d} />
        {docs.length > 0 && <div>{docs.map(x => (
          <div className="h-row" key={x.id}><span>{DOC_KINDS[x.kind]} <button className="h-btn sm quiet" onClick={() => open(x.path)}><ExternalLink size={14} aria-hidden /> Abrir</button></span>
            <Check label={x.verified_at ? `Documento visto y coherente · ${fmtDate(x.verified_at)}${x.verified_by ? ' · ' + (x.verified_by === repo.session.userId ? 'tú' : 'otro miembro') : ''}` : 'Documento visto y coherente'} checked={!!x.verified_at} onChange={v => act(() => repo.verifyDoc(x.id, v))} /></div>))}</div>}
      </>}
      {pending && (
        <div className="h-panel" style={{ display: 'grid', gap: '.75rem' }}>
          <div className="flex flex-wrap gap-2"><button className="h-btn primary" onClick={() => { if (confirm('Se crea el inquilino y un contrato en borrador, y se eliminan los datos de la solicitud que ya no hacen falta. ¿Continuar?')) void act(() => repo.approveAndCreateContract(a.id), 'Aprobada: inquilino y contrato en borrador creados') }}>Aprobar y crear contrato</button></div>
          <div className="h-grid"><SelectField label="Motivo de rechazo (lista neutra)" value={reason} onChange={setReason} options={[['', 'Elige un motivo'], ...Object.entries(REASON_CODES) as [string, string][]]} />
            <TextField label="Nota (opcional)" value={note} onChange={setNote} /></div>
          <button className="h-btn danger" style={{ width: 'fit-content' }} disabled={!reason} onClick={() => act(() => repo.decideApplication(a.id, 'rejected', reason, note), 'Solicitud rechazada y registrada')}>Rechazar</button>
        </div>
      )}
      <div className="flex flex-wrap gap-2 items-center">
        {a.status !== 'sent' && <Check label="Comparar" checked={selected} onChange={onSelect} />}
        {(a.status === 'approved' || a.status === 'rejected') && a.phone && <a className="h-btn sm" target="_blank" rel="noreferrer" href={waLink(a.phone, result(a.status === 'approved'))}><MessageCircle size={14} aria-hidden /> Enviar resultado por WhatsApp</a>}
        <button className="h-btn sm danger" onClick={() => { if (confirm('¿Borrar esta solicitud ahora? No se puede deshacer.')) void act(() => repo.deleteApplication(a.id), 'Solicitud borrada') }}>Borrar ahora</button>
      </div>
    </div>
  )
}

function Room({ roomId, d }: { roomId: string; d: Snapshot }) {
  const { repo, act, notify } = useHab(); const room = d.rooms.find(r => r.id === roomId)!
  const crit = d.criteria.find(c => c.room_id === roomId); const apps = d.applications.filter(a => a.room_id === roomId)
  const [docs, setDocs] = useState<DocKind[]>(crit?.required_docs ?? []); const [notes, setNotes] = useState(crit?.notes_public ?? ''); const [link, setLink] = useState(''); const [sel, setSel] = useState<string[]>([])
  const chosen = apps.filter(a => sel.includes(a.id))
  const make = async () => { const r = await act(() => repo.createApplicationLink(roomId), 'Enlace de solicitud creado'); if (r) setLink(`${location.origin}/habitaciones/a/${r.token}`) }
  return (
    <section className="h-panel" aria-label={roomLabel(d, roomId)}>
      <div className="flex flex-wrap justify-between gap-2 items-center"><div><h2>{roomLabel(d, roomId)}</h2><p className="muted small">{eur(room.rent_cents)}/mes</p></div>
        <button className="h-btn" onClick={make}>Crear enlace de solicitud</button></div>
      {link && <div style={{ marginTop: '.75rem', display: 'grid', gap: '.5rem' }}><Notice tone="ok">Envía este enlace al candidato (caduca en 14 días): <code style={{ userSelect: 'all', overflowWrap: 'anywhere' }}>{link}</code></Notice>
        <div className="flex gap-2"><button className="h-btn sm" onClick={() => navigator.clipboard.writeText(link).then(() => notify('Enlace copiado'))}><Copy size={14} aria-hidden /> Copiar</button>
          <a className="h-btn sm" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent('Hola, este es el enlace para solicitar la habitación: ' + link)}`}><MessageCircle size={14} aria-hidden /> Enviar por WhatsApp</a></div></div>}
      <div style={{ marginTop: '1rem' }}><Disclosure summary="Criterios publicados para esta habitación (los ve el candidato)">
        <div style={{ display: 'grid', gap: '.75rem' }}><fieldset style={{ border: 0, padding: 0, margin: 0 }}><legend className="muted small">Documentos que se piden</legend>
          <div className="flex flex-wrap gap-x-5">{(Object.entries(DOC_KINDS) as [DocKind, string][]).map(([k, l]) => <Check key={k} label={l} checked={docs.includes(k)} onChange={v => setDocs(v ? [...docs, k] : docs.filter(x => x !== k))} />)}</div></fieldset>
          <label className="h-field"><span>Criterios objetivos (texto visible)</span><textarea className="h-textarea" value={notes} onChange={e => setNotes(e.target.value)} /></label>
          <button className="h-btn sm" style={{ width: 'fit-content' }} onClick={() => act(() => repo.saveCriteria(roomId, docs, notes), 'Criterios guardados')}>Guardar criterios</button></div></Disclosure></div>
      <div style={{ display: 'grid', gap: '.75rem', marginTop: '1rem' }}>
        {apps.length === 0 ? <p className="muted">Sin solicitudes todavía.</p> : apps.map(a => <Candidate key={a.id} a={a} d={d} selected={sel.includes(a.id)} onSelect={v => setSel(v ? [...sel, a.id] : sel.filter(x => x !== a.id))} />)}
      </div>
      {chosen.length >= 2 && (
        <div style={{ marginTop: '1rem', overflowX: 'auto' }}><h3 style={{ marginBottom: '.5rem' }}>Comparación de datos declarados</h3>
          <table className="h-table" style={{ minWidth: 420 }}><thead><tr><th scope="col">Dato</th>{chosen.map(a => <th scope="col" key={a.id}>{a.applicant_name}</th>)}</tr></thead>
            <tbody>{FIELDS.map(([l, f]) => <tr key={l}><td>{l}</td>{chosen.map(a => <td key={a.id}>{f(a.answers)}</td>)}</tr>)}</tbody></table>
          <p className="muted small" style={{ marginTop: '.5rem' }}>Sin puntuación ni orden automático: solo lo que cada persona declaró, en el mismo orden.</p></div>
      )}
    </section>
  )
}

export function Candidatos() {
  const d = useSnap(); const { session } = useHab()
  if (!d) return <Loading />
  const rooms = d.rooms.filter(r => d.properties.find(p => p.id === r.property_id)?.org_id === session.orgId || d.access.some(x => x.property_id === r.property_id && x.status === 'granted'))
  const audit = d.audit.filter(x => x.action.startsWith('application_')).sort((a, b) => b.created_at.localeCompare(a.created_at))
  return (
    <Page title="Candidatos" intro="Envía un enlace de solicitud por habitación, revisa lo que declaran y decide tú.">
      <Notice>{CANDIDATE_NOTICE}</Notice>
      <div style={{ display: 'grid', gap: '1.25rem', marginTop: '1.25rem' }}>
        {rooms.length === 0 ? <Empty title="Sin habitaciones" hint="Crea un piso con habitaciones para poder recibir solicitudes." /> : rooms.map(r => <Room key={r.id} roomId={r.id} d={d} />)}
      </div>
      {audit.length > 0 && <section className="h-section"><h2>Registro de decisiones</h2>{audit.map(x => <div className="h-row" key={x.id}><span className="small">{x.action.replace('application_', '').replace(':', ' · ')}</span><span className="muted small">{fmtDate(x.created_at)}</span></div>)}</section>}
      <p className="muted small" style={{ marginTop: '1.25rem' }}>Los datos de solicitudes rechazadas o retiradas se borran a los 90 días; puedes borrarlos antes. La base legal para pedir ingresos y nóminas está pendiente de verificar con un abogado.</p>
    </Page>
  )
}
