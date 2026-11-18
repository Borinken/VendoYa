import { addMonths, format, parseISO } from 'date-fns'
import { paymentStatus } from './alerts'
import type { Snapshot } from './types'

export const occupancy = (d: Snapshot) => {
  const total = d.rooms.length
  const occupied = d.rooms.filter(r => r.status === 'occupied').length
  return { total, occupied, pct: total ? Math.round((occupied / total) * 100) : 0 }
}

// Previsto = cuotas con vencimiento en el mes; cobrado = las pagadas de esas cuotas.
export function monthIncome(d: Snapshot, ym: string) {
  const ps = d.payments.filter(p => p.due_on.startsWith(ym))
  return { expected: ps.reduce((a, p) => a + p.amount_cents, 0), collected: ps.filter(p => p.paid_on).reduce((a, p) => a + p.amount_cents, 0) }
}

export function incomeSeries(d: Snapshot, today: string, months = 6) {
  const base = parseISO(today)
  return Array.from({ length: months }, (_, i) => {
    const ym = format(addMonths(base, i - (months - 1)), 'yyyy-MM')
    return { month: ym, ...monthIncome(d, ym) }
  })
}

export function delinquents(d: Snapshot, today: string) {
  const late = d.payments.filter(p => paymentStatus(p, today) === 'late')
  const byContract = new Map<string, { contractId: string; count: number; cents: number; oldest: string }>()
  for (const p of late) {
    const e = byContract.get(p.contract_id) ?? { contractId: p.contract_id, count: 0, cents: 0, oldest: p.due_on }
    e.count++; e.cents += p.amount_cents; if (p.due_on < e.oldest) e.oldest = p.due_on
    byContract.set(p.contract_id, e)
  }
  return Array.from(byContract.values()).sort((a, b) => b.cents - a.cents)
}

export const roomLabel = (d: Snapshot, roomId: string) => {
  const r = d.rooms.find(x => x.id === roomId); const p = d.properties.find(x => x.id === r?.property_id)
  return r ? `${p?.name ?? ''} · ${r.label}` : 'Habitación'
}
export const contractTitle = (d: Snapshot, contractId: string) => {
  const c = d.contracts.find(x => x.id === contractId)
  return c ? `${d.tenants.find(t => t.id === c.tenant_id)?.full_name ?? 'Inquilino'} — ${roomLabel(d, c.room_id)}` : 'Contrato'
}

export function incidentsByProperty(d: Snapshot) {
  return d.properties.map(p => ({ name: p.name.split(',')[0], total: d.incidents.filter(i => i.property_id === p.id).length, open: d.incidents.filter(i => i.property_id === p.id && i.status !== 'resolved').length }))
}

export function occupancyByProperty(d: Snapshot) {
  return d.properties.map(p => { const rs = d.rooms.filter(r => r.property_id === p.id); return { name: p.name.split(',')[0], pct: rs.length ? Math.round((rs.filter(r => r.status === 'occupied').length / rs.length) * 100) : 0 } })
}

export function yieldByProperty(d: Snapshot, year: string) {
  return d.properties.map(p => {
    const rooms = new Set(d.rooms.filter(r => r.property_id === p.id).map(r => r.id))
    const cs = new Set(d.contracts.filter(c => rooms.has(c.room_id)).map(c => c.id))
    const cents = d.payments.filter(x => cs.has(x.contract_id) && x.paid_on?.startsWith(year)).reduce((a, x) => a + x.amount_cents, 0)
    return { name: p.name.split(',')[0], cents }
  })
}

// Informe anual para la declaración de la renta: ingresos cobrados por habitación (sin datos de salud, sexo ni nacionalidad).
export function annualCsv(d: Snapshot, year: string): string {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
  const rows = d.payments.filter(p => p.paid_on?.startsWith(year)).sort((a, b) => a.paid_on!.localeCompare(b.paid_on!)).map(p => {
    const c = d.contracts.find(x => x.id === p.contract_id)!
    const r = d.rooms.find(x => x.id === c.room_id); const pr = d.properties.find(x => x.id === r?.property_id)
    return [p.paid_on ?? '', pr?.name ?? '', r?.label ?? '', (p.amount_cents / 100).toFixed(2).replace('.', ','), p.method ?? ''].map(esc).join(';')
  })
  return '﻿' + ['Fecha de cobro;Piso;Habitación;Importe (EUR);Forma de pago', ...rows].join('\n')
}
