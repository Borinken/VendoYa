'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useHab } from '../HabProvider'
import { Loading, PhotoPicker, Thumb, useSnap } from '../shared'
import { Badge, Disclosure, Empty, Notice, Page, SelectField, Table, TextField, eur, fmtDate } from '../ui'
import { paymentStatus, todayStr } from '@/lib/hab/alerts'
import { incidentInput, type Severity } from '@/lib/hab/types'

// Vista reducida del inquilino: su contrato, inventario, cobros y avisar de una incidencia.
export function MiHabitacion() {
  const d = useSnap(); const { repo, act } = useHab()
  const [title, setTitle] = useState(''); const [desc, setDesc] = useState(''); const [photos, setPhotos] = useState<string[]>([]); const [err, setErr] = useState(''); const [sev, setSev] = useState<Severity>('medium')
  const [stmt, setStmt] = useState<Record<string, string>>({})
  if (!d) return <Loading />
  const c = d.contracts.find(x => x.status === 'active') ?? d.contracts[0]
  if (!c) return <Page title="Mi habitación"><Empty title="Aún no tienes contrato" hint="Cuando tu arrendador cree tu contrato, lo verás aquí." /></Page>
  const room = d.rooms.find(r => r.id === c.room_id); const prop = d.properties.find(p => p.id === room?.property_id)
  const inv = d.inventories.filter(i => i.contract_id === c.id); const pays = d.payments.filter(p => p.contract_id === c.id).sort((a, b) => a.due_on.localeCompare(b.due_on))
  const today = todayStr()
  async function send(e: React.FormEvent) {
    e.preventDefault(); const r = incidentInput.safeParse({ property_id: prop?.id ?? '', room_id: room?.id ?? null, title, description: desc, severity: sev, photo_paths: photos })
    if (!r.success) { setErr(r.error.issues[0].message); return }
    setErr(''); if (await act(() => repo.createIncident(r.data), 'Aviso enviado')) { setTitle(''); setDesc(''); setPhotos([]) }
  }
  return (
    <Page title="Mi habitación" intro={`${prop?.name ?? ''} · ${room?.label ?? ''}`}>
      <section className="h-panel"><h2>Mi contrato</h2>
        <div className="h-row"><span>Del {fmtDate(c.starts_on)} al {fmtDate(c.ends_on)}</span><Badge tone={c.status === 'active' ? 'ok' : 'warn'}>{c.status === 'active' ? 'Activo' : c.status === 'draft' ? 'Borrador' : c.status === 'ended' ? 'Terminado' : 'Pendiente de firma'}</Badge></div>
        <div className="h-row"><span>Renta mensual</span><strong>{eur(c.rent_cents)}</strong></div>
        <div className="h-row"><span>Fianza</span><strong>{eur(c.deposit_cents)}</strong></div>
        {prop && prop.rules.length > 0 && <><h3 style={{ marginTop: '1rem' }}>Reglas de la casa</h3><ul style={{ paddingLeft: '1.2rem' }}>{prop.rules.map(x => <li key={x}>{x}</li>)}</ul></>}
      </section>
      <section className="h-section"><h2>Mis cobros</h2>
        <Table rows={pays.slice(0, 24)} rowKey={p => p.id} cols={[{ label: 'Vence', render: p => fmtDate(p.due_on) }, { label: 'Importe', render: p => eur(p.amount_cents) },
          { label: 'Estado', render: p => { const s = paymentStatus(p, today); return <Badge tone={s === 'paid' ? 'ok' : s === 'late' ? 'bad' : 'info'}>{s === 'paid' ? 'Pagado' : s === 'late' ? 'Atrasado' : 'Pendiente'}</Badge> } }]} /></section>
      <section className="h-section"><h2>Mi inventario</h2>
        {inv.length === 0 ? <p className="muted" style={{ marginTop: '.5rem' }}>Aún no hay inventario.</p> : inv.map(i => <div key={i.id}><p className="muted small">{i.kind === 'entry' ? 'Entrada' : 'Salida'} · {fmtDate(i.taken_at)}</p>
          {d.inventoryItems.filter(x => x.inventory_id === i.id).map(x => <div className="h-row" key={x.id}><span>{x.item}<span className="flex gap-1 mt-1">{x.photo_paths.map(p => <Thumb key={p} path={p} />)}</span></span><Badge tone={x.condition === 'ok' ? 'ok' : x.condition === 'worn' ? 'warn' : 'bad'}>{x.condition === 'ok' ? 'Bien' : x.condition === 'worn' ? 'Desgastado' : 'Dañado'}</Badge></div>)}</div>)}</section>
      <section className="h-section"><h2>Avisar de una incidencia</h2>
        <Disclosure summary="Nuevo aviso con fotos">
          <form onSubmit={send} noValidate style={{ display: 'grid', gap: '1rem' }}>
            <TextField label="¿Qué pasa?" value={title} onChange={setTitle} required />
            <label className="h-field"><span>Cuéntanos más (tu versión)</span><textarea className="h-textarea" value={desc} onChange={e => setDesc(e.target.value)} /></label>
            <SelectField label="Urgencia" value={sev} onChange={setSev} options={[['low', 'Baja'], ['medium', 'Media'], ['high', 'Alta']]} />
            <PhotoPicker paths={photos} onChange={setPhotos} max={5} />
            {err && <p role="alert" style={{ color: 'var(--h-bad)' }}>{err}</p>}
            <button className="h-btn primary" style={{ width: 'fit-content' }}>Enviar aviso</button>
          </form></Disclosure>
        {d.incidents.map(i => (
          <div key={i.id} className="h-row" style={{ alignItems: 'flex-start' }}><span><strong>{i.title}</strong> <span className="muted small">· {i.code} · {fmtDate(i.created_at)}</span>
            {i.tenant_statement ? <p className="small muted">Tu versión: {i.tenant_statement}</p> : <span className="flex flex-wrap gap-2 items-end" style={{ marginTop: '.4rem' }}><input className="h-input" aria-label={`Tu versión de ${i.title}`} style={{ minHeight: 36 }} value={stmt[i.id] ?? ''} onChange={e => setStmt(s => ({ ...s, [i.id]: e.target.value }))} placeholder="Añade tu versión" /><button className="h-btn sm" onClick={() => act(() => repo.setTenantStatement(i.id, stmt[i.id] ?? ''), 'Versión guardada')}>Guardar</button></span>}</span>
            <Badge tone={i.status === 'resolved' ? 'ok' : 'warn'}>{i.status === 'resolved' ? 'Resuelta' : i.status === 'open' ? 'Abierta' : 'En curso'}</Badge></div>
        ))}
      </section>
      <div style={{ marginTop: '1.25rem' }}><Notice>¿Necesitas ayuda con la app? <Link href="/habitaciones/app/soporte">Abre un ticket de soporte</Link>.</Notice></div>
    </Page>
  )
}
