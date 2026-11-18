'use client'
import { useState } from 'react'
import Link from 'next/link'
import { MessageCircle } from 'lucide-react'
import { useHab } from '../HabProvider'
import { Loading, useSnap } from '../shared'
import { Badge, Check, Empty, Notice, Page, SelectField, TextField, eur, fmtDate, toCents } from '../ui'
import { PLATFORM_SUPPORT_WHATSAPP } from '@/lib/hab/config'
import { waLink } from '@/lib/hab/whatsapp'
import { SALE_TIMELINES, saleInterestInput, type Property, type SaleInterest, type SaleTimeline } from '@/lib/hab/types'

export const SALE_NOTICE = 'Si vendes un inmueble con inquilinos, los contratos en vigor pueden afectar a la venta; consulta con un abogado. Cualquier valoración es orientativa.'

function Form({ p, onDone }: { p: Property; onDone: (x: SaleInterest) => void }) {
  const { repo, act, session } = useHab(); const d = useSnap()
  const [v, setV] = useState({ price: '', timeline: 'nohurry' as SaleTimeline, tenants: false, until: '', notes: '' }); const [err, setErr] = useState('')
  const suggestEnd = d?.contracts.filter(c => c.status === 'active' && d.rooms.find(r => r.id === c.room_id)?.property_id === p.id).map(c => c.ends_on).sort().pop() ?? ''
  async function save(e: React.FormEvent) {
    e.preventDefault(); const r = saleInterestInput.safeParse({ property_id: p.id, desired_price_cents: v.price ? toCents(v.price) : null, timeline: v.timeline, has_tenants: v.tenants, tenants_end_on: v.tenants ? (v.until || null) : null, notes: v.notes })
    if (!r.success) { setErr(r.error.issues[0].message); return }
    setErr(''); const x = await act(() => repo.createSaleInterest(r.data)); if (x) onDone(x)
  }
  return (
    <form onSubmit={save} noValidate style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
      <div className="h-grid">
        <TextField label="Precio deseado (€, opcional)" type="number" value={v.price} onChange={x => setV(s => ({ ...s, price: x }))} />
        <SelectField label="Plazo" value={v.timeline} onChange={x => setV(s => ({ ...s, timeline: x }))} options={Object.entries(SALE_TIMELINES) as [SaleTimeline, string][]} />
      </div>
      <Check label="Hay inquilinos con contrato en vigor" checked={v.tenants} onChange={x => setV(s => ({ ...s, tenants: x, until: x ? s.until || suggestEnd : '' }))} />
      {v.tenants && <TextField label="Fecha de fin de los contratos" type="date" value={v.until} onChange={x => setV(s => ({ ...s, until: x }))} />}
      <label className="h-field"><span>Notas</span><textarea className="h-textarea" value={v.notes} onChange={e => setV(s => ({ ...s, notes: e.target.value }))} /></label>
      {err && <p role="alert" style={{ color: 'var(--h-bad)' }}>{err}</p>}
      <button className="h-btn primary" style={{ width: 'fit-content' }}>Enviar</button>
      <p className="muted small">Sesión: {session.name}. No hay precio ni valoración automáticos en esta fase.</p>
    </form>
  )
}

export function Vender() {
  const d = useSnap(); const { session } = useHab()
  const [open, setOpen] = useState<string | null>(null); const [done, setDone] = useState<{ p: Property; x: SaleInterest } | null>(null)
  if (!d) return <Loading />
  const own = d.properties.filter(p => p.org_id === session.orgId)
  if (done) return (
    <Page title="Recibido" intro="Hemos guardado tu interés. Esto es solo el primer paso: no hay valoración automática.">
      <div className="h-panel" style={{ display: 'grid', gap: '1rem', maxWidth: 520 }}>
        <p><strong>{done.p.name}</strong> · {SALE_TIMELINES[done.x.timeline]}</p>
        <div className="flex flex-wrap gap-2">
          <Link className="h-btn" href="/vende-rapido">Ir a Vende rápido</Link><Link className="h-btn" href="/vende-rapido/valoracion">Pedir valoración orientativa</Link>
          <a className="h-btn primary" target="_blank" rel="noreferrer" href={waLink(PLATFORM_SUPPORT_WHATSAPP, `Hola, quiero hablar de la venta de «${done.p.name}» (${done.p.city}). Plazo: ${SALE_TIMELINES[done.x.timeline]}.`)}><MessageCircle size={18} aria-hidden /> Hablar por WhatsApp</a>
        </div>
        <Notice>{SALE_NOTICE}</Notice><button className="h-btn quiet" onClick={() => setDone(null)}>Volver</button>
      </div>
    </Page>
  )
  return (
    <Page title="Vender" intro="Punto de entrada: cuéntanos qué piso quieres vender. La venta completa es otra fase.">
      <Notice>{SALE_NOTICE}</Notice>
      {own.length === 0 ? <div style={{ marginTop: '1rem' }}><Empty title="No hay pisos propios" hint="Solo el propietario de un piso puede ofrecerlo en venta." /></div> : (
        <div style={{ display: 'grid', gap: '1rem', marginTop: '1.25rem' }}>
          {own.map(p => (
            <section key={p.id} className="h-panel"><div className="flex flex-wrap justify-between gap-2 items-center"><div><h2>{p.name}</h2><p className="muted small">{p.city}</p></div>
              <button className="h-btn" aria-expanded={open === p.id} onClick={() => setOpen(open === p.id ? null : p.id)}>Quiero vender este inmueble</button></div>
              {open === p.id && <Form p={p} onDone={x => setDone({ p, x })} />}
              {d.saleInterests.filter(x => x.property_id === p.id).map(x => <div className="h-row" key={x.id}><span className="small">{SALE_TIMELINES[x.timeline]} · {x.desired_price_cents ? eur(x.desired_price_cents) : 'sin precio'} · {fmtDate(x.created_at)}</span><Badge tone={x.status === 'new' ? 'info' : 'neutral'}>{x.status === 'new' ? 'Nuevo' : x.status === 'contacted' ? 'Contactado' : 'Cerrado'}</Badge></div>)}
            </section>
          ))}
        </div>
      )}
    </Page>
  )
}
