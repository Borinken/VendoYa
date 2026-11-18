'use client'
import { useState } from 'react'
import { useHab } from '../HabProvider'
import { Loading, useSnap } from '../shared'
import { Badge, Check, Disclosure, Empty, Notice, Page, SelectField, TextField, eur, toCents } from '../ui'
import { rentCap } from '@/lib/hab/rent-cap'
import { roomInput, propertyInput, type Property, type RoomIncludes, type RoomStatus } from '@/lib/hab/types'

const STATUS: Record<RoomStatus, string> = { free: 'Libre', occupied: 'Ocupada', reserved: 'Reservada', maintenance: 'En mantenimiento' }
const TONE = { free: 'info', occupied: 'ok', reserved: 'warn', maintenance: 'bad' } as const
const INC: [keyof RoomIncludes, string][] = [['utilities', 'Suministros incluidos'], ['furniture', 'Mobiliario'], ['private_bath', 'Baño propio'], ['window', 'Ventana exterior'], ['lock', 'Cerradura propia']]

function NewProperty() {
  const { repo, act } = useHab()
  const [v, setV] = useState({ name: '', address: '', city: 'Antequera', province: 'Málaga', community: 'Andalucía', whole: '', tensioned: false, mode: 'rooms' as 'rooms' | 'whole', m2: '' })
  const [err, setErr] = useState<Record<string, string>>({})
  const set = (k: keyof typeof v) => (x: string | boolean) => setV(s => ({ ...s, [k]: x }))
  async function save(e: React.FormEvent) {
    e.preventDefault()
    const r = propertyInput.safeParse({ name: v.name, address: v.address, city: v.city, province: v.province, community: v.community, tensioned_zone: v.tensioned, whole_flat_rent_cents: v.whole ? toCents(v.whole) : null, rental_mode: v.mode, whole_size_m2: v.mode === 'whole' && v.m2 ? Number(v.m2) : undefined })
    if (!r.success) { setErr(Object.fromEntries(r.error.issues.map(i => [String(i.path[0]), i.message]))); return }
    setErr({})
    if (await act(() => repo.createProperty(r.data), 'Piso creado')) setV(s => ({ ...s, name: '', address: '', whole: '' }))
  }
  return (
    <form onSubmit={save} noValidate style={{ display: 'grid', gap: '1rem' }}>
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}><legend className="muted small" style={{ marginBottom: '.4rem' }}>¿Lo alquilas por habitaciones o entero?</legend>
        <div className="flex flex-wrap gap-x-6">{([['rooms', 'Por habitaciones'], ['whole', 'Piso entero']] as const).map(([k, l]) => (
          <label key={k} className="h-check"><input type="radio" name="rental_mode" checked={v.mode === k} onChange={() => setV(s => ({ ...s, mode: k }))} />{l}</label>))}</div></fieldset>
      <div className="h-grid">
        <TextField label="Nombre corto" value={v.name} onChange={set('name')} error={err.name} required placeholder="Lucena 5, 1ºB" />
        <TextField label="Dirección completa" value={v.address} onChange={set('address')} error={err.address} required />
        <TextField label="Ciudad" value={v.city} onChange={set('city')} error={err.city} required />
        <TextField label="Provincia" value={v.province} onChange={set('province')} error={err.province} required />
        <TextField label="Comunidad autónoma" value={v.community} onChange={set('community')} error={err.community} required hint="Define la nota sobre la fianza" />
        <TextField label="Renta del piso entero (€/mes)" type="number" value={v.whole} onChange={set('whole')} error={err.whole_flat_rent_cents} required={v.mode === 'whole'} hint={v.mode === 'whole' ? 'Es la renta del contrato' : 'Para el aviso de tope de renta'} />
        {v.mode === 'whole' && <TextField label="Metros cuadrados del piso" type="number" value={v.m2} onChange={set('m2')} />}
      </div>
      <Check label="Zona de mercado residencial tensionado" checked={v.tensioned} onChange={set('tensioned')} />
      <button className="h-btn primary" style={{ width: 'fit-content' }} type="submit">Crear piso</button>
    </form>
  )
}

