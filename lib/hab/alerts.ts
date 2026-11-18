import { addDays, format, parseISO } from 'date-fns'
import type { Access, Contract, HabAlert, Payment, PaymentStatus, Property, Room } from './types'
import { rentCap } from './rent-cap'

export const todayStr = (d = new Date()) => format(d, 'yyyy-MM-dd')

// Estado de cobro derivado de las fechas (no se fía del campo guardado salvo "paid").
export function paymentStatus(p: Pick<Payment, 'due_on' | 'paid_on'>, today: string): PaymentStatus {
  if (p.paid_on) return 'paid'
  return p.due_on < today ? 'late' : 'pending'
}

export const daysBetween = (from: string, to: string) =>
  Math.round((parseISO(to).getTime() - parseISO(from).getTime()) / 86_400_000)

export interface AlertInput {
  today: string
  payments: Payment[]
  contracts: Contract[]
  rooms: Room[]
  properties: Property[]
  access: Access[]
  dismissed: string[]
}

export function computeAlerts(i: AlertInput): HabAlert[] {
  const out: HabAlert[] = []
  const soon = format(addDays(parseISO(i.today), 5), 'yyyy-MM-dd')
  const active = new Set(i.contracts.filter(c => c.status === 'active').map(c => c.id))
  const label = (c: Contract) => i.rooms.find(r => r.id === c.room_id)?.label ?? 'Habitación'
  const byId = new Map(i.contracts.map(c => [c.id, c]))

  for (const p of i.payments) {
    if (p.paid_on || !active.has(p.contract_id)) continue
    const c = byId.get(p.contract_id)!
    if (p.due_on < i.today) {
      out.push({ key: `rent_late:${p.id}:${p.due_on}`, kind: 'rent_late', due_on: p.due_on, ref_table: 'hab_payments', ref_id: p.id, level: 'danger',
        title: `Cobro atrasado: ${label(c)}`, detail: `Venció hace ${daysBetween(p.due_on, i.today)} días` })
    } else if (p.due_on <= soon) {
      out.push({ key: `rent_due:${p.id}:${p.due_on}`, kind: 'rent_due', due_on: p.due_on, ref_table: 'hab_payments', ref_id: p.id, level: 'info',
        title: `Renta próxima: ${label(c)}`, detail: `Vence el ${p.due_on}` })
    }
  }

  const in60 = format(addDays(parseISO(i.today), 60), 'yyyy-MM-dd')
  const ago30 = format(addDays(parseISO(i.today), -30), 'yyyy-MM-dd')
  for (const c of i.contracts) {
    if (c.status !== 'active') continue
    if (c.ends_on >= i.today && c.ends_on <= in60) {
      out.push({ key: `contract_end:${c.id}:${c.ends_on}`, kind: 'contract_end', due_on: c.ends_on, ref_table: 'hab_contracts', ref_id: c.id, level: 'warn',
        title: `Fin de contrato: ${label(c)}`, detail: `Termina el ${c.ends_on} (en ${daysBetween(i.today, c.ends_on)} días)` })
    }
    // Fianza: recordatorio en los 30 días siguientes al inicio.
    if (c.deposit_cents > 0 && c.starts_on <= i.today && c.starts_on >= ago30) {
      out.push({ key: `deposit:${c.id}:${c.starts_on}`, kind: 'deposit', due_on: c.starts_on, ref_table: 'hab_contracts', ref_id: c.id, level: 'info',
        title: `Fianza pendiente de custodia: ${label(c)}`, detail: 'Comprueba la custodia o el depósito según tu comunidad.' })
    }
  }

  for (const p of i.properties) {
    if (p.rental_mode === 'whole') continue // el tope de renta solo aplica por habitaciones
    const rooms = i.rooms.filter(r => r.property_id === p.id)
    const sublet = i.access.filter(a => a.property_id === p.id && a.kind === 'sublet' && a.status === 'granted')
    const cap = rentCap({ wholeFlatRentCents: p.whole_flat_rent_cents, sublet, roomRentsCents: rooms.map(r => r.rent_cents) })
    if (cap.exceeded) {
      out.push({ key: `rent_cap:${p.id}:${cap.totalCents}`, kind: 'rent_cap', due_on: i.today, ref_table: 'hab_properties', ref_id: p.id, level: 'warn',
        title: `Tope de renta superado: ${p.name}`, detail: 'La suma de las habitaciones supera el tope. Es un aviso, no un bloqueo; consúltalo con tu abogado.' })
    }
  }

  const in30 = format(addDays(parseISO(i.today), 30), 'yyyy-MM-dd')
  for (const a of i.access) {
    if (a.status === 'granted' && a.valid_until && a.valid_until <= in30) {
      out.push({ key: `grant_expiry:${a.id}:${a.valid_until}`, kind: 'grant_expiry', due_on: a.valid_until, ref_table: 'hab_property_access', ref_id: a.id, level: 'warn',
        title: 'Permiso a punto de caducar', detail: `Caduca el ${a.valid_until}` })
    }
  }

  const dismissed = new Set(i.dismissed)
  return out.filter(a => !dismissed.has(a.key)).sort((a, b) => a.due_on.localeCompare(b.due_on))
}
