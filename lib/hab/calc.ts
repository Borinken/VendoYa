import { addMonths, format, parseISO } from 'date-fns'
import type { Room, SplitRule } from './types'

// Cuotas mensuales desde el inicio hasta el fin del contrato (día de cobro = día de inicio).
export function buildSchedule(startsOn: string, endsOn: string, rentCents: number): { due_on: string; amount_cents: number }[] {
  const start = parseISO(startsOn)
  const end = parseISO(endsOn)
  const out: { due_on: string; amount_cents: number }[] = []
  for (let i = 0; i < 120; i++) { // tope 10 años: evita bucles por fechas absurdas
    const d = addMonths(start, i)
    if (d >= end) break
    out.push({ due_on: format(d, 'yyyy-MM-dd'), amount_cents: rentCents })
  }
  return out
}

// Reparto de una factura entre habitaciones; el resto del redondeo va a la primera habitación.
export function splitUtility(totalCents: number, rooms: Pick<Room, 'id' | 'size_m2' | 'rent_cents'>[], rule: SplitRule) {
  if (!rooms.length) return []
  const w = rooms.map(r => (rule === 'by_m2' ? r.size_m2 : rule === 'by_rent' ? r.rent_cents : 1))
  const sum = w.reduce((a, b) => a + b, 0) || rooms.length
  const parts = rooms.map((r, i) => ({ room_id: r.id, amount_cents: Math.floor((totalCents * (sum === 0 ? 1 : w[i])) / sum) }))
  parts[0].amount_cents += totalCents - parts.reduce((a, p) => a + p.amount_cents, 0)
  return parts
}
