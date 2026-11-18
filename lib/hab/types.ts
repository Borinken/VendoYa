import { z } from 'zod'

// Dinero siempre en céntimos (enteros). Sin campos de sexo ni nacionalidad en ninguna tabla.
export type OrgKind = 'owner' | 'agency' | 'subtenant'
export type MemberRole = 'admin' | 'manager' | 'viewer'
export type AccessKind = 'manage' | 'sublet' | 'view'
export type AccessStatus = 'pending' | 'granted' | 'revoked'
export type RoomStatus = 'free' | 'occupied' | 'reserved' | 'maintenance'
export type ContractStatus = 'draft' | 'pending_signature' | 'active' | 'ended'
export type ItemCondition = 'ok' | 'worn' | 'damaged'
export type PaymentStatus = 'pending' | 'paid' | 'late'
export type Severity = 'low' | 'medium' | 'high'
export type IncidentStatus = 'open' | 'seen' | 'in_progress' | 'resolved'
export type SplitRule = 'equal' | 'by_m2' | 'by_rent'

export interface Org { id: string; name: string; kind: OrgKind; created_by: string }
export interface Member { org_id: string; user_id: string; role: MemberRole; label?: string }
export interface RoomIncludes { utilities: boolean; furniture: boolean; private_bath: boolean; window: boolean; lock: boolean }
export interface Property {
  id: string; org_id: string; name: string; address: string; city: string; province: string
  community: string; tensioned_zone: boolean; whole_flat_rent_cents: number | null
  rules: string[]; notes: string; rental_mode?: 'rooms' | 'whole'
}
export interface Access {
  id: string; property_id: string; grantee_org_id: string; kind: AccessKind
  consent_doc_path: string | null; max_total_rent_cents: number | null
  status: AccessStatus; valid_until: string | null; granted_by: string
}
export interface Room {
  id: string; property_id: string; label: string; size_m2: number; rent_cents: number
  deposit_cents: number; includes: RoomIncludes; status: RoomStatus
}
export interface Tenant { id: string; org_id: string; full_name: string; email: string; phone: string; user_id: string | null }
export interface Clause {
  id: string; code: string; category: string; title: string; body: string
  community: string | null; reviewed_by_lawyer: boolean
}
export interface ContractClause { code: string; title: string; body: string }
export interface Contract {
  id: string; org_id: string; room_id: string; tenant_id: string; starts_on: string; ends_on: string
  rent_cents: number; deposit_cents: number; clauses: ContractClause[]; status: ContractStatus
  signed_at: string | null; signed_pdf_path: string | null; version: number; shared_pdf_path?: string | null; sealed_pdf_path?: string | null
}
export interface Inventory { id: string; room_id: string; contract_id: string | null; kind: 'entry' | 'exit'; taken_at: string; notes: string }
export interface InventoryItem { id: string; inventory_id: string; item: string; condition: ItemCondition; note: string; photo_paths: string[] }
export interface Payment { id: string; contract_id: string; due_on: string; amount_cents: number; paid_on: string | null; status: PaymentStatus; method: string | null }
export interface Utility { id: string; property_id: string; kind: string; period: string; total_cents: number; split_rule: SplitRule; invoice_path: string | null }
export interface UtilityShare { utility_id: string; room_id: string; amount_cents: number }
export type IncidentCategory = 'Avería' | 'Queja' | 'Sugerencia' | 'Otro'
export const INCIDENT_CATEGORIES: IncidentCategory[] = ['Avería', 'Queja', 'Sugerencia', 'Otro']
export const TICKET_CATEGORIES = ['Contratos', 'Cobros', 'Incidencias', 'Cuenta', 'Otro'] as const
export type TicketCategory = (typeof TICKET_CATEGORIES)[number]
export interface Incident {
  id: string; code: string; category: IncidentCategory | null; org_id: string; property_id: string; room_id: string | null; reported_by: string | null
  tenant_id: string | null; title: string; description: string; severity: Severity; status: IncidentStatus
  photo_paths: string[]; tenant_statement: string; created_at: string; resolved_at: string | null
}
export interface IncidentEvent { id: string; incident_id: string; actor: string | null; kind: string; note: string; internal: boolean; created_at: string }
export interface Invite { id: string; org_id: string; email: string; role: MemberRole | 'tenant'; contract_id: string | null; expires_at: string; used_at: string | null }

