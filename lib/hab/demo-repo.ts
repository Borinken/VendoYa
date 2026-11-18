import { addDays, format } from 'date-fns'
import type { HabRepo } from './repo'
import { CLAUSE_CATALOG } from './catalog'
import { buildSchedule, splitUtility } from './calc'
import { paymentStatus, todayStr } from './alerts'
import { assertDemoAllowed, type DemoRole } from './env'
import { DEMO_TENANT_TOKEN, TENANT_LINK_DAYS } from './config'
import {
  accessInput, contractInput, incidentInput, inventoryInput, inviteInput, propertyInput, roomInput, tenantInput, utilityInput, validateUpload, eventInput, ticketInput, settingsInput, portalSubmitInput, saleInterestInput, DEFAULT_TEMPLATES, DEFAULT_AUTO_REPLY, signInput, referenceAnswerInput, applicationAnswers, applicantSaveInput, decisionInput, CONSENT_VERSION,
} from './types'
import type {
  Access, ApplicantInfo, SignRequest, Signature, MailLogEntry, SignInfo, SignResult, SignRole, Reference, ReferenceInfo, ReferenceResponse, RoomTemplate, Application, ApplicationCriteria, ApplicationDoc, AuditEntry, DocKind, Bucket, Contract, OrgSettings, PlatformOverview, PortalInfo, SaleInterest, SupportMessage, SupportTicket, TenantLink, Incident, IncidentEvent, Inventory, InventoryItem, Invite, Member, Org, Payment, Property, Room, Session, Snapshot, Tenant, Utility, UtilityShare,
} from './types'

const KEY = 'hab_demo_db_v1'
const FILES = 'hab_demo_files_v1'

interface Db {
  orgs: Org[]; members: Member[]; properties: Property[]; access: Access[]; rooms: Room[]; tenants: Tenant[]
  contracts: Contract[]; inventories: Inventory[]; inventoryItems: InventoryItem[]; payments: Payment[]
  utilities: Utility[]; shares: UtilityShare[]; incidents: Incident[]; events: IncidentEvent[]; invites: Invite[]
  dismissed: Record<string, string[]>
  tickets: SupportTicket[]; ticketMessages: SupportMessage[]; settings: Record<string, OrgSettings>; saleInterests: SaleInterest[]
  links: (TenantLink & { token_hash: string })[]
  references: (Reference & { token_hash: string })[]; templates: RoomTemplate[]
  signReqs: (SignRequest & { token_hash: string })[]; signatures: Signature[]; mailLog: MailLogEntry[]; downloads: { token: string; contract_id: string }[]
  applications: (Application & { token_hash: string })[]; appDocs: ApplicationDoc[]; criteria: ApplicationCriteria[]; audit: AuditEntry[]
}

export const DEMO_SESSIONS: Record<DemoRole, Session> = {
  owner: { userId: 'u-owner', email: 'propietario@demo.local', name: 'Propietario Demo', kind: 'owner', orgId: 'o1', role: 'admin', tenantId: null, demo: true, platformAdmin: false },
  agency: { userId: 'u-agency', email: 'gestor@demo.local', name: 'Gestión Antequera', kind: 'agency', orgId: 'o2', role: 'admin', tenantId: null, demo: true, platformAdmin: false },
  subtenant: { userId: 'u-sub', email: 'subarrendador@demo.local', name: 'Subarriendos Sur', kind: 'subtenant', orgId: 'o3', role: 'admin', tenantId: null, demo: true, platformAdmin: false },
  admin: { userId: 'u-admin', email: 'admin@demo.local', name: 'Administrador (demo)', kind: 'owner', orgId: 'o1', role: 'admin', tenantId: null, demo: true, platformAdmin: true },
  tenant: { userId: 'u-t1', email: 'lucia@demo.local', name: 'Lucía Moreno', kind: 'tenant', orgId: null, role: 'tenant', tenantId: 't1', demo: true, platformAdmin: false },
}

const uid = () => (globalThis.crypto?.randomUUID?.() ?? `id-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`)

