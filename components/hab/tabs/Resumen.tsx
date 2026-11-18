'use client'
import Link from 'next/link'
import { addDays, format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { useHab } from '../HabProvider'
import { Loading, useSnap } from '../shared'
import { Art, Badge, Empty, Notice, Page, eur, fmtDate } from '../ui'
import { computeAlerts, todayStr } from '@/lib/hab/alerts'
import { delinquents, monthIncome, occupancy, contractTitle } from '@/lib/hab/reports'
import { LEGAL_NOTICE } from '@/lib/hab/catalog'

export function Resumen() {
  const d = useSnap(); const { session } = useHab()
  if (!d) return <Loading />
  const today = todayStr(); const occ = occupancy(d)
  const inc = monthIncome(d, today.slice(0, 7)); const late = delinquents(d, today)
  const in60 = format(addDays(parseISO(today), 60), 'yyyy-MM-dd')
  const ending = d.contracts.filter(c => c.status === 'active' && c.ends_on >= today && c.ends_on <= in60)
  const open = d.incidents.filter(i => i.status !== 'resolved')
  const alerts = computeAlerts({ today, ...d })
  const capAlerts = alerts.filter(a => a.kind === 'rent_cap')
  const in90 = format(addDays(parseISO(today), 90), 'yyyy-MM-dd')
  const sellHints = session.kind === 'subtenant' ? [] : d.properties.filter(p => p.org_id === session.orgId).filter(p => {
    const cs = d.contracts.filter(c => c.status === 'active' && d.rooms.find(r => r.id === c.room_id)?.property_id === p.id)
    return cs.length > 0 && cs.every(c => c.ends_on <= in90)
  })
  const pendingSign = d.contracts.filter(c => c.status === 'pending_signature').length
  const toReview = d.applications.filter(a => a.status === 'submitted' || a.status === 'in_review').length
  const tasks = [
    { n: late.length, urgent: true, title: `${late.length === 1 ? 'Cobro atrasado' : 'Cobros atrasados'} · ${eur(late.reduce((a, l) => a + l.cents, 0))}`, none: 'Sin cobros atrasados', detail: 'Reclama el pago o márcalo como pagado.', cta: 'Ver cobros', href: '/habitaciones/app/cobros' },
    { n: pendingSign, title: pendingSign === 1 ? 'Contrato pendiente de firma' : 'Contratos pendientes de firma', none: 'Sin firmas pendientes', detail: 'Envía el enlace o sube el firmado.', cta: 'Ver contratos', href: '/habitaciones/app/contratos' },
    { n: open.length, title: open.length === 1 ? 'Incidencia abierta' : 'Incidencias abiertas', none: 'Sin incidencias abiertas', detail: 'Añade una nota o cambia el estado.', cta: 'Atender', href: '/habitaciones/app/incidencias' },
    { n: toReview, title: toReview === 1 ? 'Candidato por revisar' : 'Candidatos por revisar', none: 'Sin candidatos por revisar', detail: 'Mismos criterios para todos.', cta: 'Revisar', href: '/habitaciones/app/candidatos' },
  ]
  if (!d.properties.length) return (
    <Page title={`Hola, ${session.name}`}>
      <Empty title="Aún no hay pisos" hint="Empieza dando de alta tu primer piso y sus habitaciones. En unos minutos tendrás cobros, contratos e incidencias bajo control." action={<Link className="h-btn primary" href="/habitaciones/app/pisos">Crear mi primer piso</Link>} />
    </Page>
  )
  return (
    <Page title="Resumen" intro={LEGAL_NOTICE}>
      <section aria-labelledby="hoy">
        <div className="h-hero"><div>
        <p className="h-eyebrow">{format(parseISO(today), "EEEE d 'de' MMMM", { locale: es })}</p>
        <h2 id="hoy" style={{ fontSize: '1.7rem', margin: '.2rem 0 1.25rem' }}>{tasks.some(t => t.n > 0) ? 'Qué toca hoy' : 'Hoy no tienes nada pendiente'}</h2></div><Art /></div>
        <div className="h-today">
          {tasks.map(t => (
            <div key={t.title} className={`h-task${t.n === 0 ? ' zero' : ''}${t.urgent && t.n > 0 ? ' urgent' : ''}`}>
              <span className="n" aria-hidden>{t.n}</span>
              <span className="t">{t.n === 0 ? t.none : t.title}</span>
              <span className="d">{t.n === 0 ? 'Al día' : t.detail}</span>
              <Link className="h-btn primary go" href={t.href}>{t.cta}</Link>
            </div>
          ))}
        </div>
      </section>
      <div className="h-figures" style={{ margin: '2.5rem 0' }}>
        <div className="h-figure"><b>{occ.pct}%</b><span>Ocupación: {occ.occupied} de {occ.total} habitaciones</span><div className="h-bar" aria-hidden><i style={{ width: `${occ.pct}%` }} /></div></div>
        <div className="h-figure"><b>{eur(inc.collected)}</b><span>Cobrado este mes de {eur(inc.expected)} previstos</span><div className="h-bar" aria-hidden><i style={{ width: `${inc.expected ? Math.round((inc.collected / inc.expected) * 100) : 0}%` }} /></div></div>
      </div>
      {capAlerts.map(a => <div key={a.key} style={{ marginBottom: '.75rem' }}><Notice>{a.title}. {a.detail}</Notice></div>)}
      {sellHints.map(p => (
        <div key={p.id} style={{ marginBottom: '.75rem' }}><Notice>Todos los contratos de «{p.name}» terminan en los próximos 90 días. ¿Vender o volver a alquilar? <Link href="/habitaciones/app/vender">Ver opciones</Link></Notice></div>
      ))}
      <div className="h-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', marginTop: '1.5rem', gap: '2.5rem' }}>
        <section><h2>Avisos</h2>
          {alerts.length === 0 ? <p className="muted" style={{ marginTop: '.5rem' }}>Todo al día. No hay avisos.</p> : alerts.slice(0, 5).map(a => (
            <div className="h-row" key={a.key}><span><strong>{a.title}</strong><br /><span className="muted small">{a.detail}</span></span><Badge tone={a.level === 'danger' ? 'bad' : a.level === 'warn' ? 'warn' : 'info'}>{fmtDate(a.due_on)}</Badge></div>
          ))}
          {alerts.length > 5 && <Link href="/habitaciones/app/avisos" className="small">Ver los {alerts.length} avisos</Link>}
        </section>
        <section><h2>Contratos que vencen (60 días)</h2>
          {ending.length === 0 ? <p className="muted" style={{ marginTop: '.5rem' }}>Ninguno por ahora.</p> : ending.map(c => (
            <div className="h-row" key={c.id}><span>{contractTitle(d, c.id)}</span><Badge tone="warn">{fmtDate(c.ends_on)}</Badge></div>
          ))}
        </section>
      </div>
    </Page>
  )
}
