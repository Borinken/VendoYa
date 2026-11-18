import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { HabRepo } from './repo'
import { buildSchedule, splitUtility } from './calc'
import { paymentStatus, todayStr } from './alerts'
import {
  accessInput, contractInput, eventInput, incidentInput, inventoryInput, inviteInput, propertyInput, roomInput, saleInterestInput, settingsInput, tenantInput, ticketInput, utilityInput, validateUpload,
} from './types'
import type {
  Access, Bucket, Contract, Incident, Inventory, InventoryItem, Invite, Member, Org, OrgSettings, Payment, PlatformOverview, Property, Room, Session, Snapshot, SupportMessage,
  SupportTicket, SaleInterest, SignRequest, Signature, MailLogEntry, SignRole, Reference, RoomTemplate, Application, ApplicationDoc, ApplicationCriteria, AuditEntry, DocKind, Tenant, TenantLink, Utility, UtilityShare, IncidentEvent, Clause,
} from './types'

type Res<T> = PromiseLike<{ data: T | null; error: { message: string } | null }>
async function run<T>(q: Res<T>): Promise<T> {
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data as T
}

// Implementación real: TODO el control de acceso lo hacen las políticas RLS de habitaciones_001.sql.
// Usa solo la clave anon con la sesión del usuario; nunca service_role.
class SupabaseRepo implements HabRepo {
  readonly mode = 'supabase' as const
  private sb = createClientComponentClient()
  constructor(readonly session: Session) {}

  // Tablas de la migración 002 (candidatos): si aún no está aplicada, la pestaña simplemente queda vacía.
  private async opt<T>(name: string): Promise<T[]> { const { data, error } = await (this.sb.from(name).select('*') as unknown as Res<T[]>); return error ? [] : data ?? [] }
  private async optCols<T>(name: string, cols: string): Promise<T[]> { const { data, error } = await (this.sb.from(name).select(cols) as unknown as Res<T[]>); return error ? [] : data ?? [] }
  private get org() {
    if (!this.session.orgId) throw new Error('Esta acción es solo para organizaciones.')
    return this.session.orgId
  }
  private t<T>(name: string) { return this.sb.from(name).select('*') as unknown as Res<T[]> }