export function buildDemoDb(today = todayStr()): Db {
  const t = new Date(today + 'T00:00:00')
  const d = (n: number) => format(addDays(t, n), 'yyyy-MM-dd')
  const inc = (utilities: boolean, bath = false) => ({ utilities, furniture: true, private_bath: bath, window: true, lock: true })
  const prop = (id: string, name: string, address: string, whole: number, rules: string[]): Property => ({
    id, org_id: 'o1', name, address, city: 'Antequera', province: 'Málaga', community: 'Andalucía', tensioned_zone: false,
    whole_flat_rent_cents: whole, rules, notes: '',
  })
  const rules = ['Silencio de 23:00 a 8:00', 'No fumar dentro de la casa', 'Limpieza semanal por turnos en zonas comunes']
  const properties = [
    { ...prop('p4', 'Cervantes 8, 4ºD (piso entero)', 'Calle Cervantes 8, 4ºD', 62000, rules.slice(0, 2)), rental_mode: 'whole' as const },
    prop('p1', 'Infante Don Fernando 12, 3ºA', 'Calle Infante Don Fernando 12, 3ºA', 110000, rules),
    prop('p2', 'Lucena 5, 1ºB', 'Calle Lucena 5, 1ºB', 80000, rules.slice(0, 2)),
    prop('p3', 'Avenida de la Estación 22, 2ºC', 'Avenida de la Estación 22, 2ºC', 70000, rules),
  ]
  const room = (id: string, p: string, label: string, m2: number, rent: number, status: Room['status'], bath = false): Room => ({
    id, property_id: p, label, size_m2: m2, rent_cents: rent, deposit_cents: rent, includes: inc(true, bath), status,
  })
  const rooms = [
    room('r1', 'p1', 'Hab. 1 (balcón)', 14, 30000, 'occupied'), room('r2', 'p1', 'Hab. 2', 11, 26000, 'occupied'),
    room('r3', 'p1', 'Hab. 3 (baño propio)', 13, 28000, 'occupied', true), room('r4', 'p1', 'Hab. 4', 10, 27000, 'free'),
    room('r5', 'p2', 'Hab. A', 12, 25000, 'occupied'), room('r6', 'p2', 'Hab. B', 10, 24000, 'occupied'), room('r7', 'p2', 'Hab. C', 11, 26000, 'reserved'),
    room('r10', 'p4', 'Piso entero', 62, 62000, 'occupied'),
    room('r8', 'p3', 'Hab. Norte', 15, 33000, 'occupied'), room('r9', 'p3', 'Hab. Sur', 12, 31000, 'maintenance'),
  ]
  const tn = (id: string, org: string, name: string, mail: string, userId: string | null = null): Tenant => ({ id, org_id: org, full_name: name, email: mail, phone: '600 000 0' + id.slice(1).padStart(2, '0'), user_id: userId })
  const tenants = [
    tn('t1', 'o1', 'Lucía Moreno', 'lucia@demo.local', 'u-t1'), tn('t2', 'o1', 'Carlos Ruiz', 'carlos@demo.local'), tn('t3', 'o1', 'Ana Jiménez', 'ana@demo.local'),
    tn('t4', 'o2', 'Mateo Díaz', 'mateo@demo.local'), tn('t5', 'o2', 'Sara Gómez', 'sara@demo.local'),
    tn('t6', 'o3', 'Iván Torres', 'ivan@demo.local'), tn('t7', 'o1', 'Marta Ortega', 'marta@demo.local'), tn('t8', 'o1', 'Marcos y Laura Pérez (pareja)', 'perez@demo.local'),
  ]
  const clauses = CLAUSE_CATALOG.filter(c => ['duracion', 'renta_pago', 'fianza_andalucia', 'suministros', 'convivencia', 'inventario'].includes(c.code)).map(c => ({ code: c.code, title: c.title, body: c.body }))
  const ct = (id: string, org: string, r: string, ten: string, from: number, to: number, status: Contract['status'] = 'active'): Contract => {
    const room = rooms.find(x => x.id === r)!
    return { id, org_id: org, room_id: r, tenant_id: ten, starts_on: d(from), ends_on: d(to), rent_cents: room.rent_cents, deposit_cents: room.deposit_cents, clauses, status, signed_at: status === 'active' ? d(from - 2) : null, signed_pdf_path: null, version: 1 }
  }
  const contracts = [
    ct('c1', 'o1', 'r1', 't1', -200, 165), ct('c2', 'o1', 'r2', 't2', -140, 225), ct('c3', 'o1', 'r3', 't3', -325, 40),
    ct('c5', 'o2', 'r5', 't4', -95, 270), ct('c6', 'o2', 'r6', 't5', -80, 285), ct('c8', 'o3', 'r8', 't6', -60, 305),
    ct('c10', 'o1', 'r10', 't8', -120, 245), ct('c7', 'o1', 'r4', 't7', -400, -35, 'ended'),
  ]
  const lateIds = new Set(['c2', 'c6'])
  const payments: Payment[] = []
  for (const c of contracts) {
    buildSchedule(c.starts_on, c.ends_on, c.rent_cents).forEach((s, i) => {
      const past = s.due_on < today
      // Los dos morosos no pagaron sus últimas cuotas vencidas (60+ días atrás para c2, 1 mes para c6).
      const unpaid = lateIds.has(c.id) && past && s.due_on >= format(addDays(t, c.id === 'c2' ? -65 : -35), 'yyyy-MM-dd')
      const paid_on = past && !unpaid ? s.due_on : null
      payments.push({ id: `${c.id}-pay${i}`, contract_id: c.id, due_on: s.due_on, amount_cents: s.amount_cents, paid_on, status: paymentStatus({ due_on: s.due_on, paid_on }, today), method: paid_on ? 'transferencia' : null })
    })
  }
  const inventories: Inventory[] = [
    { id: 'i1', room_id: 'r1', contract_id: 'c1', kind: 'entry', taken_at: d(-200), notes: 'Entrada sin incidencias.' },
    { id: 'i2', room_id: 'r2', contract_id: 'c2', kind: 'entry', taken_at: d(-140), notes: '' },
    { id: 'i3', room_id: 'r5', contract_id: 'c5', kind: 'entry', taken_at: d(-95), notes: 'Colchón nuevo.' },
  ]
  const it = (id: string, inv: string, item: string, condition: InventoryItem['condition'], note = ''): InventoryItem => ({ id, inventory_id: inv, item, condition, note, photo_paths: [] })
  const inventoryItems = [
    it('ii1', 'i1', 'Cama 90 cm con colchón', 'ok'), it('ii2', 'i1', 'Armario empotrado', 'worn', 'Puerta con holgura'), it('ii3', 'i1', 'Escritorio y silla', 'ok'), it('ii4', 'i1', 'Persiana', 'ok'), it('ii5', 'i1', 'Cerradura y 2 llaves', 'ok'),
    it('ii6', 'i2', 'Cama 90 cm con colchón', 'ok'), it('ii7', 'i2', 'Cómoda', 'damaged', 'Arañazo en el lateral'), it('ii8', 'i2', 'Cerradura y 2 llaves', 'ok'),
    it('ii9', 'i3', 'Cama 135 cm', 'ok'), it('ii10', 'i3', 'Armario', 'ok'), it('ii11', 'i3', 'Lámpara de pie', 'ok'),
  ]
  const utilities: Utility[] = [
    { id: 'u1', property_id: 'p1', kind: 'Electricidad', period: format(addDays(t, -30), 'yyyy-MM'), total_cents: 14860, split_rule: 'equal', invoice_path: null },
    { id: 'u2', property_id: 'p1', kind: 'Agua', period: format(addDays(t, -30), 'yyyy-MM'), total_cents: 6320, split_rule: 'equal', invoice_path: null },
    { id: 'u3', property_id: 'p2', kind: 'Internet', period: format(addDays(t, -30), 'yyyy-MM'), total_cents: 3990, split_rule: 'equal', invoice_path: null },
    { id: 'u4', property_id: 'p3', kind: 'Electricidad', period: format(addDays(t, -30), 'yyyy-MM'), total_cents: 9810, split_rule: 'by_m2', invoice_path: null },
  ]
  const shares = utilities.flatMap(u => splitUtility(u.total_cents, rooms.filter(r => r.property_id === u.property_id), u.split_rule).map(s => ({ utility_id: u.id, ...s })))
  const at = (n: number) => `${d(n)}T10:00:00.000Z`
  const incidents: Incident[] = [
    { id: 'n1', code: 'INC-1001', category: 'Avería', org_id: 'o1', property_id: 'p1', room_id: 'r2', reported_by: 'u-owner', tenant_id: 't2', title: 'Gotera en el baño', description: 'Mancha de humedad en el techo del baño común.', severity: 'high', status: 'open', photo_paths: [], tenant_statement: '', created_at: at(-3), resolved_at: null },
    { id: 'n2', code: 'INC-1002', category: 'Queja', org_id: 'o1', property_id: 'p1', room_id: 'r1', reported_by: 'u-t1', tenant_id: 't1', title: 'Persiana atascada', description: 'No sube del todo.', severity: 'medium', status: 'in_progress', photo_paths: [], tenant_statement: 'Se atascó el lunes; no la forcé.', created_at: at(-10), resolved_at: null },
    { id: 'n3', code: 'INC-1003', category: 'Avería', org_id: 'o2', property_id: 'p2', room_id: 'r5', reported_by: 'u-agency', tenant_id: 't4', title: 'Cerradura floja', description: 'La llave gira en falso.', severity: 'low', status: 'seen', photo_paths: [], tenant_statement: '', created_at: at(-6), resolved_at: null },
    { id: 'n4', code: 'INC-1004', category: 'Avería', org_id: 'o3', property_id: 'p3', room_id: 'r8', reported_by: 'u-sub', tenant_id: 't6', title: 'Router sin conexión', description: 'Se reinició y no recupera la señal.', severity: 'medium', status: 'resolved', photo_paths: [], tenant_statement: '', created_at: at(-20), resolved_at: at(-18) },
  ]
  const ev = (id: string, incident_id: string, kind: string, note: string, n: number, internal = false): IncidentEvent => ({ id, incident_id, actor: null, kind, note, internal, created_at: at(n) })
  const events = [
    ev('e1', 'n1', 'created', 'Incidencia creada', -3), ev('e2', 'n2', 'created', 'Incidencia creada', -10), ev('e3', 'n2', 'status', 'En curso: avisado el técnico', -8),
    ev('e4', 'n3', 'created', 'Incidencia creada', -6), ev('e5', 'n3', 'status', 'Vista', -5), ev('e6', 'n4', 'created', 'Incidencia creada', -20), ev('e7', 'n4', 'status', 'Resuelta: router sustituido', -18),
  ]
  const access: Access[] = [
    { id: 'a1', property_id: 'p2', grantee_org_id: 'o2', kind: 'manage', consent_doc_path: null, max_total_rent_cents: null, status: 'granted', valid_until: null, granted_by: 'u-owner' },
    { id: 'a2', property_id: 'p3', grantee_org_id: 'o3', kind: 'sublet', consent_doc_path: 'o1/consentimiento-p3.pdf', max_total_rent_cents: 70000, status: 'granted', valid_until: d(25), granted_by: 'u-owner' },
    { id: 'a3', property_id: 'p1', grantee_org_id: 'o2', kind: 'view', consent_doc_path: null, max_total_rent_cents: null, status: 'revoked', valid_until: null, granted_by: 'u-owner' },
  ]
  return {
    orgs: [
      { id: 'o1', name: 'Propietario Demo', kind: 'owner', created_by: 'u-owner' },
      { id: 'o2', name: 'Gestión Antequera', kind: 'agency', created_by: 'u-agency' },
      { id: 'o3', name: 'Subarriendos Sur', kind: 'subtenant', created_by: 'u-sub' },
    ],
    members: [
      { org_id: 'o1', user_id: 'u-owner', role: 'admin', label: 'Tú (demo)' }, { org_id: 'o1', user_id: 'u-rocio', role: 'manager', label: 'Rocío (encargada)' },
      { org_id: 'o2', user_id: 'u-agency', role: 'admin', label: 'Gestión Antequera' }, { org_id: 'o3', user_id: 'u-sub', role: 'admin', label: 'Subarriendos Sur' },
    ],
    properties, access, rooms, tenants, contracts, inventories, inventoryItems, payments, utilities, shares, incidents, events,
    invites: [{ id: 'v1', org_id: 'o1', email: 'nuevo@ejemplo.es', role: 'manager', contract_id: null, expires_at: d(7), used_at: null }],
    dismissed: {},
    tickets: [
      { id: 'k1', number: 101, org_id: 'o1', created_by: 'u-owner', category: 'Contratos', subject: 'No me carga la vista previa', body: 'Ejemplo de ticket abierto.', status: 'open', attachment_paths: [], contact_phone: '+34600111222', whatsapp_clicked_at: null, created_at: at(-2) },
      { id: 'k2', number: 102, org_id: 'o2', created_by: 'u-agency', category: 'Cuenta', subject: 'Añadir a un compañero', body: 'Ejemplo de ticket respondido.', status: 'answered', attachment_paths: [], contact_phone: null, whatsapp_clicked_at: at(-5), created_at: at(-6) },
      { id: 'k3', number: 103, org_id: 'o3', created_by: 'u-sub', category: 'Cobros', subject: 'Duda sobre el calendario de cobros', body: 'Ejemplo de ticket cerrado.', status: 'closed', attachment_paths: [], contact_phone: null, whatsapp_clicked_at: null, created_at: at(-15) },
    ],
    ticketMessages: [
      { id: 'm1', ticket_id: 'k2', author: null, author_kind: 'platform', body: 'Hecho: ya puedes invitarlo desde Permisos y equipo.', created_at: at(-5) },
    ],
    settings: {
      o1: { org_id: 'o1', whatsapp_e164: '+34600000001', templates: {}, auto_reply: DEFAULT_AUTO_REPLY },
      o2: { org_id: 'o2', whatsapp_e164: null, templates: {}, auto_reply: DEFAULT_AUTO_REPLY },
      o3: { org_id: 'o3', whatsapp_e164: null, templates: {}, auto_reply: DEFAULT_AUTO_REPLY },
    },
    applications: [
      { id: 'ap1', org_id: 'o1', room_id: 'r4', token_hash: 'demo-cand', status: 'sent', applicant_name: '', email: '', phone: '', contact_verified: false, answers: {}, consent_at: null, consent_text_version: null, submitted_at: null, decided_at: null, decided_by: null, decision_reason_code: null, decision_note: '', retention_until: null, link_expires_at: d(10), created_at: at(-2) },
      { id: 'ap2', org_id: 'o1', room_id: 'r4', token_hash: 'x2', status: 'submitted', applicant_name: 'Paula Navarro', email: 'paula@demo.local', phone: '+34600222333', contact_verified: false, answers: { employment: 'employee', employer: 'Clínica Sur', seniority: '1-3y', contract_type: 'permanent', income_bracket: '1500-2000', move_in: d(20), duration_months: 12, reason: 'temp_work', adults: 1, pets: false, smoker: false }, consent_at: at(-3), consent_text_version: '2026-1', submitted_at: at(-3), decided_at: null, decided_by: null, decision_reason_code: null, decision_note: '', retention_until: null, link_expires_at: d(5), created_at: at(-5) },
      { id: 'ap3', org_id: 'o1', room_id: 'r4', token_hash: 'x3', status: 'in_review', applicant_name: 'Hugo Castillo', email: 'hugo@demo.local', phone: '+34600444555', contact_verified: true, answers: { employment: 'student', employer: 'Universidad de Málaga', seniority: '', contract_type: 'na', income_bracket: '<1000', move_in: d(30), duration_months: 9, reason: 'studies', adults: 1, pets: true, smoker: false, previous_landlord: { name: 'Casa Verde', email: 'cv@demo.local', phone: '' } }, consent_at: at(-6), consent_text_version: '2026-1', submitted_at: at(-6), decided_at: null, decided_by: null, decision_reason_code: null, decision_note: '', retention_until: null, link_expires_at: d(1), created_at: at(-8) },
      { id: 'ap4', org_id: 'o1', room_id: 'r4', token_hash: 'x4', status: 'rejected', applicant_name: 'Irene Vidal', email: 'irene@demo.local', phone: '', contact_verified: false, answers: { employment: 'self', employer: 'Diseño propio', seniority: '6-12m', contract_type: 'na', income_bracket: '1000-1500', move_in: d(15), duration_months: 6, reason: 'other', adults: 2, pets: false, smoker: true }, consent_at: at(-20), consent_text_version: '2026-1', submitted_at: at(-20), decided_at: at(-15), decided_by: 'u-owner', decision_reason_code: 'other_selected', decision_note: '', retention_until: d(75), link_expires_at: d(-5), created_at: at(-22) },
    ],
    signReqs: [], signatures: [], mailLog: [], downloads: [],
    references: [{ id: 'rf1', application_id: 'ap3', name: 'Casa Verde', email: 'cv@demo.local', phone: '', token_hash: 'demo-ref', response: null, answered_at: null }],
    templates: [{ org_id: 'o1', name: 'Habitación estándar', conditions: { keys_delivery: true, keys_flat: 2, keys_room: 1, eq_furnished: true, eq_bed: true, rule_smoking: 'no', term_checkin: '10:00 a 20:00' } }],
    appDocs: [
      { id: 'ad1', application_id: 'ap2', kind: 'payslip', path: 'o1/applications/ap2/nomina.pdf', verified_by: null, verified_at: null },
      { id: 'ad2', application_id: 'ap2', kind: 'work_contract', path: 'o1/applications/ap2/contrato.pdf', verified_by: 'u-owner', verified_at: at(-2) },
      { id: 'ad3', application_id: 'ap3', kind: 'study_proof', path: 'o1/applications/ap3/matricula.pdf', verified_by: null, verified_at: null },
    ],
    criteria: [{ id: 'cr1', org_id: 'o1', room_id: 'r4', required_docs: ['payslip', 'work_contract', 'study_proof'], notes_public: 'Habitación para una persona. Se piden documentos que acrediten ingresos o estudios. Los mismos criterios se aplican a todas las solicitudes.' }],
    audit: [{ id: 'au1', org_id: 'o1', actor: 'u-owner', action: 'application_rejected:other_selected', ref: 'ap4', created_at: at(-15) }],
    saleInterests: [
      { id: 's1', org_id: 'o1', property_id: 'p3', desired_price_cents: null, timeline: '6m', has_tenants: true, tenants_end_on: d(305), notes: 'Ejemplo: valoraría ofertas.', status: 'new', created_by: 'u-owner', created_at: at(-4) },
      { id: 's2', org_id: 'o2', property_id: 'p2', desired_price_cents: 14500000, timeline: 'nohurry', has_tenants: false, tenants_end_on: null, notes: '', status: 'contacted', created_by: 'u-agency', created_at: at(-12) },
    ],
    links: [{ id: 'l1', org_id: 'o1', tenant_id: 't1', contract_id: 'c1', room_id: 'r1', token_hash: DEMO_TENANT_TOKEN, expires_at: d(60), revoked_at: null, last_used_at: null, created_at: at(-1) }],
  }
}