function RoomForm({ p }: { p: Property }) {
  const { repo, act } = useHab()
  const [v, setV] = useState({ label: '', size: '', rent: '', deposit: '' }); const [inc, setInc] = useState<RoomIncludes>({ utilities: false, furniture: true, private_bath: false, window: true, lock: true })
  const [err, setErr] = useState<Record<string, string>>({})
  async function save(e: React.FormEvent) {
    e.preventDefault()
    const r = roomInput.safeParse({ property_id: p.id, label: v.label, size_m2: Number(v.size), rent_cents: toCents(v.rent), deposit_cents: toCents(v.deposit || v.rent), includes: inc, status: 'free' })
    if (!r.success) { setErr(Object.fromEntries(r.error.issues.map(i => [String(i.path[0]), i.message]))); return }
    setErr({}); if (await act(() => repo.createRoom(r.data), 'Habitación añadida')) setV({ label: '', size: '', rent: '', deposit: '' })
  }
  return (
    <form onSubmit={save} noValidate style={{ display: 'grid', gap: '.75rem' }}>
      <div className="h-grid">
        <TextField label="Nombre de la habitación" value={v.label} onChange={x => setV(s => ({ ...s, label: x }))} error={err.label} required />
        <TextField label="Metros cuadrados" type="number" value={v.size} onChange={x => setV(s => ({ ...s, size: x }))} error={err.size_m2} required />
        <TextField label="Renta (€/mes)" type="number" value={v.rent} onChange={x => setV(s => ({ ...s, rent: x }))} error={err.rent_cents} required />
        <TextField label="Fianza (€)" type="number" value={v.deposit} onChange={x => setV(s => ({ ...s, deposit: x }))} hint="Por defecto, una mensualidad" />
      </div>
      <fieldset style={{ border: 0, padding: 0 }}><legend className="muted small">Lo que incluye</legend>
        <div className="flex flex-wrap gap-x-5">{INC.map(([k, l]) => <Check key={k} label={l} checked={inc[k]} onChange={x => setInc(s => ({ ...s, [k]: x }))} />)}</div></fieldset>
      <button className="h-btn primary sm" style={{ width: 'fit-content' }}>Añadir habitación</button>
    </form>
  )
}