  async load(): Promise<Snapshot> {
    const s = this.session
    const tenant = s.kind === 'tenant'
    const [properties, rooms, tenants, clauses, contracts, inventories, inventoryItems, payments, utilities, shares, incidents, events, access, members, invites, alerts, tickets, ticketMessages, settings, tenantLinks, orgs, saleInterests, applications, applicationDocs, criteria, audit, references, roomTemplates, signRequests, signatures, mailLog] = await Promise.all([
      tenant ? run<Property[]>(this.sb.rpc('hab_my_tenant_property') as unknown as Res<Property[]>) : run<Property[]>(this.t('hab_properties')),
      run<Room[]>(this.t('hab_rooms')), run<Tenant[]>(this.t('hab_tenants')), run<Clause[]>(this.t('hab_clause_catalog')),
      run<Contract[]>(this.t('hab_contracts')), run<Inventory[]>(this.t('hab_inventories')), run<InventoryItem[]>(this.t('hab_inventory_items')),
      run<Payment[]>(this.t('hab_payments')), tenant ? Promise.resolve([] as Utility[]) : run<Utility[]>(this.t('hab_utilities')),
      tenant ? Promise.resolve([] as UtilityShare[]) : run<UtilityShare[]>(this.t('hab_utility_shares')),
      run<Incident[]>(this.t('hab_incidents')), run<IncidentEvent[]>(this.t('hab_incident_events')),
      tenant ? Promise.resolve([] as Access[]) : run<Access[]>(this.t('hab_property_access')),
      tenant ? Promise.resolve([] as Member[]) : run<Member[]>(this.t('hab_members')),
      tenant ? Promise.resolve([] as Invite[]) : run<Invite[]>(this.sb.from('hab_invites').select('id,org_id,email,role,contract_id,expires_at,used_at') as unknown as Res<Invite[]>),
      tenant ? Promise.resolve([] as { key: string }[]) : run<{ key: string }[]>(this.sb.from('hab_alerts').select('key').eq('done', true) as unknown as Res<{ key: string }[]>),
      run<SupportTicket[]>(this.t('hab_support_tickets')), run<SupportMessage[]>(this.t('hab_support_messages')),
      tenant ? Promise.resolve(null) : run<OrgSettings[]>(this.t('hab_org_settings')).then(r => r[0] ?? null),
      tenant ? Promise.resolve([] as TenantLink[]) : run<TenantLink[]>(this.sb.from('hab_tenant_links').select('id,org_id,tenant_id,contract_id,room_id,expires_at,revoked_at,last_used_at,created_at') as unknown as Res<TenantLink[]>),
      tenant ? Promise.resolve([] as Org[]) : run<Org[]>(this.t('hab_orgs')),
      tenant ? Promise.resolve([] as SaleInterest[]) : run<SaleInterest[]>(this.t('hab_sale_interests')),
      tenant ? Promise.resolve([] as Application[]) : this.opt<Application>('hab_applications'),
      tenant ? Promise.resolve([] as ApplicationDoc[]) : this.opt<ApplicationDoc>('hab_application_docs'),
      tenant ? Promise.resolve([] as ApplicationCriteria[]) : this.opt<ApplicationCriteria>('hab_application_criteria'),
      tenant ? Promise.resolve([] as AuditEntry[]) : this.opt<AuditEntry>('hab_audit_log'),
      tenant ? Promise.resolve([] as Reference[]) : this.opt<Reference>('hab_references'),
      tenant ? Promise.resolve([] as RoomTemplate[]) : this.opt<RoomTemplate>('hab_room_templates'),
      tenant ? Promise.resolve([] as SignRequest[]) : this.optCols<SignRequest>('hab_sign_requests', 'id,contract_id,org_id,role,signer_name,signer_email,expires_at,used_at,revoked_at,created_at'),
      this.opt<Signature>('hab_signatures'), tenant ? Promise.resolve([] as MailLogEntry[]) : this.opt<MailLogEntry>('hab_mail_log'),
    ])
    return {
      org: orgs.find(o => o.id === s.orgId) ?? null, orgNames: Object.fromEntries(orgs.map(o => [o.id, o.name])),
      properties, rooms, tenants, clauses, contracts, inventories, inventoryItems, payments, utilities, shares, incidents, events, access, members, invites,
      dismissed: alerts.map(a => a.key), tickets, ticketMessages, settings, tenantLinks, saleInterests, applications, applicationDocs, criteria, audit, references, roomTemplates, signRequests, signatures, mailLog,
    }
  }