const pIdsOfRoom = (db: Db, roomId: string, pIds: Set<string>) => pIds.has(db.rooms.find(r => r.id === roomId)?.property_id ?? '')
const RANK = { view: 1, sublet: 2, manage: 3 } as const

class DemoRepo implements HabRepo {
  readonly mode = 'demo' as const
  constructor(readonly session: Session) { assertDemoAllowed() }

  private db(): Db {
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(KEY)
        if (raw) return JSON.parse(raw) as Db
      } catch { /* datos corruptos: se regeneran */ }
      const fresh = buildDemoDb()
      this.save(fresh)
      return fresh
    }
    return buildDemoDb()
  }
  private save(db: Db) {
    if (typeof window !== 'undefined') window.localStorage.setItem(KEY, JSON.stringify(db))
  }
  private tx<T>(fn: (db: Db) => T): T {
    const db = this.db()
    const r = fn(db)
    this.save(db)
    return r
  }
  private get org() {
    if (!this.session.orgId) throw new Error('Esta acción es solo para organizaciones.')
    return this.session.orgId
  }
  // Mismas reglas que hab_can_access_property en SQL: 0 nada, 1 ver, 2 operar (sublet), 3 gestionar.
  private level(db: Db, propId: string): number {
    const s = this.session
    const p = db.properties.find(x => x.id === propId)
    if (!p || s.kind === 'tenant') return 0
    let lvl = p.org_id === s.orgId ? (s.role === 'viewer' ? 1 : 3) : 0
    for (const a of db.access) {
      if (a.property_id === propId && a.grantee_org_id === s.orgId && a.status === 'granted' && (!a.valid_until || a.valid_until >= todayStr())) {
        lvl = Math.max(lvl, s.role === 'viewer' ? 1 : RANK[a.kind])
      }
    }
    return lvl
  }
  private need(db: Db, propId: string, min: number) {
    if (this.level(db, propId) < min) throw new Error('No tienes permiso sobre este piso (o la concesión está revocada o caducada).')
  }

  async load(): Promise<Snapshot> {
    const db = this.db()
    const s = this.session
    if (s.kind === 'tenant') {
      const contracts = db.contracts.filter(c => c.tenant_id === s.tenantId)
      const cIds = new Set(contracts.map(c => c.id))
      const rooms = db.rooms.filter(r => contracts.some(c => c.room_id === r.id))
      const invs = db.inventories.filter(i => i.contract_id && cIds.has(i.contract_id))
      const incidents = db.incidents.filter(i => i.tenant_id === s.tenantId)
      return {
        org: null, orgNames: {}, properties: db.properties.filter(p => rooms.some(r => r.property_id === p.id)).map(p => ({ ...p, notes: '' })),
        rooms, tenants: db.tenants.filter(t => t.id === s.tenantId), clauses: CLAUSE_CATALOG, contracts,
        inventories: invs, inventoryItems: db.inventoryItems.filter(x => invs.some(i => i.id === x.inventory_id)),
        payments: db.payments.filter(p => cIds.has(p.contract_id)), utilities: [], shares: [],
        incidents, events: db.events.filter(e => !e.internal && incidents.some(i => i.id === e.incident_id)),
        access: [], members: [], invites: [], dismissed: [],
        tickets: db.tickets.filter(k => k.created_by === s.userId), ticketMessages: db.ticketMessages.filter(m => db.tickets.some(k => k.id === m.ticket_id && k.created_by === s.userId)),
        settings: null, tenantLinks: [], saleInterests: [], applications: [], applicationDocs: [], criteria: [], audit: [], references: [], roomTemplates: [], signRequests: [], signatures: [], mailLog: [],
      }
    }
    const props = db.properties.filter(p => this.level(db, p.id) >= 1)
    const pIds = new Set(props.map(p => p.id))
    const rooms = db.rooms.filter(r => pIds.has(r.property_id))
    const rIds = new Set(rooms.map(r => r.id))
    const contracts = db.contracts.filter(c => rIds.has(c.room_id))
    const cIds = new Set(contracts.map(c => c.id))
    const tIds = new Set(contracts.map(c => c.tenant_id))
    const invs = db.inventories.filter(i => rIds.has(i.room_id))
    const utilities = db.utilities.filter(u => pIds.has(u.property_id))
    // Incidencias: registro privado de la org (y solo mientras haya acceso al piso).
    const incidents = db.incidents.filter(i => i.org_id === s.orgId && pIds.has(i.property_id))
    const access = db.access.filter(a => a.grantee_org_id === s.orgId || db.properties.find(p => p.id === a.property_id)?.org_id === s.orgId)
    const orgIds = new Set<string>([s.orgId!, ...access.flatMap(a => [a.grantee_org_id]), ...props.map(p => p.org_id)])
    return {
      org: db.orgs.find(o => o.id === s.orgId) ?? null,
      orgNames: Object.fromEntries(db.orgs.filter(o => orgIds.has(o.id)).map(o => [o.id, o.name])),
      properties: props, rooms, clauses: CLAUSE_CATALOG,
      tenants: db.tenants.filter(t => t.org_id === s.orgId || tIds.has(t.id)),
      contracts, inventories: invs, inventoryItems: db.inventoryItems.filter(x => invs.some(i => i.id === x.inventory_id)),
      payments: db.payments.filter(p => cIds.has(p.contract_id)),
      utilities, shares: db.shares.filter(x => utilities.some(u => u.id === x.utility_id)),
      incidents, events: db.events.filter(e => incidents.some(i => i.id === e.incident_id)),
      access, members: db.members.filter(m => m.org_id === s.orgId), invites: db.invites.filter(v => v.org_id === s.orgId),
      dismissed: db.dismissed[s.orgId!] ?? [],
      tickets: db.tickets.filter(k => k.org_id === s.orgId),
      ticketMessages: db.ticketMessages.filter(m => db.tickets.some(k => k.id === m.ticket_id && k.org_id === s.orgId)),
      settings: db.settings[s.orgId!] ?? null,
      saleInterests: db.saleInterests.filter(x => x.org_id === s.orgId),
      applications: db.applications.filter(a => a.org_id === s.orgId && rIds.has(a.room_id)).map(a => omitAppHash(a)),
      applicationDocs: db.appDocs.filter(x => db.applications.some(a => a.id === x.application_id && a.org_id === s.orgId && rIds.has(a.room_id))),
      criteria: db.criteria.filter(c => c.org_id === s.orgId && rIds.has(c.room_id)),
      references: db.references.filter(r => db.applications.some(a => a.id === r.application_id && a.org_id === s.orgId)).map(r => omitRefHash(r)),
      roomTemplates: db.templates.filter(x => x.org_id === s.orgId),
      signRequests: db.signReqs.filter(r => cIds.has(r.contract_id)).map(r => { const c: Partial<typeof r> = { ...r }; delete c.token_hash; return c as SignRequest }),
      signatures: db.signatures.filter(g => cIds.has(g.contract_id)), mailLog: db.mailLog.filter(m => m.contract_id && cIds.has(m.contract_id)),
      audit: s.role === 'admin' ? db.audit.filter(x => x.org_id === s.orgId) : [],
      tenantLinks: db.links.filter(l => l.org_id === s.orgId && pIdsOfRoom(db, l.room_id, pIds)).map(l => omitHash(l)),
    }
  }

  async updateOrg(name: string) {
    const n = name.trim()
    if (n.length < 2 || n.length > 120) throw new Error('Nombre entre 2 y 120 caracteres')
    this.tx(db => { const o = db.orgs.find(x => x.id === this.org); if (o) o.name = n })
  }
  async createProperty(i: unknown) {
    const v = propertyInput.parse(i)
    return this.tx(db => {
      const { whole_size_m2, ...rest } = v; const p: Property = { ...rest, id: uid(), org_id: this.org }; db.properties.push(p)
      if (p.rental_mode === 'whole') db.rooms.push({ id: uid(), property_id: p.id, label: 'Piso entero', size_m2: whole_size_m2 ?? 60, rent_cents: p.whole_flat_rent_cents ?? 0, deposit_cents: p.whole_flat_rent_cents ?? 0, includes: { utilities: false, furniture: true, private_bath: false, window: true, lock: true }, status: 'free' })
      return p
    })
  }
  async updateProperty(id: string, patch: Partial<Property>) {
    this.tx(db => { this.need(db, id, 3); Object.assign(db.properties.find(p => p.id === id)!, patch) })
  }
  async createRoom(i: unknown) {
    const v = roomInput.parse(i)
    return this.tx(db => {
      this.need(db, v.property_id, 2)
      if (db.properties.find(p => p.id === v.property_id)?.rental_mode === 'whole' && db.rooms.some(r => r.property_id === v.property_id)) throw new Error('Un piso alquilado entero tiene una sola unidad')
      const r: Room = { ...v, id: uid() }; db.rooms.push(r); return r
    })
  }
  async updateRoom(id: string, patch: Partial<Room>) {
    this.tx(db => { const r = db.rooms.find(x => x.id === id); if (!r) return; this.need(db, r.property_id, 2); Object.assign(r, patch) })
  }
  async duplicateRooms(from: string, to: string) {
    return this.tx(db => {
      this.need(db, from, 1); this.need(db, to, 2)
      const src = db.rooms.filter(r => r.property_id === from)
      src.forEach(r => db.rooms.push({ ...r, id: uid(), property_id: to, status: 'free' }))
      return src.length
    })
  }
  async createTenant(i: unknown) {
    const v = tenantInput.parse(i)
    return this.tx(db => { const t: Tenant = { ...v, id: uid(), org_id: this.org, user_id: null }; db.tenants.push(t); return t })
  }
  async createContract(i: unknown) {
    const v = contractInput.parse(i)
    return this.tx(db => {
      const room = db.rooms.find(r => r.id === v.room_id)
      if (!room) throw new Error('Habitación no encontrada')
      this.need(db, room.property_id, 2)
      if (!db.tenants.some(t => t.id === v.tenant_id && t.org_id === this.org)) throw new Error('El inquilino no pertenece a tu organización')
      const c: Contract = { ...v, id: uid(), org_id: this.org, status: 'draft', signed_at: null, signed_pdf_path: null, version: 1 }
      db.contracts.push(c)
      return c
    })
  }
  async setContractStatus(id: string, status: Contract['status'], signedPdfPath?: string | null) {
    this.tx(db => {
      const c = db.contracts.find(x => x.id === id); if (!c) return
      const room = db.rooms.find(r => r.id === c.room_id)!
      this.need(db, room.property_id, 2)
      c.status = status
      if (signedPdfPath) { c.signed_pdf_path = signedPdfPath; c.signed_at = new Date().toISOString() }
      if (status === 'active') {
        room.status = 'occupied'
        if (!db.payments.some(p => p.contract_id === id)) {
          buildSchedule(c.starts_on, c.ends_on, c.rent_cents).forEach((s, n) => db.payments.push({ id: `${id}-pay${n}`, contract_id: id, due_on: s.due_on, amount_cents: s.amount_cents, paid_on: null, status: paymentStatus({ due_on: s.due_on, paid_on: null }, todayStr()), method: null }))
        }
      }
      if (status === 'ended') room.status = 'free'
    })
  }
  async createInventory(i: unknown) {
    const v = inventoryInput.parse(i)
    return this.tx(db => {
      const room = db.rooms.find(r => r.id === v.room_id)
      if (!room) throw new Error('Habitación no encontrada')
      this.need(db, room.property_id, 2)
      const inv: Inventory = { id: uid(), room_id: v.room_id, contract_id: v.contract_id, kind: v.kind, taken_at: v.taken_at, notes: v.notes }
      db.inventories.push(inv)
      v.items.forEach(x => db.inventoryItems.push({ id: uid(), inventory_id: inv.id, ...x }))
      return inv
    })
  }
  async markPaid(paymentId: string, method: string, paidOn: string) {
    this.tx(db => {
      const p = db.payments.find(x => x.id === paymentId); if (!p) return
      const c = db.contracts.find(x => x.id === p.contract_id)!
      this.need(db, db.rooms.find(r => r.id === c.room_id)!.property_id, 2)
      p.paid_on = paidOn; p.status = 'paid'; p.method = method
    })
  }
  async createUtility(i: unknown) {
    const v = utilityInput.parse(i)
    return this.tx(db => {
      this.need(db, v.property_id, 2)
      const u: Utility = { ...v, id: uid() }
      db.utilities.push(u)
      splitUtility(u.total_cents, db.rooms.filter(r => r.property_id === u.property_id), u.split_rule).forEach(s => db.shares.push({ utility_id: u.id, ...s }))
      return u
    })
  }
  async createIncident(i: unknown) {
    const v = incidentInput.parse(i)
    return this.tx(db => {
      const s = this.session
      let org = s.orgId
      if (s.kind === 'tenant') {
        const mine = db.contracts.find(c => c.tenant_id === s.tenantId && c.room_id === v.room_id && c.status === 'active')
        if (!mine) throw new Error('Solo puedes avisar de incidencias de tu habitación')
        org = mine.org_id
      } else this.need(db, v.property_id, 1)
      const n: Incident = { ...v, id: uid(), code: nextCode(db), category: null, org_id: org!, reported_by: s.userId, tenant_id: s.tenantId, status: 'open', created_at: new Date().toISOString(), resolved_at: null }
      db.incidents.push(n)
      db.events.push({ id: uid(), incident_id: n.id, actor: s.userId, kind: 'created', note: 'Incidencia creada', internal: false, created_at: n.created_at })
      return n
    })
  }
  async addIncidentEvent(incidentId: string, kind: string, note: string, internal: boolean) {
    const v = eventInput.parse({ incident_id: incidentId, kind, note, internal })
    this.tx(db => {
      if (!db.incidents.some(x => x.id === incidentId && x.org_id === this.session.orgId)) throw new Error('Incidencia no accesible')
      db.events.push({ id: uid(), incident_id: incidentId, actor: this.session.userId, kind: v.kind, note: v.note, internal: v.internal, created_at: new Date().toISOString() })
    })
  }
  async setIncidentStatus(id: string, status: Incident['status']) {
    this.tx(db => {
      const n = db.incidents.find(x => x.id === id && x.org_id === this.session.orgId); if (!n) throw new Error('Incidencia no accesible')
      n.status = status; n.resolved_at = status === 'resolved' ? new Date().toISOString() : null
      db.events.push({ id: uid(), incident_id: id, actor: this.session.userId, kind: 'status', note: `Estado: ${status}`, internal: false, created_at: new Date().toISOString() })
    })
  }
  async setTenantStatement(incidentId: string, text: string) {
    this.tx(db => {
      const n = db.incidents.find(x => x.id === incidentId && x.tenant_id === this.session.tenantId); if (!n) throw new Error('Incidencia no accesible')
      n.tenant_statement = text.trim().slice(0, 2000)
    })
  }
  async createAccess(i: unknown) {
    const v = accessInput.parse(i)
    return this.tx(db => {
      const p = db.properties.find(x => x.id === v.property_id)
      if (!p || p.org_id !== this.org || this.session.role !== 'admin') throw new Error('Solo el administrador de la organización propietaria puede conceder permisos')
      if (!db.orgs.some(o => o.id === v.grantee_org_id)) throw new Error('No existe ninguna organización con ese código')
      if (v.grantee_org_id === this.org) throw new Error('No puedes concederte permisos a ti mismo')
      const a: Access = { ...v, id: uid(), status: 'granted', granted_by: this.session.userId }
      db.access.push(a)
      return a
    })
  }
  async revokeAccess(id: string) {
    this.tx(db => {
      const a = db.access.find(x => x.id === id)
      const p = db.properties.find(x => x.id === a?.property_id)
      if (!a || !p || p.org_id !== this.org) throw new Error('Permiso no accesible')
      a.status = 'revoked'
    })
  }
  async createInvite(i: unknown) {
    const v = inviteInput.parse(i)
    const token = uid().replace(/-/g, '')
    this.tx(db => db.invites.push({ id: uid(), org_id: this.org, email: v.email, role: v.role, contract_id: v.contract_id, expires_at: format(addDays(new Date(), 7), 'yyyy-MM-dd'), used_at: null }))
    return { token }
  }
  async dismissAlert(key: string) {
    this.tx(db => { (db.dismissed[this.org] ??= []).push(key) })
  }

  async createTicket(i: unknown) {
    const v = ticketInput.parse(i)
    return this.tx(db => {
      const s = this.session
      const org = s.orgId ?? db.contracts.find(c => c.tenant_id === s.tenantId)?.org_id ?? null
      const k: SupportTicket = { ...v, id: uid(), number: Math.max(100, ...db.tickets.map(x => x.number)) + 1, org_id: org, created_by: s.userId, status: 'open', whatsapp_clicked_at: null, created_at: new Date().toISOString() }
      db.tickets.push(k)
      return k
    })
  }
  async ticketWhatsappClicked(id: string) {
    this.tx(db => { const k = db.tickets.find(x => x.id === id && (x.created_by === this.session.userId || x.org_id === this.session.orgId)); if (k) k.whatsapp_clicked_at = new Date().toISOString() })
  }
  async addTicketMessage(ticketId: string, body: string) {
    const b = body.trim(); if (!b || b.length > 2000) throw new Error('Mensaje vacío o demasiado largo')
    this.tx(db => {
      const k = db.tickets.find(x => x.id === ticketId && (this.session.platformAdmin || x.created_by === this.session.userId || x.org_id === this.session.orgId)); if (!k) throw new Error('Ticket no accesible')
      db.ticketMessages.push({ id: uid(), ticket_id: k.id, author: this.session.userId, author_kind: this.session.platformAdmin ? 'platform' : 'user', body: b, created_at: new Date().toISOString() })
    })
  }
  async saveSettings(i: unknown) {
    const v = settingsInput.parse(i)
    this.tx(db => {
      if (this.session.role !== 'admin') throw new Error('Solo el administrador de la organización')
      db.settings[this.org] = { org_id: this.org, whatsapp_e164: v.whatsapp_e164, templates: v.templates, auto_reply: v.auto_reply, auto_email_copy: v.auto_email_copy ?? db.settings[this.org]?.auto_email_copy }
    })
  }
  async createTenantLink(contractId: string) {
    return this.tx(db => {
      const c = db.contracts.find(x => x.id === contractId); if (!c) throw new Error('Contrato no encontrado')
      this.need(db, db.rooms.find(r => r.id === c.room_id)!.property_id, 2)
      db.links.filter(l => l.contract_id === contractId && !l.revoked_at).forEach(l => { l.revoked_at = new Date().toISOString() })
      const token = uid().replace(/-/g, '') + uid().replace(/-/g, '')
      const link = { id: uid(), org_id: c.org_id, tenant_id: c.tenant_id, contract_id: c.id, room_id: c.room_id, token_hash: token, expires_at: format(addDays(new Date(), TENANT_LINK_DAYS), 'yyyy-MM-dd'), revoked_at: null, last_used_at: null, created_at: new Date().toISOString() }
      db.links.push(link)
      return { token, link: omitHash(link) }
    })
  }
  async revokeTenantLink(id: string) {
    this.tx(db => { const l = db.links.find(x => x.id === id && x.org_id === this.session.orgId); if (!l) throw new Error('Enlace no accesible'); l.revoked_at = new Date().toISOString() })
  }
  async saveCriteria(roomId: string, docs: DocKind[], notes: string) {
    this.tx(db => {
      const room = db.rooms.find(r => r.id === roomId); if (!room) throw new Error('Habitación no encontrada'); this.need(db, room.property_id, 2)
      const c = db.criteria.find(x => x.room_id === roomId)
      if (c) { c.required_docs = docs; c.notes_public = notes.slice(0, 1000) } else db.criteria.push({ id: uid(), org_id: this.org, room_id: roomId, required_docs: docs, notes_public: notes.slice(0, 1000) })
    })
  }
  async createApplicationLink(roomId: string) {
    return this.tx(db => {
      const room = db.rooms.find(r => r.id === roomId); if (!room) throw new Error('Habitación no encontrada'); this.need(db, room.property_id, 2)
      const token = uid().replace(/-/g, '') + uid().replace(/-/g, ''); const id = uid()
      db.applications.push({ id, org_id: this.org, room_id: roomId, token_hash: token, status: 'sent', applicant_name: '', email: '', phone: '', contact_verified: false, answers: {}, consent_at: null, consent_text_version: null, submitted_at: null, decided_at: null, decided_by: null, decision_reason_code: null, decision_note: '', retention_until: null, link_expires_at: format(addDays(new Date(), 14), 'yyyy-MM-dd'), created_at: new Date().toISOString() })
      return { token, id }
    })
  }
  private app(db: Db, id: string) {
    const a = db.applications.find(x => x.id === id && x.org_id === this.session.orgId); if (!a) throw new Error('Solicitud no accesible')
    this.need(db, db.rooms.find(r => r.id === a.room_id)!.property_id, 2); return a
  }
  async setContactVerified(appId: string, v: boolean) { this.tx(db => { this.app(db, appId).contact_verified = v }) }
  async verifyDoc(docId: string, verified: boolean) {
    this.tx(db => { const d = db.appDocs.find(x => x.id === docId); if (!d) return; this.app(db, d.application_id); d.verified_by = verified ? this.session.userId : null; d.verified_at = verified ? new Date().toISOString() : null })
  }
  private decide(db: Db, a: Application & { token_hash: string }, decision: string, reason?: string, note = '') {
    const v = decisionInput.parse({ decision, reason, note })
    if (a.status !== 'submitted' && a.status !== 'in_review') throw new Error('La solicitud no está pendiente de decisión')
    a.status = v.decision; a.decided_at = new Date().toISOString(); a.decided_by = this.session.userId; a.decision_note = v.note
    a.decision_reason_code = v.decision === 'rejected' ? v.reason! : null; a.retention_until = format(addDays(new Date(), 90), 'yyyy-MM-dd')
    if (v.decision === 'approved') { a.answers = {}; db.appDocs = db.appDocs.filter(x => x.application_id !== a.id) } // se eliminan los datos no necesarios
    db.audit.push({ id: uid(), org_id: a.org_id, actor: this.session.userId, action: `application_${v.decision}${v.reason ? ':' + v.reason : ''}`, ref: a.id, created_at: new Date().toISOString() })
  }
  async decideApplication(appId: string, decision: 'approved' | 'rejected', reason: string | undefined, note: string) { this.tx(db => this.decide(db, this.app(db, appId), decision, reason, note)) }
  async approveAndCreateContract(appId: string) {
    return this.tx(db => {
      const a = this.app(db, appId); const room = db.rooms.find(r => r.id === a.room_id)!
      const ans = a.answers; if (!ans.move_in || !ans.duration_months) throw new Error('Faltan la fecha de entrada y la duración en la solicitud')
      const end = new Date(ans.move_in + 'T00:00:00'); end.setMonth(end.getMonth() + ans.duration_months)
      const t: Tenant = { id: uid(), org_id: this.org, full_name: a.applicant_name, email: a.email, phone: a.phone, user_id: null }; db.tenants.push(t)
      const c: Contract = { id: uid(), org_id: this.org, room_id: room.id, tenant_id: t.id, starts_on: ans.move_in, ends_on: format(end, 'yyyy-MM-dd'), rent_cents: room.rent_cents, deposit_cents: room.deposit_cents, clauses: [], status: 'draft', signed_at: null, signed_pdf_path: null, version: 1 }
      db.contracts.push(c); this.decide(db, a, 'approved'); return c // DNI y fecha de nacimiento se piden al completar el contrato
    })
  }
  async deleteApplication(appId: string) {
    this.tx(db => { const a = this.app(db, appId); db.applications = db.applications.filter(x => x.id !== a.id); db.appDocs = db.appDocs.filter(x => x.application_id !== a.id)
      db.audit.push({ id: uid(), org_id: a.org_id, actor: this.session.userId, action: 'application_deleted', ref: a.id, created_at: new Date().toISOString() }) })
  }

  async createReference(appId: string) {
    return this.tx(db => {
      const a = this.app(db, appId); const p = a.answers.previous_landlord; if (!p?.name) throw new Error('El candidato no indicó un arrendador anterior')
      const token = uid().replace(/-/g, '') + uid().replace(/-/g, '')
      db.references.push({ id: uid(), application_id: a.id, name: p.name, email: p.email, phone: p.phone, token_hash: token, response: null, answered_at: null })
      return { token }
    })
  }
  async saveRoomTemplate(name: string, conditions: Record<string, boolean | number | string>) {
    const n = name.trim().slice(0, 80); if (!n) throw new Error('Pon un nombre a la plantilla')
    this.tx(db => { db.templates = db.templates.filter(x => !(x.org_id === this.org && x.name === n)); db.templates.push({ org_id: this.org, name: n, conditions }) })
  }
  async deleteRoomTemplate(name: string) { this.tx(db => { db.templates = db.templates.filter(x => !(x.org_id === this.org && x.name === name)) }) }
  async setContractSharedPdf(contractId: string, path: string) {
    this.tx(db => { const c = db.contracts.find(x => x.id === contractId); if (!c) throw new Error('Contrato no encontrado'); this.need(db, db.rooms.find(r => r.id === c.room_id)!.property_id, 2); c.shared_pdf_path = path })
  }
  async createSignRequests(contractId: string, signers: { role: SignRole; name: string; email: string }[]) {
    return this.tx(db => {
      const c = db.contracts.find(x => x.id === contractId); if (!c) throw new Error('Contrato no encontrado')
      this.need(db, db.rooms.find(r => r.id === c.room_id)!.property_id, 2)
      if (!c.shared_pdf_path) throw new Error('Genera primero el PDF del contrato')
      db.signReqs.filter(r => r.contract_id === contractId && !r.used_at && !r.revoked_at).forEach(r => { r.revoked_at = new Date().toISOString() })
      const out = signers.map(s => {
        const token = uid().replace(/-/g, '') + uid().replace(/-/g, '')
        db.signReqs.push({ id: uid(), contract_id: contractId, org_id: c.org_id, role: s.role, signer_name: s.name, signer_email: s.email, token_hash: token, expires_at: format(addDays(new Date(), 7), "yyyy-MM-dd'T'HH:mm:ss'Z'"), used_at: null, revoked_at: null, created_at: new Date().toISOString() })
        return { role: s.role, token }
      })
      if (c.status === 'draft') c.status = 'pending_signature'
      return out
    })
  }
  async invalidateSignRequests(contractId: string) { this.tx(db => { db.signReqs.filter(r => r.contract_id === contractId && !r.used_at && !r.revoked_at).forEach(r => { r.revoked_at = new Date().toISOString() }) }) }
  async createDownloadLink(contractId: string) {
    return this.tx(db => { const c = db.contracts.find(x => x.id === contractId); if (!c) throw new Error('Contrato no encontrado'); this.need(db, db.rooms.find(r => r.id === c.room_id)!.property_id, 2)
      const token = uid().replace(/-/g, '') + uid().replace(/-/g, ''); db.downloads = db.downloads.filter(d => d.contract_id !== contractId); db.downloads.push({ token, contract_id: contractId }); return token })
  }
  async adminOverview(): Promise<PlatformOverview> {
    if (!this.session.platformAdmin) throw new Error('Solo el administrador de la plataforma')
    const db = this.db()
    return {
      counts: { orgs: db.orgs.length, properties: db.properties.length, rooms: db.rooms.length, contracts: db.contracts.length, sale_interests_new: db.saleInterests.filter(x => x.status === 'new').length },
      tickets: [...db.tickets].sort((a, b) => b.number - a.number),
      saleInterests: db.saleInterests,
      orgNames: Object.fromEntries(db.orgs.map(o => [o.id, o.name])),
    }
  }
  async createSaleInterest(i: unknown) {
    const v = saleInterestInput.parse(i)
    return this.tx(db => {
      if (db.properties.find(p => p.id === v.property_id)?.org_id !== this.org) throw new Error('Solo la organización propietaria del piso puede ofrecerlo')
      const x: SaleInterest = { ...v, id: uid(), org_id: this.org, status: 'new', created_by: this.session.userId, created_at: new Date().toISOString() }
      db.saleInterests.push(x); return x
    })
  }
  async adminSetSaleStatus(id: string, status: SaleInterest['status']) {
    if (!this.session.platformAdmin) throw new Error('Solo el administrador de la plataforma')
    this.tx(db => { const x = db.saleInterests.find(y => y.id === id); if (x) x.status = status })
  }
  async adminSetTicketStatus(id: string, status: SupportTicket['status']) {
    if (!this.session.platformAdmin) throw new Error('Solo el administrador de la plataforma')
    this.tx(db => { const k = db.tickets.find(x => x.id === id); if (k) k.status = status })
  }

  async upload(bucket: Bucket, file: File) {
    const err = validateUpload(file, bucket)
    if (err) throw new Error(err)
    const path = `${this.session.orgId ?? 'tenant'}/${uid()}-${file.name.replace(/[^\w.-]/g, '_').slice(0, 60)}`
    const dataUrl = file.type.startsWith('image/') ? await shrink(file) : await readAsDataUrl(file)
    try {
      const files = JSON.parse(window.localStorage.getItem(FILES) ?? '{}')
      files[path] = dataUrl
      window.localStorage.setItem(FILES, JSON.stringify(files))
    } catch { throw new Error('Sin espacio en el navegador para guardar el archivo de la demo') }
    return path
  }
  async fileUrl(_bucket: Bucket, path: string) {
    try { return (JSON.parse(window.localStorage.getItem(FILES) ?? '{}') as Record<string, string>)[path] ?? null } catch { return null }
  }
  async deleteAccount() {
    window.localStorage.removeItem(KEY); window.localStorage.removeItem(FILES)
  }
}

