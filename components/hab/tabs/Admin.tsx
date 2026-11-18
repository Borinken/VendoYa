'use client'
import { useCallback, useEffect, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { useHab } from '../HabProvider'
import { Loading } from '../shared'
import { Badge, Empty, Page, SelectField, Table, eur, fmtDate } from '../ui'
import { PLATFORM_SUPPORT_DISPLAY } from '@/lib/hab/config'
import { waLink } from '@/lib/hab/whatsapp'
import { SALE_TIMELINES, type PlatformOverview, type SupportTicket } from '@/lib/hab/types'

// Solo números y tickets: ningún dato personal de inquilinos ni contenido de contratos.
export function Admin() {
  const { repo, act } = useHab(); const [o, setO] = useState<PlatformOverview | null>(null); const [err, setErr] = useState('')
  const load = useCallback(() => repo.adminOverview().then(setO).catch(e => setErr(e instanceof Error ? e.message : 'Error')), [repo])
  useEffect(() => { void load() }, [load])
  if (err) return <Page title="Plataforma"><p role="alert" style={{ color: 'var(--h-bad)' }}>{err}</p></Page>
  if (!o) return <Loading />
  const stats: [string, number][] = [['Organizaciones', o.counts.orgs], ['Pisos', o.counts.properties], ['Habitaciones', o.counts.rooms], ['Contratos', o.counts.contracts], ['Intereses de venta nuevos', o.counts.sale_interests_new]]
  const setStatus = (t: SupportTicket, s: SupportTicket['status']) => act(() => repo.adminSetTicketStatus(t.id, s).then(load), 'Ticket actualizado')
  return (
    <Page title="Plataforma" intro="Vista de administrador: tickets de todas las organizaciones y recuentos. Sin datos personales.">
      <div className="h-grid">{stats.map(([l, n]) => <div className="h-stat" key={l}><b>{n}</b><span>{l}</span></div>)}</div>
      <section className="h-section"><h2>Tickets de soporte</h2>
        {o.tickets.length === 0 ? <Empty title="Sin tickets" hint="Cuando alguien abra uno, aparecerá aquí." /> : (
          <Table rows={o.tickets} rowKey={t => t.id} cols={[
            { label: 'Nº', render: t => `#${t.number}` }, { label: 'Organización', render: t => (t.org_id && o.orgNames[t.org_id]) || '—' },
            { label: 'Asunto', render: t => <span>{t.category}: {t.subject}<br /><span className="muted small">{fmtDate(t.created_at)}</span></span> },
            { label: 'Estado', render: t => <SelectField label="Estado" value={t.status} onChange={s => setStatus(t, s)} options={[['open', 'Abierto'], ['answered', 'Respondido'], ['closed', 'Cerrado']]} /> },
            { label: 'WhatsApp', render: t => t.contact_phone
              ? <a className="h-btn sm" target="_blank" rel="noreferrer" href={waLink(t.contact_phone, `Hola, te escribo sobre tu ticket #${t.number}: ${t.subject}`)}><MessageCircle size={16} aria-hidden /> Abrir</a>
              : <span className="muted small">Sin teléfono · {PLATFORM_SUPPORT_DISPLAY}</span> },
          ]} />
        )}</section>
      <section className="h-section"><h2>Intereses de venta</h2>
        {o.saleInterests.length === 0 ? <p className="muted" style={{ marginTop: '.5rem' }}>Ninguno.</p> : o.saleInterests.map(x => (
          <div className="h-row" key={x.id}><span>{o.orgNames[x.org_id] ?? 'Organización'} · {SALE_TIMELINES[x.timeline]} · {x.desired_price_cents ? eur(x.desired_price_cents) : 'sin precio'}{x.has_tenants ? ' · con inquilinos' : ''}</span>
            <span className="flex gap-2 items-center"><Badge tone={x.status === 'new' ? 'info' : 'neutral'}>{x.status === 'new' ? 'Nuevo' : x.status === 'contacted' ? 'Contactado' : 'Cerrado'}</Badge>
              {x.status === 'new' && <button className="h-btn sm" onClick={() => act(() => repo.adminSetSaleStatus(x.id, 'contacted').then(load), 'Marcado como contactado')}>Marcar contactado</button>}</span></div>
        ))}</section>
    </Page>
  )
}