  async updateOrg(name: string) { await run(this.sb.from('hab_orgs').update({ name: name.trim() }).eq('id', this.org)) }
  async createProperty(i: unknown) {
    const v = propertyInput.parse(i)
    const { whole_size_m2, ...rest } = v
    const p = await run<Property>(this.sb.from('hab_properties').insert({ ...rest, org_id: this.org }).select().single())
    if (p.rental_mode === 'whole') { // una sola unidad que representa el piso entero
      await run(this.sb.from('hab_rooms').insert({ property_id: p.id, label: 'Piso entero', size_m2: whole_size_m2 ?? 60, rent_cents: p.whole_flat_rent_cents ?? 0, deposit_cents: p.whole_flat_rent_cents ?? 0, includes: { utilities: false, furniture: true, private_bath: false, window: true, lock: true }, status: 'free' }))
    }
    return p
  }
  async updateProperty(id: string, patch: Partial<Property>) { await run(this.sb.from('hab_properties').update(patch).eq('id', id)) }
  async createRoom(i: unknown) { return run<Room>(this.sb.from('hab_rooms').insert(roomInput.parse(i)).select().single()) }
  async updateRoom(id: string, patch: Partial<Room>) { await run(this.sb.from('hab_rooms').update(patch).eq('id', id)) }
  async duplicateRooms(from: string, to: string) {
    const src = await run<Room[]>(this.sb.from('hab_rooms').select('*').eq('property_id', from) as unknown as Res<Room[]>)
    if (!src.length) return 0
    await run(this.sb.from('hab_rooms').insert(src.map(r => { const c: Partial<Room> = { ...r, property_id: to, status: 'free' }; delete c.id; return c })))
    return src.length
  }
  async createTenant(i: unknown) {
    return run<Tenant>(this.sb.from('hab_tenants').insert({ ...tenantInput.parse(i), org_id: this.org }).select().single())
  }
  async createContract(i: unknown) {
    const v = contractInput.parse(i)
    return run<Contract>(this.sb.from('hab_contracts').insert({ ...v, org_id: this.org, status: 'draft' }).select().single())
  }
  async setContractStatus(id: string, status: Contract['status'], signedPdfPath?: string | null) {
    const patch: Record<string, unknown> = { status }
    if (signedPdfPath) { patch.signed_pdf_path = signedPdfPath; patch.signed_at = new Date().toISOString() }
    const c = await run<Contract>(this.sb.from('hab_contracts').update(patch).eq('id', id).select().single())
    if (status === 'active') {
      const have = await run<{ id: string }[]>(this.sb.from('hab_payments').select('id').eq('contract_id', id).limit(1) as unknown as Res<{ id: string }[]>)
      if (!have.length) {
        await run(this.sb.from('hab_payments').insert(buildSchedule(c.starts_on, c.ends_on, c.rent_cents).map(s => ({ contract_id: id, ...s, status: paymentStatus({ due_on: s.due_on, paid_on: null }, todayStr()) }))))
      }
      await run(this.sb.from('hab_rooms').update({ status: 'occupied' }).eq('id', c.room_id))
    }
    if (status === 'ended') await run(this.sb.from('hab_rooms').update({ status: 'free' }).eq('id', c.room_id))
  }
  async createInventory(i: unknown) {
    const v = inventoryInput.parse(i)
    const inv = await run<Inventory>(this.sb.from('hab_inventories').insert({ room_id: v.room_id, contract_id: v.contract_id, kind: v.kind, taken_at: v.taken_at, notes: v.notes }).select().single())
    await run(this.sb.from('hab_inventory_items').insert(v.items.map(x => ({ ...x, inventory_id: inv.id }))))
    return inv
  }
  async markPaid(id: string, method: string, paidOn: string) {
    await run(this.sb.from('hab_payments').update({ paid_on: paidOn, status: 'paid', method }).eq('id', id))
  }
  async createUtility(i: unknown) {
    const v = utilityInput.parse(i)
    const rooms = await run<Room[]>(this.sb.from('hab_rooms').select('*').eq('property_id', v.property_id) as unknown as Res<Room[]>)
    const u = await run<Utility>(this.sb.from('hab_utilities').insert(v).select().single())
    const parts = splitUtility(u.total_cents, rooms, u.split_rule).map(p => ({ utility_id: u.id, ...p }))
    if (parts.length) await run(this.sb.from('hab_utility_shares').insert(parts))
    return u
  }
  async createIncident(i: unknown) {
    const v = incidentInput.parse(i)
    let org = this.session.orgId
    if (this.session.kind === 'tenant') {
      const c = await run<Contract[]>(this.sb.from('hab_contracts').select('org_id').eq('room_id', v.room_id ?? '').eq('status', 'active').limit(1) as unknown as Res<Contract[]>)
      org = c[0]?.org_id ?? null
    }
    const n = await run<Incident>(this.sb.from('hab_incidents').insert({ ...v, org_id: org, reported_by: this.session.userId, tenant_id: this.session.tenantId }).select().single())
    if (this.session.kind !== 'tenant') await run(this.sb.from('hab_incident_events').insert({ incident_id: n.id, actor: this.session.userId, kind: 'created', note: 'Incidencia creada' }))
    return n
  }
  async addIncidentEvent(incidentId: string, kind: string, note: string, internal: boolean) {
    const v = eventInput.parse({ incident_id: incidentId, kind, note, internal })
    await run(this.sb.from('hab_incident_events').insert({ ...v, actor: this.session.userId }))
  }
  async setIncidentStatus(id: string, status: Incident['status']) {
    await run(this.sb.from('hab_incidents').update({ status, resolved_at: status === 'resolved' ? new Date().toISOString() : null }).eq('id', id))
    await run(this.sb.from('hab_incident_events').insert({ incident_id: id, actor: this.session.userId, kind: 'status', note: `Estado: ${status}` }))
  }
  async setTenantStatement(incidentId: string, text: string) { await run(this.sb.rpc('hab_set_tenant_statement', { p_incident: incidentId, p_text: text }) as unknown as Res<null>) }
  async createAccess(i: unknown) {
    const v = accessInput.parse(i)
    return run<Access>(this.sb.from('hab_property_access').insert({ ...v, status: 'granted', granted_by: this.session.userId }).select().single())
  }
  async revokeAccess(id: string) { await run(this.sb.from('hab_property_access').update({ status: 'revoked' }).eq('id', id)) }
  async createInvite(i: unknown) {
    const v = inviteInput.parse(i)
    const token = await run<string>(this.sb.rpc('hab_create_invite', { p_org: this.org, p_email: v.email, p_role: v.role, p_contract: v.contract_id }) as unknown as Res<string>)
    return { token }
  }
  async dismissAlert(key: string) {
    const [kind, ref] = key.split(':')
    await run(this.sb.from('hab_alerts').insert({ org_id: this.org, kind, due_on: todayStr(), ref_table: 'computed', ref_id: ref, done: true, key }))
  }
  async createTicket(i: unknown) {
    const v = ticketInput.parse(i)
    let org = this.session.orgId
    if (!org) {
      const c = await run<Contract[]>(this.sb.from('hab_contracts').select('org_id').limit(1) as unknown as Res<Contract[]>)
      org = c[0]?.org_id ?? null
    }
    return run<SupportTicket>(this.sb.from('hab_support_tickets').insert({ ...v, org_id: org, created_by: this.session.userId }).select().single())
  }
  async ticketWhatsappClicked(id: string) { await run(this.sb.rpc('hab_ticket_whatsapp_clicked', { p_ticket: id }) as unknown as Res<null>) }
  async addTicketMessage(ticketId: string, body: string) {
    const b = body.trim(); if (!b || b.length > 2000) throw new Error('Mensaje vacío o demasiado largo')
    await run(this.sb.from('hab_support_messages').insert({ ticket_id: ticketId, author: this.session.userId, body: b, author_kind: this.session.platformAdmin ? 'platform' : 'user' }))
  }
  async saveSettings(i: unknown) {
    const v = settingsInput.parse(i)
    await run(this.sb.from('hab_org_settings').upsert({ org_id: this.org, ...v }))
  }
  async createTenantLink(contractId: string) {
    return run<{ token: string; link: TenantLink }>(this.sb.rpc('hab_create_tenant_link', { p_contract: contractId }) as unknown as Res<{ token: string; link: TenantLink }>)
  }
  async revokeTenantLink(id: string) { await run(this.sb.from('hab_tenant_links').update({ revoked_at: new Date().toISOString() }).eq('id', id)) }
  async adminOverview(): Promise<PlatformOverview> {
    const counts = await run<PlatformOverview['counts']>(this.sb.rpc('hab_platform_stats') as unknown as Res<PlatformOverview['counts']>)
    const tickets = await run<SupportTicket[]>(this.sb.from('hab_support_tickets').select('*').order('number', { ascending: false }) as unknown as Res<SupportTicket[]>)
    const orgs = await run<Org[]>(this.t('hab_orgs'))
    const saleInterests = await run<SaleInterest[]>(this.t('hab_sale_interests'))
    return { counts, tickets, saleInterests, orgNames: Object.fromEntries(orgs.map(o => [o.id, o.name])) }
  }
  async createSaleInterest(i: unknown) {
    const v = saleInterestInput.parse(i)
    return run<SaleInterest>(this.sb.from('hab_sale_interests').insert({ ...v, org_id: this.org, created_by: this.session.userId }).select().single())
  }
  async adminSetSaleStatus(id: string, status: SaleInterest['status']) { await run(this.sb.from('hab_sale_interests').update({ status }).eq('id', id)) }
  async saveCriteria(roomId: string, docs: DocKind[], notes: string) {
    await run(this.sb.from('hab_application_criteria').upsert({ org_id: this.org, room_id: roomId, required_docs: docs, notes_public: notes.slice(0, 1000) }, { onConflict: 'room_id' }))
  }
  async createApplicationLink(roomId: string) { return run<{ token: string; id: string }>(this.sb.rpc('hab_create_application_link', { p_room: roomId, p_org: this.org, p_days: 14 }) as unknown as Res<{ token: string; id: string }>) }
  async setContactVerified(appId: string, v: boolean) { await run(this.sb.from('hab_applications').update({ contact_verified: v }).eq('id', appId)) }
  async verifyDoc(docId: string, verified: boolean) { await run(this.sb.from('hab_application_docs').update({ verified_by: verified ? this.session.userId : null, verified_at: verified ? new Date().toISOString() : null }).eq('id', docId)) }
  async decideApplication(appId: string, decision: 'approved' | 'rejected', reason: string | undefined, note: string) {
    await run(this.sb.rpc('hab_decide_application', { p_id: appId, p_decision: decision, p_reason: reason ?? null, p_note: note }) as unknown as Res<null>)
  }
  async approveAndCreateContract(appId: string) {
    const a = await run<Application>(this.sb.from('hab_applications').select('*').eq('id', appId).single())
    const room = await run<Room>(this.sb.from('hab_rooms').select('*').eq('id', a.room_id).single())
    const ans = a.answers; if (!ans.move_in || !ans.duration_months) throw new Error('Faltan la fecha de entrada y la duración en la solicitud')
    const end = new Date(ans.move_in + 'T00:00:00'); end.setMonth(end.getMonth() + ans.duration_months)
    const t = await this.createTenant({ full_name: a.applicant_name, email: a.email, phone: a.phone })
    const c = await this.createContract({ room_id: room.id, tenant_id: t.id, starts_on: ans.move_in, ends_on: end.toISOString().slice(0, 10), rent_cents: room.rent_cents, deposit_cents: room.deposit_cents, clauses: [] })
    await this.decideApplication(appId, 'approved', undefined, ''); void cleanupStorage()
    return c
  }
  async deleteApplication(appId: string) { await run(this.sb.rpc('hab_delete_application', { p_id: appId }) as unknown as Res<null>); void cleanupStorage() }
  async createReference(appId: string) {
    const a = await run<Application>(this.sb.from('hab_applications').select('*').eq('id', appId).single()); const p = a.answers.previous_landlord
    if (!p?.name) throw new Error('El candidato no indicó un arrendador anterior')
    return { token: await run<string>(this.sb.rpc('hab_create_reference', { p_app: appId, p_name: p.name, p_email: p.email, p_phone: p.phone }) as unknown as Res<string>) }
  }
  async saveRoomTemplate(name: string, conditions: Record<string, boolean | number | string>) { await run(this.sb.from('hab_room_templates').upsert({ org_id: this.org, name: name.trim().slice(0, 80), conditions })) }
  async deleteRoomTemplate(name: string) { await run(this.sb.from('hab_room_templates').delete().eq('org_id', this.org).eq('name', name)) }
  async setContractSharedPdf(contractId: string, path: string) { await run(this.sb.from('hab_contracts').update({ shared_pdf_path: path }).eq('id', contractId)) }
  async createSignRequests(contractId: string, signers: { role: SignRole; name: string; email: string }[]) {
    return run<{ role: SignRole; token: string }[]>(this.sb.rpc('hab_create_sign_requests', { p_contract: contractId, p_signers: signers }) as unknown as Res<{ role: SignRole; token: string }[]>)
  }
  async invalidateSignRequests(contractId: string) { await run(this.sb.from('hab_sign_requests').update({ revoked_at: new Date().toISOString() }).eq('contract_id', contractId).is('used_at', null).is('revoked_at', null)) }
  async createDownloadLink(contractId: string) { return run<string>(this.sb.rpc('hab_create_download_link', { p_contract: contractId }) as unknown as Res<string>) }
  async adminSetTicketStatus(id: string, status: SupportTicket['status']) { await run(this.sb.from('hab_support_tickets').update({ status }).eq('id', id)) }