export interface SupportTicket {
  id: string; number: number; org_id: string | null; created_by: string | null; category: TicketCategory; subject: string; body: string
  status: 'open' | 'answered' | 'closed'; attachment_paths: string[]; contact_phone: string | null
  whatsapp_clicked_at: string | null; created_at: string
}
export interface SupportMessage { id: string; ticket_id: string; author: string | null; author_kind: 'user' | 'platform' | 'auto'; body: string; created_at: string }
export interface OrgSettings { org_id: string; whatsapp_e164: string | null; templates: Record<string, string>; auto_reply: string; auto_email_copy?: boolean }
export interface TenantLink { id: string; org_id: string; tenant_id: string; contract_id: string; room_id: string; expires_at: string; revoked_at: string | null; last_used_at: string | null; created_at: string }
export type SaleTimeline = 'now' | '3m' | '6m' | 'nohurry'
export const SALE_TIMELINES: Record<SaleTimeline, string> = { now: 'Ya', '3m': 'En 3 meses', '6m': 'En 6 meses', nohurry: 'Sin prisa' }
export interface SaleInterest {
  id: string; org_id: string; property_id: string; desired_price_cents: number | null; timeline: SaleTimeline
  has_tenants: boolean; tenants_end_on: string | null; notes: string; status: 'new' | 'contacted' | 'closed'; created_by: string | null; created_at: string
}
export type AppStatus = 'sent' | 'submitted' | 'in_review' | 'approved' | 'rejected' | 'withdrawn' | 'expired'
export type DocKind = 'payslip' | 'work_contract' | 'study_proof' | 'income_proof' | 'reference_letter'
export const DOC_KINDS: Record<DocKind, string> = { payslip: 'Nómina', work_contract: 'Contrato de trabajo', study_proof: 'Justificante de estudios', income_proof: 'Justificante de ingresos', reference_letter: 'Carta de referencia' }
// Motivos NEUTROS de rechazo (lista cerrada). Nada de motivos subjetivos ni sensibles.
export const REASON_CODES = { incomplete_docs: 'Documentación incompleta', criteria_not_met: 'No cumple los criterios publicados', dates_mismatch: 'Las fechas no encajan', other_selected: 'Otra candidatura seleccionada' } as const
export type ReasonCode = keyof typeof REASON_CODES | 'withdrawn_by_applicant'
export interface ApplicationAnswers {
  employment?: string; employer?: string; seniority?: string; contract_type?: string; income_bracket?: string
  move_in?: string; duration_months?: number; reason?: string; adults?: number; pets?: boolean; smoker?: boolean
  previous_landlord?: { name: string; email: string; phone: string }
}
export interface Application {
  id: string; org_id: string; room_id: string; status: AppStatus; applicant_name: string; email: string; phone: string; contact_verified: boolean
  answers: ApplicationAnswers; consent_at: string | null; consent_text_version: string | null; submitted_at: string | null; decided_at: string | null
  decided_by: string | null; decision_reason_code: ReasonCode | null; decision_note: string; retention_until: string | null; link_expires_at: string; created_at: string
}
export interface ApplicationDoc { id: string; application_id: string; kind: DocKind; path: string; verified_by: string | null; verified_at: string | null }
export interface ApplicationCriteria { id: string; org_id: string; room_id: string; required_docs: DocKind[]; notes_public: string }
export interface AuditEntry { id: string; org_id: string; actor: string; action: string; ref: string | null; created_at: string }
export interface ApplicantInfo {
  id: string; org_id: string; status: AppStatus; applicant_name: string; email: string; phone: string; answers: ApplicationAnswers
  consent_text_version: string | null; room_label: string; rent_cents: number; property_name: string; org_name: string
  required_docs: DocKind[]; notes_public: string; docs: { kind: DocKind }[]
}
export interface ReferenceResponse { months?: number; punctual?: string; property_condition?: string; comment?: string }
export interface Reference { id: string; application_id: string; name: string; email: string; phone: string; response: ReferenceResponse | null; answered_at: string | null }
export interface RoomTemplate { org_id: string; name: string; conditions: Record<string, boolean | number | string> }
export interface ReferenceInfo { answered: boolean; reference_name: string; applicant_name: string; org_name: string }
export type SignRole = 'landlord' | 'tenant'
export interface SignRequest { id: string; contract_id: string; org_id: string; role: SignRole; signer_name: string; signer_email: string; expires_at: string; used_at: string | null; revoked_at: string | null; created_at: string }
export interface Signature { id: string; contract_id: string; request_id: string | null; role: SignRole; signer_name: string; signed_at: string; ip: string | null; user_agent: string | null; doc_hash: string; signature_path: string | null; method: 'link' | 'link_code'; consent_text: string }
export interface MailLogEntry { id: string; contract_id: string | null; to_role: string; kind: 'sealed' | 'code'; status: 'sent' | 'failed'; attempts: number; created_at: string }
export interface SignInfo { request_id: string; contract_id: string; role: SignRole; signer_name: string; contract_title: string; org_name: string; mail_enabled: boolean; already_signed_by_other: boolean }
export interface SignResult { all_signed: boolean; download_token: string | null; simulated_emails?: string[] }
export interface PortalIncident { code: string; title: string; category: IncidentCategory | null; status: IncidentStatus; created_at: string }
export interface PortalInfo {
  link_id: string; org_id: string; tenant_name: string; room_label: string; property_name: string
  org_name: string; contract_pdf_path?: string | null; org_whatsapp: string | null; auto_reply: string; templates: Record<string, string>; incidents: PortalIncident[]
}
export interface PlatformOverview {
  counts: { orgs: number; properties: number; rooms: number; contracts: number; sale_interests_new: number }
  tickets: SupportTicket[]
  saleInterests: SaleInterest[]
  orgNames: Record<string, string>
}

