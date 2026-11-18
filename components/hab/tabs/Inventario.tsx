'use client'
import { useState } from 'react'
import { useHab } from '../HabProvider'
import { Loading, PhotoPicker, Thumb, useSnap } from '../shared'
import { Badge, Disclosure, Empty, Page, SelectField, TextField, fmtDate } from '../ui'
import { todayStr } from '@/lib/hab/alerts'
import { roomLabel } from '@/lib/hab/reports'
import { inventoryInput, type ItemCondition } from '@/lib/hab/types'

const COND: Record<ItemCondition, string> = { ok: 'En buen estado', worn: 'Desgastado', damaged: 'Dañado' }
const TONE = { ok: 'ok', worn: 'warn', damaged: 'bad' } as const
const BASE = ['Cama y colchón', 'Armario', 'Escritorio y silla', 'Ventana y persiana', 'Cerradura y llaves']

export function Inventario() {
  const d = useSnap(); const { repo, act, session } = useHab()
  const [room, setRoom] = useState(''); const [kind, setKind] = useState<'entry' | 'exit'>('entry'); const [notes, setNotes] = useState('')
  const [items, setItems] = useState(BASE.map(item => ({ item, condition: 'ok' as ItemCondition, note: '', photo_paths: [] as string[] })))
  const [err, setErr] = useState('')
  if (!d) return <Loading />
  const canWrite = session.role !== 'viewer' && session.kind !== 'tenant'
  async function save(e: React.FormEvent) {
    e.preventDefault()
    const contract = d!.contracts.find(c => c.room_id === room && c.status !== 'ended')
    const r = inventoryInput.safeParse({ room_id: room, contract_id: contract?.id ?? null, kind, taken_at: todayStr(), notes, items })
    if (!r.success) { setErr(r.error.issues[0].message); return }
    setErr(''); await act(() => repo.createInventory(r.data), 'Inventario guardado')
  }
  const upd = (i: number, patch: Partial<(typeof items)[number]>) => setItems(s => s.map((x, n) => (n === i ? { ...x, ...patch } : x)))
  return (
    <Page title="Inventario" intro="Entrada y salida por habitación: cada elemento con su estado y fotos con fecha.">
      {canWrite && d.rooms.length > 0 && (
        <Disclosure summary="Nuevo inventario">
          <form onSubmit={save} noValidate style={{ display: 'grid', gap: '1rem' }}>
            <div className="h-grid">
              <SelectField label="Habitación" value={room} onChange={setRoom} options={[['', 'Elige una habitación'], ...d.rooms.map(r => [r.id, roomLabel(d, r.id)] as [string, string])]} />
              <SelectField label="Tipo" value={kind} onChange={setKind} options={[['entry', 'Entrada'], ['exit', 'Salida']]} />
            </div>
            {items.map((it, i) => (
              <div key={i} className="h-panel" style={{ display: 'grid', gap: '.6rem' }}>
                <div className="h-grid"><TextField label="Elemento" value={it.item} onChange={x => upd(i, { item: x })} />
                  <SelectField label="Estado" value={it.condition} onChange={x => upd(i, { condition: x })} options={Object.entries(COND) as [ItemCondition, string][]} />
                  <TextField label="Nota" value={it.note} onChange={x => upd(i, { note: x })} /></div>
                <PhotoPicker paths={it.photo_paths} onChange={p => upd(i, { photo_paths: p })} max={4} label="Foto del elemento" />
              </div>
            ))}
            <button type="button" className="h-btn sm" style={{ width: 'fit-content' }} onClick={() => setItems(s => [...s, { item: '', condition: 'ok', note: '', photo_paths: [] }])}>Añadir elemento</button>
            <TextField label="Observaciones" value={notes} onChange={setNotes} />
            {err && <p role="alert" style={{ color: 'var(--h-bad)' }}>{err}</p>}
            <button className="h-btn primary" disabled={!room} style={{ width: 'fit-content' }}>Guardar inventario</button>
          </form>
        </Disclosure>
      )}
      {d.inventories.length === 0 ? <div style={{ marginTop: '1rem' }}><Empty title="Sin inventarios" hint="Haz el inventario de entrada al dar las llaves: te protege a ti y al inquilino." /></div> : (
        <div style={{ display: 'grid', gap: '1rem', marginTop: '1.25rem' }}>
          {d.inventories.map(inv => (
            <section key={inv.id} className="h-panel">
              <div className="flex justify-between flex-wrap gap-2"><h2>{roomLabel(d, inv.room_id)}</h2><span className="muted small">{inv.kind === 'entry' ? 'Entrada' : 'Salida'} · {fmtDate(inv.taken_at)}</span></div>
              {d.inventoryItems.filter(x => x.inventory_id === inv.id).map(x => (
                <div className="h-row" key={x.id}><span>{x.item}{x.note && <span className="muted small"> — {x.note}</span>}<span className="flex gap-1 flex-wrap mt-1">{x.photo_paths.map(p => <Thumb key={p} path={p} />)}</span></span><Badge tone={TONE[x.condition]}>{COND[x.condition]}</Badge></div>
              ))}
            </section>
          ))}
        </div>
      )}
    </Page>
  )
}
