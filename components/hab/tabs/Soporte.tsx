'use client'
import { useState } from 'react'
import { MessageCircle, Phone } from 'lucide-react'
import { useHab } from '../HabProvider'
import { Loading, useSnap } from '../shared'
import { Badge, Disclosure, Notice, Page, SelectField, TextField, fmtDate } from '../ui'
import { PLATFORM_SUPPORT_DISPLAY, PLATFORM_SUPPORT_WHATSAPP } from '@/lib/hab/config'
import { supportMessage, waLink } from '@/lib/hab/whatsapp'
import { TICKET_CATEGORIES, ticketInput, type SupportTicket, type TicketCategory } from '@/lib/hab/types'

const ST = { open: 'Abierto', answered: 'Respondido', closed: 'Cerrado' } as const

export function WhatsAppButton({ t, onClick }: { t: Pick<SupportTicket, 'number' | 'category' | 'subject'>; onClick?: () => void }) {
  return <a className="h-btn primary" target="_blank" rel="noreferrer" onClick={onClick} href={waLink(PLATFORM_SUPPORT_WHATSAPP, supportMessage(t.number, t.category, t.subject))}><MessageCircle size={18} aria-hidden /> Continuar por WhatsApp</a>
}

export function Soporte() {
  const d = useSnap(); const { repo, act, notify } = useHab()
  const [v, setV] = useState({ category: 'Otro' as TicketCategory, subject: '', body: '', phone: '' }); const [files, setFiles] = useState<string[]>([]); const [err, setErr] = useState<Record<string, string>>({})
  const [done, setDone] = useState<SupportTicket | null>(null); const [reply, setReply] = useState<Record<string, string>>({})
  if (!d) return <Loading />
  async function save(e: React.FormEvent) {
    e.preventDefault(); const r = ticketInput.safeParse({ category: v.category, subject: v.subject, body: v.body, attachment_paths: files, contact_phone: v.phone.trim() || null })
    if (!r.success) { setErr(Object.fromEntries(r.error.issues.map(i => [String(i.path[0]), i.message]))); return }
    setErr({}); const t = await act(() => repo.createTicket(r.data)); if (t) { setDone(t); setV({ category: 'Otro', subject: '', body: '', phone: '' }); setFiles([]) }
  }
  if (done) return (
    <Page title={`Ticket #${done.number} creado`} intro="Lo hemos guardado. Si es urgente, escríbenos también por WhatsApp.">
      <div className="h-panel" style={{ display: 'grid', gap: '1rem', maxWidth: 520 }}>
        <p><strong>{done.category}</strong>: {done.subject}</p>
        <WhatsAppButton t={done} onClick={() => void repo.ticketWhatsappClicked(done.id)} />
        <p className="muted"><Phone size={14} aria-hidden style={{ display: 'inline' }} /> {PLATFORM_SUPPORT_DISPLAY}</p>
        <p className="muted small">El mensaje solo lleva el número, la categoría y el asunto del ticket: sin datos personales ni contenido de contratos. En esta versión no hay chat: respondemos por ticket o WhatsApp una persona.</p>
        <button className="h-btn" onClick={() => setDone(null)}>Volver a Soporte</button>
      </div>
    </Page>
  )
  return (
    <Page title="Soporte" intro={`Cuéntanos qué necesitas. También puedes escribirnos al ${PLATFORM_SUPPORT_DISPLAY}.`}>
      <Disclosure summary="Nuevo ticket" open>
        <form onSubmit={save} noValidate style={{ display: 'grid', gap: '1rem' }}>
          <div className="h-grid"><SelectField label="Categoría" value={v.category} onChange={x => setV(s => ({ ...s, category: x }))} options={TICKET_CATEGORIES.map(c => [c, c] as [TicketCategory, string])} />
            <TextField label="Asunto" value={v.subject} onChange={x => setV(s => ({ ...s, subject: x }))} error={err.subject} required />
            <TextField label="Tu teléfono (opcional)" value={v.phone} onChange={x => setV(s => ({ ...s, phone: x }))} error={err.contact_phone} placeholder="+34600123456" hint="Solo para que podamos responderte por WhatsApp" /></div>
          <label className="h-field"><span>Descripción *</span><textarea className="h-textarea" aria-invalid={!!err.body} value={v.body} onChange={e => setV(s => ({ ...s, body: e.target.value }))} />{err.body && <small className="err" style={{ color: 'var(--h-bad)' }} role="alert">{err.body}</small>}</label>
          <label className="h-field"><span>Adjuntos (opcional, PDF o imagen, máx. 5)</span><input className="h-input" type="file" accept="application/pdf,image/jpeg,image/png" multiple
            onChange={async e => { try { const out = [...files]; for (const f of Array.from(e.target.files ?? [])) { if (out.length >= 5) break; out.push(await repo.upload('hab-docs', f)) } setFiles(out); notify(`${out.length} adjunto(s)`) } catch (x) { notify(x instanceof Error ? x.message : 'Error', 'bad') } }} /></label>
          <button className="h-btn primary" style={{ width: 'fit-content' }}>Enviar ticket</button>
        </form>
      </Disclosure>
      <section className="h-section"><h2>Mis tickets</h2>
        {d.tickets.length === 0 ? <p className="muted" style={{ marginTop: '.5rem' }}>Todavía no has creado ninguno.</p> : [...d.tickets].sort((a, b) => b.number - a.number).map(t => (
          <div key={t.id} className="h-row" style={{ alignItems: 'flex-start' }}>
            <span><strong>#{t.number} · {t.subject}</strong><br /><span className="muted small">{t.category} · {fmtDate(t.created_at)}</span>
              {d.ticketMessages.filter(m => m.ticket_id === t.id).map(m => <p key={m.id} className="small" style={{ marginTop: '.4rem' }}><strong>{m.author_kind === 'platform' ? 'Soporte' : 'Tú'}:</strong> {m.body}</p>)}
              {t.status !== 'closed' && <span className="flex flex-wrap gap-2 items-end" style={{ marginTop: '.5rem' }}><input className="h-input" aria-label={`Responder al ticket ${t.number}`} style={{ minHeight: 36 }} value={reply[t.id] ?? ''} onChange={e => setReply(s => ({ ...s, [t.id]: e.target.value }))} />
                <button className="h-btn sm" onClick={() => { const b = (reply[t.id] ?? '').trim(); if (b) void act(() => repo.addTicketMessage(t.id, b), 'Mensaje enviado').then(() => setReply(s => ({ ...s, [t.id]: '' }))) }}>Enviar</button></span>}</span>
            <Badge tone={t.status === 'answered' ? 'ok' : t.status === 'closed' ? 'neutral' : 'warn'}>{ST[t.status]}</Badge>
          </div>
        ))}</section>
      <div style={{ marginTop: '1.25rem' }}><Notice>Respuestas automáticas, si las hubiera, se marcarán siempre como «asistente automático». En esta versión no hay chat: solo ticket y WhatsApp con una persona.</Notice></div>
    </Page>
  )
}