const omitHash = (l: TenantLink & { token_hash: string }): TenantLink => { const c: Partial<typeof l> = { ...l }; delete c.token_hash; return c as TenantLink }
const omitAppHash = (a: Application & { token_hash: string }): Application => { const c: Partial<typeof a> = { ...a }; delete c.token_hash; return c as Application }
const omitRefHash = (r: Reference & { token_hash: string }): Reference => { const c: Partial<typeof r> = { ...r }; delete c.token_hash; return c as Reference }
const nextCode = (db: Db) => `INC-${1001 + db.incidents.length}`

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(r.error); r.readAsDataURL(file) })
}
// Reduce la foto a 640 px para que quepa en localStorage.
async function shrink(file: File): Promise<string> {
  const src = await readAsDataUrl(file)
  const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src })
  const k = Math.min(1, 640 / Math.max(img.width, img.height))
  const c = document.createElement('canvas')
  c.width = Math.round(img.width * k); c.height = Math.round(img.height * k)
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
  return c.toDataURL('image/jpeg', 0.7)
}

export function createDemoRepo(session: Session): HabRepo {
  return new DemoRepo(session)
}
export function resetDemoData() {
  if (typeof window !== 'undefined') { window.localStorage.removeItem(KEY); window.localStorage.removeItem(FILES) }
}
export function demoSessionFor(role: DemoRole, name?: string): Session {
  const s = DEMO_SESSIONS[role]
  return name ? { ...s, name } : s
}