export type AlertKind = 'rent_due' | 'rent_late' | 'contract_end' | 'deposit' | 'rent_cap' | 'grant_expiry'
export interface HabAlert { key: string; kind: AlertKind; due_on: string; ref_table: string; ref_id: string; title: string; detail: string; level: 'info' | 'warn' | 'danger' }

export interface Session {
  userId: string
  email: string
  name: string
  kind: OrgKind | 'tenant'
  orgId: string | null
  role: MemberRole | 'tenant'
  tenantId: string | null
  demo: boolean
  platformAdmin: boolean
}

export interface Snapshot {
  org: Org | null
  orgNames: Record<string, string>
  properties: Property[]
  rooms: Room[]
  tenants: Tenant[]
  clauses: Clause[]
  contracts: Contract[]
  inventories: Inventory[]
  inventoryItems: InventoryItem[]
  payments: Payment[]
  utilities: Utility[]
  shares: UtilityShare[]
  incidents: Incident[]
  events: IncidentEvent[]
  access: Access[]
  members: Member[]
  invites: Invite[]
  dismissed: string[]
  tickets: SupportTicket[]
  ticketMessages: SupportMessage[]
  settings: OrgSettings | null
  tenantLinks: TenantLink[]
  signRequests: SignRequest[]
  signatures: Signature[]
  mailLog: MailLogEntry[]
  saleInterests: SaleInterest[]
  applications: Application[]
  references: Reference[]
  roomTemplates: RoomTemplate[]
  applicationDocs: ApplicationDoc[]
  criteria: ApplicationCriteria[]
  audit: AuditEntry[]
}

// ---- Entradas validadas con zod (todo formulario pasa por aquí) ----
const text = (max = 200) => z.string().trim().min(1, 'Obligatorio').max(max)
const optText = (max = 500) => z.string().trim().max(max).default('')
const cents = z.number().int().min(0).max(10_000_000)
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha no válida')

export const propertyInput = z.object({
  name: text(120), address: text(200), city: text(80), province: text(80),
  community: text(80), tensioned_zone: z.boolean().default(false),
  whole_flat_rent_cents: cents.nullable().default(null),
  rules: z.array(z.string().trim().min(1).max(200)).max(30).default([]),
  notes: optText(1000),
  rental_mode: z.enum(['rooms', 'whole']).default('rooms'),
  whole_size_m2: z.number().min(1).max(1000).optional(), // solo para piso entero: m² de la unidad única (no se guarda en el piso)
}).refine(v => v.rental_mode !== 'whole' || (v.whole_flat_rent_cents && v.whole_flat_rent_cents > 0), { message: 'Para alquilar el piso entero indica su renta', path: ['whole_flat_rent_cents'] })
export type PropertyInput = z.input<typeof propertyInput>

export const roomInput = z.object({
  property_id: text(64), label: text(80), size_m2: z.number().min(1).max(200),
  rent_cents: cents, deposit_cents: cents,
  includes: z.object({ utilities: z.boolean(), furniture: z.boolean(), private_bath: z.boolean(), window: z.boolean(), lock: z.boolean() }),
  status: z.enum(['free', 'occupied', 'reserved', 'maintenance']).default('free'),
})
export type RoomInput = z.input<typeof roomInput>

export const tenantInput = z.object({
  full_name: text(120),
  email: z.string().trim().email('Correo no válido').max(160),
  phone: z.string().trim().max(30).default(''),
})
export type TenantInput = z.input<typeof tenantInput>

