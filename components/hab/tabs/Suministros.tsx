'use client'
import { useState } from 'react'
import { useHab } from '../HabProvider'
import { Loading, useSnap } from '../shared'
import { Disclosure, Empty, Page, SelectField, Table, TextField, eur, toCents } from '../ui'
import { utilityInput, type SplitRule } from '@/lib/hab/types'
import { format } from 'date-fns'

const RULE: Record<SplitRule, string> = { equal: 'A partes iguales', by_m2: 'Por metros cuadrados', by_rent: 'Proporcional a la renta' }

export function Suministros() {
  const d = useSnap(); const { repo, act, session, notify } = useHab()
  const [v, setV] = useState({ property_id: '', kind: 'Electricidad', period: format(new Date(), 'yyyy-MM'), total: '', rule: 'equal' as SplitRule }); const [invoice, setInvoice] = useState<string | null>(null); const [err, setErr] = useState<Record<string, string>>({})
  if (!d) return <Loading />
  async function save(e: React.FormEvent) {
    e.preventDefault(); const r = utilityInput.safeParse({ property_id: v.property_id, kind: v.kind, period: v.period, total_cents: toCents(v.total), split_rule: v.rule, invoice_path: invoice })
    if (!r.success) { setErr(Object.fromEntries(r.error.issues.map(i => [String(i.path[0]), i.message]))); return }
    setErr({}); if (await act(() => repo.createUtility(r.data), 'Factura repartida')) { setV(s => ({ ...s, total: '' })); setInvoice(null) }
  }
  return (
    <Page title="Suministros" intro="Sube la factura, elige cómo se reparte entre las habitaciones y guarda el historial.">
      {session.role !== 'viewer' && d.properties.length > 0 && <Disclosure summary="Nueva factura">
        <form onSubmit={save} noValidate style={{ display: 'grid', gap: '1rem' }}>
          <div className="h-grid">
            <SelectField label="Piso" value={v.property_id} onChange={x => setV(s => ({ ...s, property_id: x }))} options={[['', 'Elige un piso'], ...d.properties.map(p => [p.id, p.name] as [string, string])]} />
            <TextField label="Suministro" value={v.kind} onChange={x => setV(s => ({ ...s, kind: x }))} error={err.kind} required />
            <TextField label="Periodo (AAAA-MM)" value={v.period} onChange={x => setV(s => ({ ...s, period: x }))} error={err.period} required />
            <TextField label="Importe total (€)" type="number" value={v.total} onChange={x => setV(s => ({ ...s, total: x }))} error={err.total_cents} required />
            <SelectField label="Reparto" value={v.rule} onChange={x => setV(s => ({ ...s, rule: x }))} options={Object.entries(RULE) as [SplitRule, string][]} />
          </div>
          <label className="h-field"><span>Factura (PDF o imagen, máx. 10 MB)</span><input className="h-input" type="file" accept="application/pdf,image/jpeg,image/png"
            onChange={async e => { const f = e.target.files?.[0]; if (!f) return; try { setInvoice(await repo.upload('hab-docs', f)); notify('Factura subida') } catch (x) { notify(x instanceof Error ? x.message : 'Error', 'bad') } }} /></label>
          {err.property_id && <p role="alert" style={{ color: 'var(--h-bad)' }}>{err.property_id}</p>}
          <button className="h-btn primary" style={{ width: 'fit-content' }}>Repartir factura</button>
        </form></Disclosure>}
      {d.utilities.length === 0 ? <div style={{ marginTop: '1rem' }}><Empty title="Sin facturas" hint="Cuando subas la primera, verás aquí cuánto toca pagar a cada habitación." /></div> : (
        <div style={{ display: 'grid', gap: '1rem', marginTop: '1.25rem' }}>
          {[...d.utilities].sort((a, b) => b.period.localeCompare(a.period)).map(u => (
            <section key={u.id} className="h-panel"><div className="flex justify-between flex-wrap gap-2"><h2>{u.kind} · {u.period}</h2><span><strong>{eur(u.total_cents)}</strong> <span className="muted small">{RULE[u.split_rule]}</span></span></div>
              <p className="muted small">{d.properties.find(p => p.id === u.property_id)?.name}</p>
              <Table rowKey={s => s.room_id} rows={d.shares.filter(s => s.utility_id === u.id)} cols={[
                { label: 'Habitación', render: s => d.rooms.find(r => r.id === s.room_id)?.label ?? '' }, { label: 'Le toca', render: s => eur(s.amount_cents) }]} />
            </section>
          ))}
        </div>
      )}
    </Page>
  )
}