// ---- Mini-portal público del inquilino en demo (la ruta real usa funciones SQL; aquí, localStorage) ----
function demoDb(): Db {
  assertDemoAllowed()
  const raw = typeof window !== 'undefined' ? window.localStorage.getItem(KEY) : null
  if (raw) { try { return JSON.parse(raw) as Db } catch { /* regenerar */ } }
  const f = buildDemoDb()
  if (typeof window !== 'undefined') window.localStorage.setItem(KEY, JSON.stringify(f))
  return f
}
export function demoPortalInfo(token: string): PortalInfo | null {
  const db = demoDb()
  const l = db.links.find(x => x.token_hash === token && !x.revoked_at && x.expires_at >= todayStr())
  if (!l) return null
  const org = db.orgs.find(o => o.id === l.org_id)!
  const st = db.settings[l.org_id]
  const room = db.rooms.find(r => r.id === l.room_id)!
  return {
    link_id: l.id, org_id: l.org_id, tenant_name: db.tenants.find(t => t.id === l.tenant_id)!.full_name, room_label: room.label,
    property_name: db.properties.find(p => p.id === room.property_id)!.name, org_name: org.name, org_whatsapp: st?.whatsapp_e164 ?? null,
    contract_pdf_path: db.contracts.find(c => c.id === l.contract_id)?.shared_pdf_path ?? null, auto_reply: st?.auto_reply || DEFAULT_AUTO_REPLY, templates: { ...DEFAULT_TEMPLATES, ...(st?.templates ?? {}) },
    incidents: db.incidents.filter(n => n.tenant_id === l.tenant_id && n.room_id === l.room_id).map(n => ({ code: n.code, title: n.title, category: n.category, status: n.status, created_at: n.created_at })),
  }
}
export function demoPortalSubmit(token: string, input: unknown): { code: string } {
  const v = portalSubmitInput.parse(input)
  const db = demoDb()
  const l = db.links.find(x => x.token_hash === token && !x.revoked_at && x.expires_at >= todayStr())
  if (!l) throw new Error('Enlace no válido o caducado')
  const room = db.rooms.find(r => r.id === l.room_id)!
  const n: Incident = {
    id: uid(), code: nextCode(db), category: v.category, org_id: l.org_id, property_id: room.property_id, room_id: room.id, reported_by: null, tenant_id: l.tenant_id,
    title: `${v.category}: ${v.description.slice(0, 60)}`, description: '', severity: 'medium', status: 'open', photo_paths: v.photo_paths, tenant_statement: v.description, created_at: new Date().toISOString(), resolved_at: null,
  }
  db.incidents.push(n)
  db.events.push({ id: uid(), incident_id: n.id, actor: null, kind: 'created', note: `Aviso del inquilino por enlace (${v.category})`, internal: false, created_at: n.created_at })
  l.last_used_at = n.created_at
  window.localStorage.setItem(KEY, JSON.stringify(db))
  return { code: n.code }
}
export async function demoPortalUpload(file: File): Promise<string> {
  const err = validateUpload(file, 'hab-photos'); if (err) throw new Error(err)
  const path = `o1/tenant-link/demo/${uid()}.jpg`
  const files = JSON.parse(window.localStorage.getItem(FILES) ?? '{}'); files[path] = await shrink(file)
  window.localStorage.setItem(FILES, JSON.stringify(files)); return path
}