export const contractInput = z.object({
  room_id: text(64), tenant_id: text(64), starts_on: day, ends_on: day,
  rent_cents: cents.min(1), deposit_cents: cents,
  clauses: z.array(z.object({ code: text(60), title: text(160), body: text(4000) })).max(40),
}).refine(v => v.ends_on > v.starts_on, { message: 'La fecha de fin debe ser posterior al inicio', path: ['ends_on'] })
export type ContractInput = z.input<typeof contractInput>

export const inventoryInput = z.object({
  room_id: text(64), contract_id: z.string().nullable().default(null),
  kind: z.enum(['entry', 'exit']), taken_at: day, notes: optText(1000),
  items: z.array(z.object({
    item: text(120), condition: z.enum(['ok', 'worn', 'damaged']),
    note: optText(300), photo_paths: z.array(z.string().max(300)).max(10).default([]),
  })).min(1, 'Añade al menos un elemento').max(80),
})
export type InventoryInput = z.input<typeof inventoryInput>

export const utilityInput = z.object({
  property_id: text(64), kind: text(60), period: z.string().regex(/^\d{4}-\d{2}$/, 'Periodo AAAA-MM'),
  total_cents: cents.min(1), split_rule: z.enum(['equal', 'by_m2', 'by_rent']),
  invoice_path: z.string().max(300).nullable().default(null),
})
export type UtilityInput = z.input<typeof utilityInput>

export const incidentInput = z.object({
  property_id: text(64), room_id: z.string().nullable().default(null),
  title: text(140), description: optText(2000),
  severity: z.enum(['low', 'medium', 'high']).default('medium'),
  photo_paths: z.array(z.string().max(300)).max(10).default([]),
  tenant_statement: optText(2000),
})
export type IncidentInput = z.input<typeof incidentInput>

export const accessInput = z.object({
  property_id: text(64), grantee_org_id: text(64), kind: z.enum(['manage', 'sublet', 'view']),
  consent_doc_path: z.string().max(300).nullable().default(null),
  max_total_rent_cents: cents.nullable().default(null), valid_until: day.nullable().default(null),
}).refine(v => v.kind !== 'sublet' || (v.consent_doc_path && v.max_total_rent_cents), {
  message: 'El subarriendo exige documento de consentimiento y tope de renta', path: ['consent_doc_path'],
})
export type AccessInput = z.input<typeof accessInput>

export const inviteInput = z.object({
  email: z.string().trim().email('Correo no válido').max(160),
  role: z.enum(['admin', 'manager', 'viewer', 'tenant']),
  contract_id: z.string().nullable().default(null),
}).refine(v => v.role !== 'tenant' || v.contract_id, { message: 'Elige el contrato del inquilino', path: ['contract_id'] })
export type InviteInput = z.input<typeof inviteInput>

export const eventInput = z.object({ incident_id: text(64), kind: text(30), note: text(1000), internal: z.boolean().default(false) })

export const UPLOAD_LIMITS = {
  photos: { bucket: 'hab-photos', maxBytes: 5 * 1024 * 1024, types: ['image/jpeg', 'image/png', 'image/webp'] },
  docs: { bucket: 'hab-docs', maxBytes: 10 * 1024 * 1024, types: ['application/pdf', 'image/jpeg', 'image/png'] },
} as const
export type Bucket = 'hab-photos' | 'hab-docs'

export function validateUpload(file: { size: number; type: string }, bucket: Bucket): string | null {
  const lim = bucket === 'hab-photos' ? UPLOAD_LIMITS.photos : UPLOAD_LIMITS.docs
  if (!(lim.types as readonly string[]).includes(file.type)) return 'Tipo de archivo no permitido'
  if (file.size > lim.maxBytes) return `El archivo supera ${Math.round(lim.maxBytes / 1024 / 1024)} MB`
  return null
}

const e164 = z.string().trim().regex(/^\+[1-9]\d{7,14}$/, 'Formato internacional, p. ej. +34600123456')
export const ticketInput = z.object({
  category: z.enum(TICKET_CATEGORIES), subject: text(140), body: text(3000),
  attachment_paths: z.array(z.string().max(300)).max(5).default([]),
  contact_phone: e164.nullable().default(null), // opcional; solo para que la plataforma pueda responder por WhatsApp
})
export type TicketInput = z.input<typeof ticketInput>

