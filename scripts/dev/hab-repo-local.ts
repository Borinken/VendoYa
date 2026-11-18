// Ejecuta supabaseRepo contra una base Supabase LOCAL (supabase start). Las claves salen del entorno (las genera el propio
// Supabase local); no hay claves en el repo. Uso: SB_URL=... SB_ANON=... SB_SERVICE=... npx tsx scripts/dev/hab-repo-local.ts
import assert from 'node:assert/strict'
import Module from 'node:module'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const URL = process.env.SB_URL!; const ANON = process.env.SB_ANON!; const SERVICE = process.env.SB_SERVICE!
assert(URL && ANON && SERVICE, 'faltan SB_URL, SB_ANON y SB_SERVICE')
if (!/127\.0\.0\.1|localhost/.test(URL)) throw new Error('Solo contra Supabase LOCAL')

// supabaseRepo usa createClientComponentClient (navegador): en Node lo sustituimos por un cliente supabase-js con la sesión del usuario.
let current: SupabaseClient
const M = Module as unknown as { _load: (req: string, ...a: unknown[]) => unknown }
const orig = M._load
M._load = function (req: string, ...a: unknown[]) {
  if (req === '@supabase/auth-helpers-nextjs') return { createClientComponentClient: () => current }
  return orig.call(this, req, ...a)
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createSupabaseRepo } = require('../../lib/hab/supabase-repo') as typeof import('../../lib/hab/supabase-repo')

import type { Session } from '../../lib/hab/types'
const admin = createClient(URL, SERVICE, { auth: { persistSession: false } })
let n = 0, bad = 0
const t = async (name: string, fn: () => Promise<boolean | void>) => { try { const r = await fn(); if (r === false) throw new Error('condición falsa'); n++; console.log('PASS', name) } catch (e) { bad++; console.log('FAIL', name, '->', e instanceof Error ? e.message : e) } }

async function user(email: string) {
  await admin.auth.admin.createUser({ email, password: 'Prueba-12345', email_confirm: true }).catch(() => null)
  const c = createClient(URL, ANON, { auth: { persistSession: false } })
  const { data, error } = await c.auth.signInWithPassword({ email, password: 'Prueba-12345' }); if (error) throw error
  return { c, id: data.user!.id }
}
async function makeSession(c: SupabaseClient, id: string, email: string, kind: 'owner' | 'subtenant', name: string): Promise<Session> {
  const { data: org, error } = await c.rpc('hab_bootstrap_account', { p_kind: kind, p_name: name }); if (error) throw error
  return { userId: id, email, name, kind, orgId: org as string, role: 'admin', tenantId: null, demo: false, platformAdmin: false }
}