// ---- Formulario público del candidato en demo (la ruta real usa funciones SQL) ----
const liveApp = (db: Db, token: string) => db.applications.find(x => x.token_hash === token && (x.status !== 'sent' || x.link_expires_at >= todayStr()))
export function demoApplicantInfo(token: string): ApplicantInfo | null {
  const db = demoDb(); const a = liveApp(db, token); if (!a) return null
  const room = db.rooms.find(r => r.id === a.room_id)!; const crit = db.criteria.find(c => c.room_id === a.room_id)
  return { id: a.id, org_id: a.org_id, status: a.status, applicant_name: a.applicant_name, email: a.email, phone: a.phone, answers: a.answers, consent_text_version: a.consent_text_version,
    room_label: room.label, rent_cents: room.rent_cents, property_name: db.properties.find(p => p.id === room.property_id)!.name, org_name: db.orgs.find(o => o.id === a.org_id)!.name,
    required_docs: crit?.required_docs ?? [], notes_public: crit?.notes_public ?? '', docs: db.appDocs.filter(d => d.application_id === a.id).map(d => ({ kind: d.kind })) }
}
export function demoApplicantSave(token: string, contact: unknown, answers: unknown, submit: boolean) {
  const db = demoDb(); const a = liveApp(db, token); if (!a || a.status !== 'sent') throw new Error('Solicitud no disponible')
  const c = applicantSaveInput.parse(contact)
  if (submit) { if (!c.consent) throw new Error('Hace falta el consentimiento'); a.answers = applicationAnswers.parse(answers) } else a.answers = (answers ?? {}) as Application['answers']
  a.applicant_name = c.name; a.email = c.email; a.phone = c.phone
  a.consent_at = c.consent ? a.consent_at ?? new Date().toISOString() : null; a.consent_text_version = c.consent ? CONSENT_VERSION : null
  if (submit) { a.status = 'submitted'; a.submitted_at = new Date().toISOString() }
  window.localStorage.setItem(KEY, JSON.stringify(db))
}
export async function demoApplicantUpload(token: string, kind: DocKind, file: File): Promise<void> {
  const err = validateUpload(file, 'hab-docs'); if (err) throw new Error(err)
  const db = demoDb(); const a = liveApp(db, token); if (!a || a.status !== 'sent') throw new Error('Solicitud no disponible')
  const path = `${a.org_id}/applications/${a.id}/${uid()}-${file.name.replace(/[^\w.-]/g, '_').slice(0, 40)}`
  const files = JSON.parse(window.localStorage.getItem(FILES) ?? '{}'); files[path] = file.type.startsWith('image/') ? await shrink(file) : await readAsDataUrl(file)
  window.localStorage.setItem(FILES, JSON.stringify(files))
  db.appDocs.push({ id: uid(), application_id: a.id, kind, path, verified_by: null, verified_at: null }); window.localStorage.setItem(KEY, JSON.stringify(db))
}
export function demoApplicantWithdraw(token: string) {
  const db = demoDb(); const a = liveApp(db, token); if (!a) return
  a.status = 'withdrawn'; a.decision_reason_code = 'withdrawn_by_applicant'; a.retention_until = format(addDays(new Date(), 90), 'yyyy-MM-dd'); window.localStorage.setItem(KEY, JSON.stringify(db))
}