export const DEFAULT_TEMPLATES: Record<string, string> = {
  Avería: 'Hola, soy {nombre} ({habitación}). Aviso de una avería. Código: {código}',
  Queja: 'Hola, soy {nombre} ({habitación}). He enviado una queja. Código: {código}',
  Sugerencia: 'Hola, soy {nombre} ({habitación}). He enviado una sugerencia. Código: {código}',
  Otro: 'Hola, soy {nombre} ({habitación}). He enviado un aviso. Código: {código}',
}
export const DEFAULT_AUTO_REPLY = 'Respuesta automática: hemos recibido tu aviso. Este es un asistente automático; una persona lo revisará.'
export const settingsInput = z.object({
  whatsapp_e164: e164.nullable().or(z.literal('').transform(() => null)),
  templates: z.record(z.string(), z.string().trim().max(300)).default({}),
  auto_reply: z.string().trim().max(500).default(''),
  auto_email_copy: z.boolean().optional(),
})
export type SettingsInput = z.input<typeof settingsInput>

export const portalSubmitInput = z.object({
  category: z.enum(['Avería', 'Queja', 'Sugerencia', 'Otro']),
  description: z.string().trim().min(5, 'Cuéntanos un poco más (mín. 5 caracteres)').max(2000),
  photo_paths: z.array(z.string().max(300)).max(5).default([]),
})
export type PortalSubmitInput = z.input<typeof portalSubmitInput>

export const saleInterestInput = z.object({
  property_id: text(64),
  desired_price_cents: cents.nullable().default(null),
  timeline: z.enum(['now', '3m', '6m', 'nohurry']),
  has_tenants: z.boolean(), tenants_end_on: day.nullable().default(null), notes: optText(1000),
})
export type SaleInterestInput = z.input<typeof saleInterestInput>

export const CONSENT_VERSION = '2026-1'
export const CONSENT_TEXT = 'Acepto que el responsable indicado trate mis datos para valorar mi solicitud de alquiler de esta habitación. Los conservará mientras dure el proceso y, si no se me selecciona, 90 días más; puedo pedir su borrado en cualquier momento.'
// Solo estas claves existen en el formulario y en la base (lista blanca). Sin datos protegidos, fecha de nacimiento ni DNI.
export const applicationAnswers = z.object({
  employment: z.enum(['employee', 'self', 'student', 'pensioner', 'other_income']),
  employer: z.string().trim().max(120).default(''),
  seniority: z.enum(['<6m', '6-12m', '1-3y', '>3y', '']).default(''),
  contract_type: z.enum(['permanent', 'temporary', 'na', '']).default(''),
  income_bracket: z.enum(['<1000', '1000-1500', '1500-2000', '2000-3000', '>3000']),
  move_in: day, duration_months: z.number().int().min(1).max(120),
  reason: z.enum(['temp_work', 'studies', 'other']),
  adults: z.number().int().min(1).max(4), pets: z.boolean(), smoker: z.boolean(),
  previous_landlord: z.object({ name: z.string().trim().max(120), email: z.string().trim().max(160), phone: z.string().trim().max(30) }).optional(),
})
export const applicantSaveInput = z.object({
  name: z.string().trim().min(2, 'Escribe tu nombre').max(120),
  email: z.string().trim().email('Correo no válido').max(160),
  phone: z.string().trim().max(30).default(''),
  consent: z.boolean(),
})
export const decisionInput = z.object({
  decision: z.enum(['approved', 'rejected']),
  reason: z.enum(['incomplete_docs', 'criteria_not_met', 'dates_mismatch', 'other_selected']).optional(),
  note: z.string().trim().max(500).default(''),
}).refine(v => v.decision === 'approved' || v.reason, { message: 'Elige un motivo de la lista', path: ['reason'] })

export const referenceAnswerInput = z.object({
  months: z.number().int().min(0).max(600),
  punctual: z.enum(['always', 'mostly', 'sometimes', 'rarely']),
  property_condition: z.enum(['good', 'normal', 'poor']),
  comment: z.string().trim().max(500).default(''),
})
export type ReferenceAnswerInput = z.input<typeof referenceAnswerInput>

export const signInput = z.object({
  name: z.string().trim().min(3, 'Escribe tu nombre completo').max(120),
  consent: z.literal(true, { error: 'Marca «He leído y acepto» para firmar' }),
  signature: z.string().regex(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/, 'Dibuja tu firma').max(400_000, 'La firma es demasiado grande'),
  code: z.string().regex(/^\d{6}$/, 'El código tiene 6 dígitos').optional(),
})
export type SignInput = z.input<typeof signInput>
