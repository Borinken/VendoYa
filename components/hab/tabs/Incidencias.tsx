'use client'
import { useState } from 'react'
import { useHab } from '../HabProvider'
import { Loading, PhotoPicker, Thumb, useSnap } from '../shared'
import { Badge, Disclosure, Empty, Notice, Page, SelectField, Segmented, TextField, fmtDate } from '../ui'
import { incidentInput, type IncidentStatus, type Severity } from '@/lib/hab/types'

const ST: Record<IncidentStatus, string> = { open: 'Abierta', seen: 'Vista', in_progress: 'En curso', resolved: 'Resuelta' }
const ST_TONE = { open: 'bad', seen: 'info', in_progress: 'warn', resolved: 'ok' } as const
const SEV: Record<Severity, string> = { low: 'Baja', medium: 'Media', high: 'Alta' }

export function Incidencias() {
  const d = useSnap(); const { repo, act, session } = useHab()
  const [v, setV] = useState({ property_id: '', room_id: '', title: '', description: '', severity: 'medium' as Severity }); const [photos, setPhotos] = useState<string[]>([]); const [err, setErr] = useState<Record<string, string>>({})
  const [note, setNote] = useState<Record<string, string>>({}); const [filter, setFilter] = useState<'open' | 'all'>('open')
  if (!d) return <Loading />
  const canWrite = session.role !== 'viewer'
  async function save(e: React.FormEvent) {
    e.preventDefault(); const r = incidentInput.safeParse({ ...v, room_id: v.room_id || null, photo_paths: photos })
    if (!r.success) { setErr(Object.fromEntries(r.error.issues.map(i => [String(i.path[0]), i.message]))); return }
    setErr({}); if (await act(() => repo.createIncident(r.data), 'Incidencia registrada')) { setV(s => ({ ...s, title: '', description: '' })); setPhotos([]) }
  }
  const list = d.incidents.filter(i => filter === 'all' || i.status !== 'resolved').sort((a, b) => b.created_at.localeCompare(a.created_at))
  return (
    <Page title="Incidencias" intro="Registro privado de tu organización: nunca se comparte con otras. Cada incidencia tiene su línea de tiempo.">
      {canWrite && d.properties.length > 0 && <Disclosure summary="Nueva incidencia">
        <form onSubmit={save} noValidate style={{ display: 'grid', gap: '1rem' }}>
          <div className="h-grid">
            <SelectField label="Piso" value={v.property_id} onChange={x => setV(s => ({ ...s, property_id: x, room_id: '' }))} options={[['', 'Elige un piso'], ...d.properties.map(p => [p.id, p.name] as [string, string])]} />
            <SelectField label="Habitación (opcional)" value={v.room_id} onChange={x => setV(s => ({ ...s, room_id: x }))} options={[['', 'Zona común'], ...d.rooms.filter(r => r.property_id === v.property_id).map(r => [r.id, r.label] as [string, string])]} />
            <SelectField label="Gravedad" value={v.severity} onChange={x => setV(s => ({ ...s, severity: x }))} options={Object.entries(SEV) as [Severity, string][]} />
          </div>
          <TextField label="Título" value={v.title} onChange={x => setV(s => ({ ...s, title: x }))} error={err.title} required />
          <label className="h-field"><span>Descripción</span><textarea className="h-textarea" value={v.description} onChange={e => setV(s => ({ ...s, description: e.target.value }))} /></label>
          <PhotoPicker paths={photos} onChange={setPhotos} max={6} />
          {err.property_id && <p role="alert" style={{ color: 'var(--h-bad)' }}>{err.property_id}</p>}
          <button className="h-btn primary" style={{ width: 'fit-content' }}>Registrar incidencia</button>
        </form></Disclosure>}
      <div style={{ margin: '1.5rem 0' }}><Segmented label="Mostrar incidencias" value={filter} onChange={setFilter} options={[['open', 'Abiertas'], ['all', 'Todas']]} /></div>
      {list.length === 0 ? <Empty title={filter === 'open' ? 'Ninguna abierta' : 'Sin incidencias'} hint="Cuando alguien avise de una avería, queja o sugerencia, aparecerá aquí con su historial." action={filter === 'open' && d.incidents.length > 0 ? <button className="h-btn" onClick={() => setFilter('all')}>Ver resueltas</button> : undefined} /> : (
        <div style={{ display: 'grid', gap: '1.25rem' }}>
          {list.map(i => {
            const evs = d.events.filter(e => e.incident_id === i.id).sort((a, b) => a.created_at.localeCompare(b.created_at))
            const tenant = d.tenants.find(t => t.id === i.tenant_id)
            return (
              <section key={i.id} className="h-panel">
                <div className="flex justify-between flex-wrap gap-2"><div><h2>{i.title}</h2><p className="muted small">{i.code} · {d.properties.find(p => p.id === i.property_id)?.name}{i.room_id ? ` · ${d.rooms.find(r => r.id === i.room_id)?.label}` : ''} · {fmtDate(i.created_at)}</p></div>
                  <span className="flex gap-2 items-start"><Badge tone={i.severity === 'high' ? 'bad' : i.severity === 'medium' ? 'warn' : 'neutral'}>{SEV[i.severity]}</Badge><Badge tone={ST_TONE[i.status]}>{ST[i.status]}</Badge></span></div>
                <p className="muted small" style={{ marginTop: '.4rem' }}>Abierta por: {i.reported_by === null && i.tenant_id ? `${tenant?.full_name ?? 'el inquilino'} (enlace personal)` : i.reported_by && tenant && i.reported_by === tenant.user_id ? `${tenant.full_name} (portal)` : 'tu equipo'}</p>
                {i.description && <p style={{ marginTop: '.5rem' }}>{i.description}</p>}
                {i.tenant_statement && <div style={{ marginTop: '.6rem' }}><Notice><strong>Versión del inquilino:</strong> {i.tenant_statement}</Notice></div>}
                {i.photo_paths.length > 0 && <div className="flex gap-2 flex-wrap" style={{ marginTop: '.6rem' }}>{i.photo_paths.map(p => <Thumb key={p} path={p} />)}</div>}
                <ol style={{ listStyle: 'none', padding: 0, margin: '1rem 0 0', borderLeft: '1px solid var(--h-line)' }} aria-label="Línea de tiempo">
                  {evs.map(e => <li key={e.id} style={{ padding: '0 0 .6rem .9rem' }}><span className="small">{e.note}</span> <span className="muted small">· {fmtDate(e.created_at)}{e.internal ? ' · interna' : ''}</span></li>)}
                </ol>
                {canWrite && (
                  <div className="flex flex-wrap gap-2 items-end" style={{ marginTop: '.5rem' }}>
                    <div style={{ flex: 1, minWidth: 200 }}><TextField label="Añadir nota" value={note[i.id] ?? ''} onChange={x => setNote(s => ({ ...s, [i.id]: x }))} /></div>
                    <button className="h-btn sm" onClick={() => { const t = (note[i.id] ?? '').trim(); if (t) void act(() => repo.addIncidentEvent(i.id, 'note', t, false), 'Nota añadida').then(() => setNote(s => ({ ...s, [i.id]: '' }))) }}>Añadir</button>
                    <div style={{ width: 170 }}><SelectField label="Estado" value={i.status} onChange={x => act(() => repo.setIncidentStatus(i.id, x), 'Estado actualizado')} options={Object.entries(ST) as [IncidentStatus, string][]} /></div>
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}
    </Page>
  )
}