;(async () => {
  const stamp = Date.now()
  const o = await user(`owner${stamp}@test.es`); const s = await user(`sub${stamp}@test.es`)
  const so = await makeSession(o.c, o.id, `owner${stamp}@test.es`, 'owner', 'Org Repo Dueño'); const ss = await makeSession(s.c, s.id, `sub${stamp}@test.es`, 'subtenant', 'Org Repo Sub')
  current = o.c; const repo = createSupabaseRepo(so); current = s.c; const repoS = createSupabaseRepo(ss)
  const ids: Record<string, string> = {}

  current = o.c
  await t('crear piso (por habitaciones) y habitaciones', async () => {
    const p = await repo.createProperty({ name: 'Piso Repo', address: 'Calle 1', city: 'Antequera', province: 'Málaga', community: 'Andalucía', whole_flat_rent_cents: 100000 }); ids.p = p.id
    const r1 = await repo.createRoom({ property_id: p.id, label: 'H1', size_m2: 10, rent_cents: 40000, deposit_cents: 40000, includes: { utilities: true, furniture: true, private_bath: false, window: true, lock: true } }); ids.r1 = r1.id
    const r2 = await repo.createRoom({ property_id: p.id, label: 'H2', size_m2: 12, rent_cents: 40000, deposit_cents: 40000, includes: { utilities: false, furniture: true, private_bath: false, window: true, lock: true } }); ids.r2 = r2.id
  })
  await t('crear piso entero genera su unidad única y rechaza más', async () => {
    const p = await repo.createProperty({ name: 'Entero Repo', address: 'Calle 2', city: 'Antequera', province: 'Málaga', community: 'Andalucía', whole_flat_rent_cents: 70000, rental_mode: 'whole', whole_size_m2: 60 })
    const snap = await repo.load(); assert.equal(snap.rooms.filter(r => r.property_id === p.id).length, 1)
    await assert.rejects(() => repo.createRoom({ property_id: p.id, label: 'otra', size_m2: 9, rent_cents: 1, deposit_cents: 0, includes: { utilities: false, furniture: false, private_bath: false, window: true, lock: true } }))
  })
  await t('inquilino, contrato borrador y activación (cobros generados)', async () => {
    const ten = await repo.createTenant({ full_name: 'Inquilino Repo', email: 'inq@test.es', phone: '+34600000000' }); ids.t = ten.id
    const c = await repo.createContract({ room_id: ids.r1, tenant_id: ten.id, starts_on: '2026-01-01', ends_on: '2026-12-31', rent_cents: 40000, deposit_cents: 40000, clauses: [{ code: 'duracion', title: 'x', body: 'y' }] }); ids.c = c.id
    await repo.setContractStatus(c.id, 'active')
    const snap = await repo.load(); assert.ok(snap.payments.filter(p => p.contract_id === c.id).length >= 11); assert.equal(snap.rooms.find(r => r.id === ids.r1)!.status, 'occupied')
  })
  await t('marcar pagado, inventario con elementos, suministro repartido', async () => {
    const snap = await repo.load(); const pay = snap.payments.find(p => p.contract_id === ids.c)!; await repo.markPaid(pay.id, 'transferencia', '2026-01-05')
    await repo.createInventory({ room_id: ids.r1, contract_id: ids.c, kind: 'entry', taken_at: '2026-01-01', notes: '', items: [{ item: 'Cama', condition: 'ok', note: '', photo_paths: [] }] })
    await repo.createUtility({ property_id: ids.p, kind: 'Luz', period: '2026-01', total_cents: 10001, split_rule: 'equal' })
    const s2 = await repo.load(); assert.equal(s2.shares.reduce((a, x) => a + x.amount_cents, 0), 10001); assert.equal(s2.inventoryItems.length, 1)
  })
  await t('incidencia con línea de tiempo y cambio de estado', async () => {
    const inc = await repo.createIncident({ property_id: ids.p, room_id: ids.r1, title: 'Grifo', description: 'x', severity: 'medium' }); ids.i = inc.id
    await repo.addIncidentEvent(inc.id, 'note', 'visto', false); await repo.setIncidentStatus(inc.id, 'in_progress')
    const s2 = await repo.load(); assert.ok(s2.events.filter(e => e.incident_id === inc.id).length >= 3)
  })
  await t('subida de foto a storage privado y URL firmada', async () => {
    const png = new File([Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64'))], 'a.png', { type: 'image/png' })
    const path = await repo.upload('hab-photos', png); assert.ok(path.startsWith(so.orgId!)); const url = await repo.fileUrl('hab-photos', path); assert.ok(url && url.includes('token='))
    await assert.rejects(() => repo.upload('hab-photos', new File(['x'], 'x.exe', { type: 'application/x-msdownload' })))
  })
  await t('plantillas, ajustes del canal, ticket, interés de venta, criterios', async () => {
    await repo.saveRoomTemplate('Estándar', { keys_delivery: true }); await repo.saveSettings({ whatsapp_e164: '+34600123456', templates: {}, auto_reply: 'Asistente automático', auto_email_copy: true })
    await repo.createTicket({ category: 'Otro', subject: 'Prueba', body: 'x' }); await repo.createSaleInterest({ property_id: ids.p, timeline: '6m', has_tenants: true, tenants_end_on: '2026-12-31' }); await repo.saveCriteria(ids.r2, ['payslip'], 'Criterios')
    const s2 = await repo.load(); assert.equal(s2.roomTemplates.length, 1); assert.equal(s2.settings?.auto_email_copy, true); assert.equal(s2.tickets.length, 1); assert.equal(s2.saleInterests.length, 1); assert.equal(s2.criteria.length, 1)
  })
  await t('enlace de inquilino, solicitud de candidato y firma (PDF preparado)', async () => {
    const l = await repo.createTenantLink(ids.c); assert.equal(l.token.length, 64); const a = await repo.createApplicationLink(ids.r2); assert.equal(a.token.length, 64)
    await repo.setContractSharedPdf(ids.c, `${so.orgId}/contracts/${ids.c}/c.pdf`); const sr = await repo.createSignRequests(ids.c, [{ role: 'landlord', name: 'Dueño', email: 'd@test.es' }, { role: 'tenant', name: 'Inq', email: 'inq@test.es' }]); assert.equal(sr.length, 2)
    const s2 = await repo.load(); assert.equal(s2.signRequests.length, 2); assert.equal(s2.contracts.find(c => c.id === ids.c)!.status, 'active') // sigue activo
    await repo.dismissAlert('rent_late:abc:2026-01-01'); assert.ok((await repo.load()).dismissed.includes('rent_late:abc:2026-01-01'))
  })
  await t('conceder subarriendo: el subarrendador ve el piso y solo lo suyo; revocar lo corta', async () => {
    await assert.rejects(() => repo.createAccess({ property_id: ids.p, grantee_org_id: ss.orgId!, kind: 'sublet' } as never)) // sin documento ni tope
    const a = await repo.createAccess({ property_id: ids.p, grantee_org_id: ss.orgId!, kind: 'sublet', consent_doc_path: `${so.orgId}/consent.pdf`, max_total_rent_cents: 90000 }); ids.a = a.id
    current = s.c; const snap = await repoS.load()
    assert.equal(snap.properties.length, 1); assert.equal(snap.rooms.length, 2); assert.equal(snap.contracts.length, 0, 'S no debe ver los contratos del dueño'); assert.equal(snap.tenants.length, 0); assert.equal(snap.payments.length, 0); assert.equal(snap.incidents.length, 0)
    const ten = await repoS.createTenant({ full_name: 'Inq S', email: 's@test.es', phone: '' }); const c2 = await repoS.createContract({ room_id: ids.r2, tenant_id: ten.id, starts_on: '2026-01-01', ends_on: '2026-12-31', rent_cents: 40000, deposit_cents: 0, clauses: [] })
    await repoS.updateProperty(ids.p, { notes: 'hack' }).catch(() => null); assert.notEqual((await repoS.load()).properties[0].notes, 'hack', 'S no debe poder editar el piso')
    current = o.c; await repo.revokeAccess(ids.a); current = s.c; const after = await repoS.load()
    assert.equal(after.properties.length, 0); assert.equal(after.rooms.length, 0); assert.equal(after.contracts.length, 0); assert.equal(after.tenants.length, 0); void c2
  })
  await t('aislamiento entre orgs: el dueño no ve datos del subarrendador revocado de otras orgs y viceversa', async () => {
    current = s.c; const snapS = await repoS.load(); assert.equal(snapS.properties.length, 0); current = o.c; const snapO = await repo.load(); assert.ok(snapO.properties.length >= 2); assert.equal(snapO.orgNames[ss.orgId!], 'Org Repo Sub')
  })
  await t('borrar cuenta (org del subarrendador) encola ficheros y borra filas', async () => {
    current = s.c; await repoS.deleteAccount()
    const { data } = await admin.from('hab_storage_trash').select('id').eq('is_prefix', true); assert.ok((data?.length ?? 0) >= 2)
    const { data: o2 } = await admin.from('hab_orgs').select('id').eq('id', ss.orgId!); assert.equal(o2?.length, 0)
  })
  console.log(`\n${n} OK, ${bad} FALLOS`); process.exit(bad ? 1 : 0)
})().catch(e => { console.error('CRASH', e); process.exit(1) })
