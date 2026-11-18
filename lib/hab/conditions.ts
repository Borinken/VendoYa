import { z } from 'zod'

// Lista maestra de "Condiciones y entrega". Solo condiciones del alquiler: nada sobre características de las personas.
export type CondValue = boolean | number | string
export type CondValues = Record<string, CondValue>
type Kind = 'bool' | 'qty' | 'cents' | 'text' | 'choice'
export interface CondOpt { id: string; label: string; kind: Kind; choices?: [string, string][]; legalPending?: boolean }
export interface CondGroup { id: string; title: string; opts: CondOpt[] }

const b = (id: string, label: string, legalPending = false): CondOpt => ({ id, label, kind: 'bool', legalPending })
const q = (id: string, label: string): CondOpt => ({ id, label, kind: 'qty' })
const c = (id: string, label: string, legalPending = false): CondOpt => ({ id, label, kind: 'cents', legalPending })
const t = (id: string, label: string): CondOpt => ({ id, label, kind: 'text' })
const ch = (id: string, label: string, choices: [string, string][]): CondOpt => ({ id, label, kind: 'choice', choices })
const SVC: [string, string][] = [['', 'No indicado'], ['included', 'Incluido en la renta'], ['shared', 'Repartido entre habitaciones'], ['capped', 'Con límite mensual']]

export const CONDITION_GROUPS: CondGroup[] = [
  { id: 'keys', title: 'Llaves y accesos', opts: [
    b('keys_delivery', 'Se entregan llaves'), q('keys_portal', 'Llaves del portal'), q('keys_flat', 'Llaves de la puerta del piso'), q('keys_room', 'Llaves de la habitación'),
    q('keys_mailbox', 'Llaves del buzón'), q('keys_garage', 'Mandos de garaje'), q('keys_card', 'Tarjetas de acceso'), q('keys_storage', 'Llaves del trastero'),
    b('keys_copies', 'Se permiten copias de llaves'), c('keys_replace_cost', 'Coste de reposición de llaves o cambio de cerradura por pérdida (€)'),
    b('keys_return_all', 'Se devuelven todas las llaves al terminar'), b('keys_act_delivery', 'Acta de entrega de llaves (anexo para firmar)'), b('keys_act_return', 'Acta de devolución de llaves (anexo para firmar)'),
  ] },
  { id: 'cleaning', title: 'Limpieza', opts: [
    ch('clean_common', 'Limpieza de zonas comunes', [['', 'No indicada'], ['turns', 'Por turnos entre inquilinos'], ['service', 'Servicio contratado'], ['none', 'Ninguna']]),
    b('clean_paid_owner', 'El servicio de limpieza lo paga el propietario'), ch('clean_freq', 'Periodicidad del servicio', [['', 'No indicada'], ['weekly', 'Semanal'], ['biweekly', 'Quincenal']]),
    c('clean_cost', 'Importe del servicio de limpieza (€/mes)'), t('clean_split', 'Quién lo paga o cómo se reparte'),
    ch('clean_room', 'Limpieza de la propia habitación', [['', 'No indicada'], ['tenant', 'A cargo del inquilino'], ['included', 'Incluida cada cierto tiempo']]), q('clean_room_weeks', 'Limpieza de la habitación incluida cada (semanas)'),
    ch('clean_final', 'Limpieza final al salir', [['', 'No indicada'], ['included', 'Incluida'], ['tenant', 'Con cargo al inquilino']]), c('clean_final_cost', 'Importe de la limpieza final con cargo al inquilino (€)'),
    b('linen_included', 'Cambio de ropa de cama y toallas incluido'),
  ] },
  { id: 'services', title: 'Suministros y servicios', opts: [
    ...(['electricity:Luz', 'water:Agua', 'gas:Gas', 'internet:Internet', 'heating:Calefacción', 'ac:Aire acondicionado'] as const).flatMap(s => {
      const [id, label] = s.split(':')
      return [ch(`svc_${id}`, label, SVC), c(`svc_${id}_cap`, `${label}: límite mensual (€)`), t(`svc_${id}_over`, `${label}: qué pasa al superar el límite`)]
    }),
    b('svc_community', 'Comunidad incluida'), b('svc_waste', 'Basura y reciclaje incluidos'), b('svc_boiler', 'Mantenimiento de caldera incluido'),
  ] },
  { id: 'equipment', title: 'Equipamiento y espacios', opts: [
    b('eq_furnished', 'Amueblada'), b('eq_bed', 'Cama y colchón'), b('eq_wardrobe', 'Armario'), b('eq_desk', 'Escritorio'), b('eq_tv', 'TV'),
    ch('eq_fridge', 'Nevera', [['', 'No indicada'], ['own', 'Propia'], ['shared', 'Compartida con balda asignada']]), b('eq_kitchen', 'Cocina y menaje'),
    b('eq_washer', 'Lavadora'), b('eq_dryer', 'Secadora'), b('eq_clothesline', 'Tendedero'), b('eq_garage', 'Plaza de garaje'), b('eq_storage', 'Trastero'), b('eq_bike', 'Sitio para bicicleta'), b('eq_terrace', 'Terraza o patio'),
  ] },
  { id: 'rules', title: 'Normas', opts: [
    ch('rule_smoking', 'Fumar', [['', 'No indicado'], ['no', 'No se permite'], ['outside', 'Solo en terraza o exterior'], ['yes', 'Se permite']]),
    ch('rule_pets', 'Mascotas', [['', 'No indicado'], ['no', 'No se permiten'], ['ask', 'Con permiso previo'], ['yes', 'Se permiten']]),
    ch('rule_visits', 'Visitas', [['', 'No indicado'], ['yes', 'Permitidas'], ['limited', 'Hasta cierta hora'], ['no', 'No permitidas']]), b('rule_overnight', 'Pernocta de invitados permitida'), b('rule_couples', 'Se admiten parejas en la habitación'),
    b('rule_parties', 'Se permiten fiestas'), t('rule_quiet_hours', 'Horario de descanso (p. ej. 23:00 a 8:00)'), b('rule_noise', 'Se respetan los límites de ruido de la casa'),
    b('rule_common', 'Uso compartido y ordenado de zonas comunes'), b('rule_lights', 'Cerrar puertas y apagar luces'), b('rule_entry', 'El propietario o encargado puede entrar con preaviso'), q('rule_entry_hours', 'Preaviso de entrada (horas)'),
  ] },
  { id: 'terms', title: 'Condiciones', opts: [
    t('term_checkin', 'Horario de entrada (check-in)'), t('term_checkout', 'Horario de salida (check-out)'), b('term_registration', 'Empadronamiento permitido'),
    b('term_no_sublet', 'Subarriendo y cesión prohibidos'), ch('term_repairs_payer', 'Pequeñas reparaciones', [['', 'No indicado'], ['owner', 'Las paga el propietario'], ['tenant', 'Las paga el inquilino hasta un importe']]),
    c('term_repairs_max', 'Importe máximo de pequeñas reparaciones a cargo del inquilino (€)'), b('term_home_insurance', 'Seguro de hogar contratado'), b('term_content_insurance', 'Seguro de contenido del inquilino'),
    q('term_notice_days', 'Preaviso para dejar la habitación (días)'), c('term_notice_penalty', 'Penalización pactada por falta de preaviso (€) — pendiente de revisión legal', true),
    t('term_deposit_return', 'Fianza: forma de devolución'), q('term_deposit_days', 'Fianza: plazo de devolución (días)'), b('term_receipt', 'Se entrega recibo de cada pago'), b('term_invoice', 'Se entrega factura cuando se solicite'),
  ] },
]

