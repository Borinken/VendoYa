import type {
  AccessInput, Bucket, ContractInput, ContractStatus, IncidentInput, IncidentStatus, InventoryInput,
  InviteInput, PropertyInput, RoomInput, Session, Snapshot, TenantInput, UtilityInput, Room, Property,
  Tenant, Contract, Incident, Access, Utility, Inventory, TicketInput, SupportTicket, SettingsInput, TenantLink, PlatformOverview, SaleInterestInput, DocKind, SaleInterest,
} from './types'

// Misma interfaz para demo (memoria/localStorage) y Supabase (RLS en la base).
// Las pantallas leen todo con load() y tras cada cambio vuelven a llamarlo.
export interface HabRepo {
  readonly mode: 'demo' | 'supabase'
  readonly session: Session
  load(): Promise<Snapshot>

  updateOrg(name: string): Promise<void>
  createProperty(i: PropertyInput): Promise<Property>
  updateProperty(id: string, patch: Partial<Pick<Property, 'rules' | 'notes' | 'whole_flat_rent_cents' | 'tensioned_zone'>>): Promise<void>
  createRoom(i: RoomInput): Promise<Room>
  updateRoom(id: string, patch: Partial<Pick<Room, 'status' | 'rent_cents' | 'deposit_cents'>>): Promise<void>
  duplicateRooms(fromPropertyId: string, toPropertyId: string): Promise<number>
  createTenant(i: TenantInput): Promise<Tenant>
  createContract(i: ContractInput): Promise<Contract>
  setContractStatus(id: string, status: ContractStatus, signedPdfPath?: string | null): Promise<void>
  createInventory(i: InventoryInput): Promise<Inventory>
  markPaid(paymentId: string, method: string, paidOn: string): Promise<void>
  createUtility(i: UtilityInput): Promise<Utility>
  createIncident(i: IncidentInput): Promise<Incident>
  addIncidentEvent(incidentId: string, kind: string, note: string, internal: boolean): Promise<void>
  setIncidentStatus(id: string, status: IncidentStatus): Promise<void>
  setTenantStatement(incidentId: string, text: string): Promise<void>
  createAccess(i: AccessInput): Promise<Access>
  revokeAccess(id: string): Promise<void>
  createInvite(i: InviteInput): Promise<{ token: string }>
  dismissAlert(key: string): Promise<void>
  createTicket(i: TicketInput): Promise<SupportTicket>
  ticketWhatsappClicked(ticketId: string): Promise<void>
  addTicketMessage(ticketId: string, body: string): Promise<void>
  saveSettings(i: SettingsInput): Promise<void>
  createTenantLink(contractId: string): Promise<{ token: string; link: TenantLink }>
  revokeTenantLink(id: string): Promise<void>
  createSaleInterest(i: SaleInterestInput): Promise<SaleInterest>
  adminSetSaleStatus(id: string, status: SaleInterest['status']): Promise<void>
  saveCriteria(roomId: string, requiredDocs: DocKind[], notesPublic: string): Promise<void>
  createApplicationLink(roomId: string): Promise<{ token: string; id: string }>
  setContactVerified(appId: string, v: boolean): Promise<void>
  verifyDoc(docId: string, verified: boolean): Promise<void>
  decideApplication(appId: string, decision: 'approved' | 'rejected', reason: string | undefined, note: string): Promise<void>
  approveAndCreateContract(appId: string): Promise<Contract>
  deleteApplication(appId: string): Promise<void>
  createReference(appId: string): Promise<{ token: string }>
  saveRoomTemplate(name: string, conditions: Record<string, boolean | number | string>): Promise<void>
  deleteRoomTemplate(name: string): Promise<void>
  setContractSharedPdf(contractId: string, path: string): Promise<void>
  createSignRequests(contractId: string, signers: { role: 'landlord' | 'tenant'; name: string; email: string }[]): Promise<{ role: 'landlord' | 'tenant'; token: string }[]>
  invalidateSignRequests(contractId: string): Promise<void>
  createDownloadLink(contractId: string): Promise<string>
  adminOverview(): Promise<PlatformOverview>
  adminSetTicketStatus(id: string, status: SupportTicket['status']): Promise<void>

  upload(bucket: Bucket, file: File): Promise<string>
  fileUrl(bucket: Bucket, path: string): Promise<string | null>
  deleteAccount(): Promise<void>
}