// URL local del PDF del contrato compartido (en demo el PDF vive en localStorage).
export function demoContractUrl(path: string): string | null {
  try { return (JSON.parse(window.localStorage.getItem(FILES) ?? '{}') as Record<string, string>)[path] ?? null } catch { return null }
}
// ---- Respuesta pública de la referencia (demo) ----
export function demoReferenceInfo(token: string): ReferenceInfo | null {
  const db = demoDb(); const r = db.references.find(x => x.token_hash === token); if (!r) return null
  const a = db.applications.find(x => x.id === r.application_id)!
  return { answered: !!r.answered_at, reference_name: r.name, applicant_name: a.applicant_name, org_name: db.orgs.find(o => o.id === a.org_id)!.name }
}
export function demoReferenceAnswer(token: string, input: unknown) {
  const v = referenceAnswerInput.parse(input); const db = demoDb(); const r = db.references.find(x => x.token_hash === token && !x.answered_at)
  if (!r) throw new Error('Enlace no válido o ya respondido')
  r.response = v as ReferenceResponse; r.answered_at = new Date().toISOString(); window.localStorage.setItem(KEY, JSON.stringify(db))
}

// ---- Firma electrónica simple en demo (todo en localStorage; el envío de email se simula) ----
const dataUrlBytes = (u: string) => { const b = atob(u.split(',')[1]); const a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a }
const bytesDataUrl = (b: Uint8Array, mime: string) => { let s = ''; b.forEach(c => { s += String.fromCharCode(c) }); return `data:${mime};base64,${btoa(s)}` }
const storedFile = (path: string | null | undefined) => { try { return path ? (JSON.parse(window.localStorage.getItem(FILES) ?? '{}') as Record<string, string>)[path] ?? null : null } catch { return null } }
const liveSign = (db: Db, token: string) => db.signReqs.find(r => r.token_hash === token && !r.used_at && !r.revoked_at && r.expires_at > new Date().toISOString())
export function demoSignInfo(token: string): SignInfo | null {
  const db = demoDb(); const r = liveSign(db, token); if (!r) return null
  const c = db.contracts.find(x => x.id === r.contract_id); if (!c?.shared_pdf_path) return null
  const room = db.rooms.find(x => x.id === c.room_id)!
  return { request_id: r.id, contract_id: c.id, role: r.role, signer_name: r.signer_name, contract_title: `${room.label} · ${db.properties.find(p => p.id === room.property_id)?.name}`, org_name: db.orgs.find(o => o.id === r.org_id)!.name, mail_enabled: false, already_signed_by_other: db.signatures.some(g => g.contract_id === c.id) }
}
export function demoSignPdfUrl(token: string): string | null { const db = demoDb(); const r = liveSign(db, token); return r ? storedFile(db.contracts.find(x => x.id === r.contract_id)?.shared_pdf_path) : null }
export async function demoSignSubmit(token: string, input: unknown): Promise<SignResult> {
  const v = signInput.parse(input); const db = demoDb(); const r = liveSign(db, token); if (!r) throw new Error('Enlace no válido, usado o caducado')
  const c = db.contracts.find(x => x.id === r.contract_id)!; const orig = storedFile(c.shared_pdf_path); if (!orig) throw new Error('El contrato no tiene PDF')
  const { sealPdf, sha256Hex, SIGN_CONSENT_TEXT } = await import('./seal-pdf'); const { contractNumber } = await import('./contract-form')
  const bytes = dataUrlBytes(orig); const hash = await sha256Hex(bytes); const sigPath = `${r.org_id}/signatures/${c.id}/${r.id}.png`
  const files = JSON.parse(window.localStorage.getItem(FILES) ?? '{}'); files[sigPath] = v.signature
  window.localStorage.setItem(FILES, JSON.stringify(files)) // antes de sellar: el sellado lee las imágenes guardadas
  db.signatures.push({ id: uid(), contract_id: c.id, request_id: r.id, role: r.role, signer_name: v.name, signed_at: new Date().toISOString(), ip: 'demo (127.0.0.1)', user_agent: navigator.userAgent.slice(0, 300), doc_hash: hash, signature_path: sigPath, method: 'link', consent_text: SIGN_CONSENT_TEXT })
  r.used_at = new Date().toISOString(); r.signer_name = v.name
  const reqs = db.signReqs.filter(x => x.contract_id === c.id && !x.revoked_at); const all = reqs.every(x => x.used_at)
  const dl = uid().replace(/-/g, '') + uid().replace(/-/g, ''); db.downloads.push({ token: dl, contract_id: c.id })
  const simulated: string[] = []
  if (all) {
    const sigs = db.signatures.filter(g => g.contract_id === c.id)
    const signers = sigs.map(g => ({ role: g.role, name: g.signer_name, signedAt: g.signed_at, ip: g.ip ?? '', userAgent: g.user_agent ?? '', method: g.method, png: storedFile(g.signature_path) ? dataUrlBytes(storedFile(g.signature_path)!) : null }))
    const sealed = await sealPdf(bytes, signers, hash, contractNumber(c.id, c.starts_on)); const sealedPath = `${r.org_id}/contracts/${c.id}/sellado.pdf`
    files[sealedPath] = bytesDataUrl(sealed, 'application/pdf'); c.sealed_pdf_path = sealedPath; c.signed_pdf_path = sealedPath; c.signed_at = new Date().toISOString(); c.status = 'active'
    const room = db.rooms.find(x => x.id === c.room_id)!; room.status = 'occupied'
    if (!db.payments.some(p => p.contract_id === c.id)) buildSchedule(c.starts_on, c.ends_on, c.rent_cents).forEach((s, n) => db.payments.push({ id: `${c.id}-pay${n}`, contract_id: c.id, due_on: s.due_on, amount_cents: s.amount_cents, paid_on: null, status: paymentStatus({ due_on: s.due_on, paid_on: null }, todayStr()), method: null }))
    const auto = db.settings[r.org_id]?.auto_email_copy
    for (const q of reqs) {
      if (!q.signer_email || (q.role === 'landlord' && !auto)) continue
      db.mailLog.push({ id: uid(), contract_id: c.id, to_role: q.role, kind: 'sealed', status: 'sent', attempts: 1, created_at: new Date().toISOString() })
      simulated.push(`${q.role === 'landlord' ? 'Arrendador' : 'Arrendatario'}: ${q.signer_email}`)
    }
  }
  window.localStorage.setItem(FILES, JSON.stringify(files)); window.localStorage.setItem(KEY, JSON.stringify(db))
  return { all_signed: all, download_token: dl, simulated_emails: simulated }
}
export function demoDownloadUrl(token: string): string | null {
  const db = demoDb(); const d = db.downloads.find(x => x.token === token); const c = d && db.contracts.find(x => x.id === d.contract_id)
  return c ? storedFile(c.sealed_pdf_path ?? c.shared_pdf_path) : null
}
// PDF sencillo de ejemplo para probar la firma en demo (el real sale del asistente de contratos).
export async function demoSamplePdf(contractId: string, repo: { upload(b: 'hab-docs', f: File): Promise<string>; setContractSharedPdf(id: string, p: string): Promise<void> }) {
  const { PDFDocument, StandardFonts } = await import('pdf-lib'); const doc = await PDFDocument.create(); const p = doc.addPage([595, 842]); const f = await doc.embedFont(StandardFonts.Helvetica)
  p.drawText('Contrato de ejemplo (demo)', { x: 56, y: 760, size: 18, font: f }); p.drawText('Documento de prueba para la firma electronica simple.', { x: 56, y: 730, size: 11, font: f })
  const bytes = await doc.save(); const path = await repo.upload('hab-docs', new File([bytes.buffer as ArrayBuffer], 'contrato-demo.pdf', { type: 'application/pdf' })); await repo.setContractSharedPdf(contractId, path)
}