const ALL = CONDITION_GROUPS.flatMap(g => g.opts)
export const condSchema = z.record(z.string(), z.union([z.boolean(), z.number().int().min(0).max(10_000_000), z.string().max(200)]))

export const defaultConditions = (): CondValues => ({ keys_copies: false })

export function validateConditions(v: CondValues): string[] {
  const errs: string[] = []
  for (const o of ALL) {
    const x = v[o.id]
    if ((o.kind === 'qty' || o.kind === 'cents') && x !== undefined && (typeof x !== 'number' || !Number.isInteger(x) || x < 0)) errs.push(`${o.label}: debe ser un número ≥ 0`)
  }
  return errs
}

const eur = (cents: number) => (cents / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
// Importes en céntimos. Las opciones sin marcar no aparecen. Devuelve texto claro por grupo para el anexo II.
export function describeConditions(v: CondValues): { title: string; lines: string[] }[] {
  const out: { title: string; lines: string[] }[] = []
  for (const g of CONDITION_GROUPS) {
    const lines: string[] = []
    for (const o of g.opts) {
      const x = v[o.id]
      if (o.kind === 'bool' && x === true) lines.push(o.label + (o.legalPending ? ' (pendiente de revisión legal)' : ''))
      else if (o.kind === 'qty' && typeof x === 'number' && x > 0) lines.push(`${o.label}: ${x}`)
      else if (o.kind === 'cents' && typeof x === 'number' && x > 0) lines.push(`${o.label.replace(/ \(€[^)]*\)/, '').replace(/ — pendiente.*/, '')}: ${eur(x)}${o.legalPending ? ' (pendiente de revisión legal)' : ''}`)
      else if (o.kind === 'text' && typeof x === 'string' && x.trim()) lines.push(`${o.label}: ${x.trim()}`)
      else if (o.kind === 'choice' && typeof x === 'string' && x) lines.push(`${o.label}: ${o.choices!.find(([k]) => k === x)?.[1] ?? x}`)
    }
    if (lines.length) out.push({ title: g.title, lines })
  }
  return out
}

// Texto de cláusula para guardar en hab_contracts.clauses (código estable: catálogo "condiciones").
export const conditionsClause = (v: CondValues) => ({
  code: 'anexo_condiciones', title: 'Anexo II. Condiciones y entrega',
  body: describeConditions(v).map(g => `${g.title}: ${g.lines.join('; ')}`).join('\n') || 'Sin condiciones adicionales marcadas.',
})