export function Pisos() {
  const d = useSnap(); const { repo, act, session } = useHab()
  const [rule, setRule] = useState<Record<string, string>>({}); const [dup, setDup] = useState<Record<string, string>>({})
  if (!d) return <Loading />
  const canCreate = session.kind !== 'subtenant' && session.role !== 'viewer'
  return (
    <Page title="Pisos y habitaciones" intro="Da de alta cada piso, sus habitaciones, lo que incluye cada una y las reglas de la casa.">
      {canCreate && <Disclosure summary="Nuevo piso" open={d.properties.length === 0}><NewProperty /></Disclosure>}
      {d.properties.length === 0 && !canCreate && <Empty title="Sin pisos visibles" hint="Cuando el propietario te dé un permiso, el piso aparecerá aquí." />}
      <div style={{ display: 'grid', gap: '1.25rem', marginTop: '1.25rem' }}>
        {d.properties.map(p => {
          const rooms = d.rooms.filter(r => r.property_id === p.id)
          const isWhole = p.rental_mode === 'whole'
          const cap = rentCap({ wholeFlatRentCents: isWhole ? null : p.whole_flat_rent_cents, sublet: isWhole ? [] : d.access.filter(a => a.property_id === p.id && a.kind === 'sublet' && a.status === 'granted'), roomRentsCents: isWhole ? [] : rooms.map(r => r.rent_cents) })
          const own = p.org_id === session.orgId
          return (
            <section key={p.id} className="h-panel" aria-labelledby={`p-${p.id}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><h2 id={`p-${p.id}`}>{p.name}</h2><p className="muted small">{p.address}, {p.city} ({p.province})</p></div>
                {isWhole && <Badge tone="info">Piso entero</Badge>}
                {cap.capCents !== null && <Badge tone={cap.exceeded ? 'warn' : 'ok'}>{eur(cap.totalCents)} de {eur(cap.capCents)}</Badge>}
              </div>
              {cap.exceeded && <div style={{ margin: '.75rem 0' }}><Notice>La suma de las rentas de las habitaciones supera el tope ({eur(cap.overCents)} de más). Es un aviso, no un bloqueo; consúltalo con tu abogado.</Notice></div>}
              <div style={{ marginTop: '.75rem' }}>
                {rooms.length === 0 && <p className="muted">Este piso aún no tiene {isWhole ? 'unidad' : 'habitaciones'}.</p>}
                {rooms.map(r => (
                  <div className="h-row" key={r.id}>
                    <span><strong>{r.label}</strong> <span className="muted small">· {r.size_m2} m² · {eur(r.rent_cents)}/mes · fianza {eur(r.deposit_cents)}</span>
                      <br /><span className="muted small">{INC.filter(([k]) => r.includes[k]).map(([, l]) => l).join(' · ') || 'Sin extras marcados'}</span></span>
                    <span className="flex items-center gap-2"><Badge tone={TONE[r.status]}>{STATUS[r.status]}</Badge>
                      {session.role !== 'viewer' && <select className="h-select" style={{ width: 150, minHeight: 36 }} aria-label={`Estado de ${r.label}`} value={r.status} onChange={e => act(() => repo.updateRoom(r.id, { status: e.target.value as RoomStatus }), 'Estado actualizado')}>
                        {Object.entries(STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gap: '.75rem', marginTop: '1rem' }}>
                <Disclosure summary="Reglas de la casa">
                  {p.rules.length === 0 ? <p className="muted">Aún no hay reglas.</p> : <ul style={{ paddingLeft: '1.2rem', margin: '0 0 .75rem' }}>{p.rules.map(x => <li key={x}>{x}</li>)}</ul>}
                  {own && <form className="flex flex-wrap gap-2 items-end" onSubmit={e => { e.preventDefault(); const t = (rule[p.id] ?? '').trim(); if (t) void act(() => repo.updateProperty(p.id, { rules: [...p.rules, t] }), 'Regla añadida').then(() => setRule(s => ({ ...s, [p.id]: '' }))) }}>
                    <div style={{ flex: 1 }}><TextField label="Nueva regla" value={rule[p.id] ?? ''} onChange={x => setRule(s => ({ ...s, [p.id]: x }))} /></div><button className="h-btn sm">Añadir</button></form>}
                </Disclosure>
                {session.role !== 'viewer' && !isWhole && <Disclosure summary="Añadir habitación"><RoomForm p={p} /></Disclosure>}
                {session.role !== 'viewer' && !isWhole && d.properties.length > 1 && (
                  <Disclosure summary="Duplicar configuración de habitaciones desde otro piso">
                    <div className="flex flex-wrap gap-2 items-end"><div style={{ flex: 1 }}><SelectField label="Copiar habitaciones de" value={dup[p.id] ?? ''} onChange={x => setDup(s => ({ ...s, [p.id]: x }))}
                      options={[['', 'Elige un piso'], ...d.properties.filter(o => o.id !== p.id).map(o => [o.id, o.name] as [string, string])]} /></div>
                      <button className="h-btn sm" disabled={!dup[p.id]} onClick={() => act(() => repo.duplicateRooms(dup[p.id], p.id).then(n => { if (!n) throw new Error('Ese piso no tiene habitaciones') }), 'Habitaciones copiadas')}>Copiar</button></div>
                    <p className="muted small" style={{ marginTop: '.5rem' }}>Se copian tamaño, renta y lo que incluye; quedan como libres.</p>
                  </Disclosure>
                )}
              </div>
            </section>
          )
        })}
      </div>
    </Page>
  )
}