  async upload(bucket: Bucket, file: File) {
    const err = validateUpload(file, bucket)
    if (err) throw new Error(err)
    let folder = this.session.orgId
    if (!folder) { // inquilino con cuenta: carpeta de la org de su contrato, subcarpeta propia
      const c = await run<Contract[]>(this.sb.from('hab_contracts').select('org_id').limit(1) as unknown as Res<Contract[]>)
      folder = `${c[0]?.org_id}/tenant/${this.session.userId}`
    }
    const path = `${folder}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, '_').slice(0, 60)}`
    const { error } = await this.sb.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false })
    if (error) throw new Error(error.message)
    return path
  }
  async fileUrl(bucket: Bucket, path: string) {
    const { data } = await this.sb.storage.from(bucket).createSignedUrl(path, 3600)
    return data?.signedUrl ?? null
  }
  async deleteAccount() {
    await run(this.sb.rpc('hab_delete_org', { p_org: this.org }) as unknown as Res<null>)
    void cleanupStorage()
    await this.sb.auth.signOut()
  }
}

// Vacía la cola de ficheros a borrar (la ruta usa service_role en servidor y tiene límite de frecuencia). No bloquea la acción del usuario.
async function cleanupStorage() { try { await fetch('/habitaciones/cleanup', { method: 'POST' }) } catch { /* se reintentará en la siguiente llamada o por cron */ } }

export function createSupabaseRepo(session: Session): HabRepo { return new SupabaseRepo(session) }
