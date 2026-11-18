import { z } from 'zod'
import { isValidTaxId, isValidTaxIdOrCif } from './validators'

// shortcut: los límites de duración de contratos de temporada y la causa que los justifica NO están verificados
// con abogado; la app solo exige que se escriba una causa concreta. Revisar con abogado antes de producción.
export const SEASONAL_UNVERIFIED = true

const req = (label: string, max = 300) => z.string({ error: `${label}: obligatorio` }).trim().min(1, `${label}: obligatorio`).max(max)

export const contractDraftSchema = z.object({
  landlord: z.object({
    name: req('Arrendador: nombre o razón social', 160),
    taxId: z.string().trim().refine(isValidTaxIdOrCif, 'Arrendador: DNI/NIE/CIF no válido (revisa letra o dígito de control)'),
    address: req('Arrendador: domicilio'), contact: req('Arrendador: contacto', 160),
  }),
  tenant: z.object({
    name: req('Arrendatario: nombre', 160),
    taxId: z.string().trim().refine(isValidTaxId, 'Arrendatario: DNI/NIE no válido (revisa la letra)'),
    address: req('Arrendatario: domicilio'), phone: req('Arrendatario: teléfono', 30),
    email: z.string().trim().email('Arrendatario: correo no válido'),
  }),
  property: z.object({
    address: req('Inmueble: dirección completa'), roomLabel: req('Inmueble: habitación'),
    sizeM2: z.number({ error: 'Inmueble: m² obligatorios' }).min(1, 'Inmueble: m² obligatorios'),
    commonAreas: req('Inmueble: zonas comunes de uso'), cadastral: z.string().trim().max(30).default(''),
  }),
  term: z.object({
    startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Duración: fecha de inicio obligatoria'),
    endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Duración: fecha de fin obligatoria'),
    extension: req('Duración: prórroga', 400),
    seasonal: z.boolean(), seasonalCause: z.string().trim().max(400).default(''),
  }),
  rent: z.object({
    amountCents: z.number({ error: 'Renta: importe obligatorio' }).int().min(1, 'Renta: importe obligatorio'),
    payDay: z.number({ error: 'Renta: día de pago obligatorio' }).int().min(1, 'Renta: día de pago obligatorio').max(28),
    method: req('Renta: forma de pago', 200),
    updateAgreed: z.boolean(), updateIndex: z.string().trim().max(200).default(''),
  }),
  deposit: z.object({
    amountCents: z.number({ error: 'Fianza: importe obligatorio' }).int().min(0),
    custody: z.enum(['owner', 'regional']), regionalAck: z.boolean(),
  }),
  utilities: req('Suministros: qué incluye y cómo se reparte', 800),
  expenses: req('Gastos', 800),
  energyCert: req('Certificado de eficiencia energética (referencia o «pendiente»)', 120),
  habitability: z.boolean(),
  clauseCodes: z.array(z.string()).max(40),
  rules: z.array(z.string().trim().min(1).max(200)).max(30),
  dataProtection: z.object({ controller: req('Protección de datos: responsable', 200), purpose: req('Protección de datos: finalidad', 300) }),
  place: req('Lugar de firma', 100),
  signDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha de firma obligatoria'),
  photos: z.array(z.object({ path: z.string(), caption: z.string().max(100), date: z.string() })).max(12),
  items: z.array(z.object({ item: z.string().trim().min(1).max(120), condition: z.enum(['ok', 'worn', 'damaged']) })).max(60),
}).superRefine((v, ctx) => {
  const add = (path: (string | number)[], message: string) => ctx.addIssue({ code: 'custom', path, message })
  if (v.term.startsOn && v.term.endsOn && v.term.endsOn <= v.term.startsOn) add(['term', 'endsOn'], 'Duración: el fin debe ser posterior al inicio')
  if (v.term.seasonal && !v.term.seasonalCause) add(['term', 'seasonalCause'], 'Contrato de temporada: indica la causa concreta que lo justifica')
  if (v.rent.updateAgreed && !v.rent.updateIndex) add(['rent', 'updateIndex'], 'Renta: indica el índice de actualización pactado')
  if (v.deposit.custody === 'regional' && !v.deposit.regionalAck) add(['deposit', 'regionalAck'], 'Fianza: confirma que consultarás el depósito autonómico')
  if (!v.habitability) add(['habitability'], 'Cédula/habitabilidad: marca la casilla cuando la tengas')
})

export type ContractDraft = z.input<typeof contractDraftSchema>

export function emptyDraft(): ContractDraft {
  return {
    landlord: { name: '', taxId: '', address: '', contact: '' },
    tenant: { name: '', taxId: '', address: '', phone: '', email: '' },
    property: { address: '', roomLabel: '', sizeM2: 0, commonAreas: 'Cocina, salón, baños y terraza, de uso compartido', cadastral: '' },
    term: { startsOn: '', endsOn: '', extension: 'Prórroga por acuerdo escrito de ambas partes', seasonal: false, seasonalCause: '' },
    rent: { amountCents: 0, payDay: 5, method: 'Transferencia bancaria', updateAgreed: false, updateIndex: '' },
    deposit: { amountCents: 0, custody: 'owner', regionalAck: false },
    utilities: '', expenses: 'Los gastos de comunidad e IBI son a cargo de la parte arrendadora.',
    energyCert: 'Pendiente', habitability: false, clauseCodes: [], rules: [],
    dataProtection: { controller: '', purpose: 'Gestionar el contrato de arrendamiento de la habitación' },
    place: '', signDate: '', photos: [], items: [],
  }
}

export interface MissingField { path: string; message: string }

// Lista de obligatorios que faltan o no validan (alimenta la barra "faltan N campos").
export function missingFields(draft: ContractDraft): MissingField[] {
  const r = contractDraftSchema.safeParse(draft)
  if (r.success) return []
  const seen = new Set<string>()
  return r.error.issues.map(i => ({ path: i.path.join('.'), message: i.message })).filter(m => !seen.has(m.path) && seen.add(m.path))
}

export const WATERMARK_TEXT = 'BORRADOR · cláusulas pendientes de revisión por abogado'
export const needsWatermark = (clauses: { reviewed_by_lawyer: boolean }[]) => clauses.length === 0 || clauses.some(c => !c.reviewed_by_lawyer)
export const contractNumber = (id: string, startsOn: string) => `HAB-${(startsOn || '0000').slice(0, 4)}-${id.replace(/[^a-z0-9]/gi, '').slice(0, 6).toUpperCase()}`
