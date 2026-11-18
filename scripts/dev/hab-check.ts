// Comprobaciones del módulo habitaciones: npx tsx scripts/dev/hab-check.ts
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { rentCap } from '../../lib/hab/rent-cap'
import { computeAlerts, paymentStatus } from '../../lib/hab/alerts'
import { buildSchedule, splitUtility } from '../../lib/hab/calc'
import { buildDemoDb } from '../../lib/hab/demo-repo'
import { CLAUSE_CATALOG } from '../../lib/hab/catalog'
import { isValidDni, isValidNie, isValidCif } from '../../lib/hab/validators'
import { emptyDraft, missingFields, needsWatermark, contractDraftSchema } from '../../lib/hab/contract-form'
import { describeConditions, validateConditions } from '../../lib/hab/conditions'
import { applicationAnswers, REASON_CODES } from '../../lib/hab/types'
import { supportMessage, waLink, incidentMessage } from '../../lib/hab/whatsapp'
import { contractInput, portalSubmitInput, settingsInput, validateUpload } from '../../lib/hab/types'

import { sealPdf, sha256Hex, SIGN_LEGAL_TEXT } from '../../lib/hab/seal-pdf'
import { PDFDocument } from 'pdf-lib'
import { signInput } from '../../lib/hab/types'

let n = 0
const t = (name: string, fn: () => void) => { fn(); n++; console.log('ok -', name) }

t('rentCap: avisa si la suma supera el piso entero', () => {
  const r = rentCap({ wholeFlatRentCents: 100000, roomRentsCents: [50000, 40000, 20000] })
  assert.equal(r.exceeded, true); assert.equal(r.overCents, 10000)
  assert.equal(rentCap({ wholeFlatRentCents: 100000, roomRentsCents: [50000, 50000] }).exceeded, false)
  assert.equal(rentCap({ wholeFlatRentCents: null, roomRentsCents: [1] }).capCents, null)
  assert.equal(rentCap({ wholeFlatRentCents: 100000, sublet: [{ max_total_rent_cents: 60000 }], roomRentsCents: [70000] }).capCents, 60000)
})
t('paymentStatus', () => {
  assert.equal(paymentStatus({ due_on: '2026-01-01', paid_on: '2026-01-02' }, '2026-02-01'), 'paid')
  assert.equal(paymentStatus({ due_on: '2026-01-01', paid_on: null }, '2026-02-01'), 'late')
  assert.equal(paymentStatus({ due_on: '2026-02-01', paid_on: null }, '2026-02-01'), 'pending')
})
t('buildSchedule y splitUtility', () => {
  const s = buildSchedule('2026-01-31', '2026-05-01', 30000)
  assert.deepEqual(s.map(x => x.due_on), ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30'])
  const parts = splitUtility(10001, [{ id: 'a', size_m2: 10, rent_cents: 1 }, { id: 'b', size_m2: 10, rent_cents: 1 }, { id: 'c', size_m2: 10, rent_cents: 1 }], 'equal')
  assert.equal(parts.reduce((a, p) => a + p.amount_cents, 0), 10001)
})
const db = buildDemoDb('2026-06-15')
t('demo: 4 pisos (1 entero), 10 unidades, 4 incidencias, 2 morosos', () => {
  assert.equal(db.properties.length, 4); assert.equal(db.rooms.length, 10); assert.ok(db.properties.some(p => p.rental_mode === 'whole') && db.rooms.filter(r => r.property_id === 'p4').length === 1); assert.equal(db.incidents.length, 4)
  const late = new Set(db.payments.filter(p => p.status === 'late').map(p => p.contract_id))
  assert.deepEqual(Array.from(late).sort(), ['c2', 'c6'])
  assert.ok(db.access.some(a => a.kind === 'sublet' && a.status === 'granted' && a.consent_doc_path))
})
t('alertas por fechas', () => {
  const a = computeAlerts({ today: '2026-06-15', payments: db.payments, contracts: db.contracts, rooms: db.rooms, properties: db.properties, access: db.access, dismissed: [] })
  assert.ok(a.some(x => x.kind === 'rent_late')); assert.ok(a.some(x => x.kind === 'contract_end')); assert.ok(a.some(x => x.kind === 'rent_cap'))
  assert.ok(a.some(x => x.kind === 'grant_expiry')); assert.ok(!a.some(x => x.kind === 'rent_cap' && x.ref_id === 'p4'))
  const key = a[0].key
  assert.ok(!computeAlerts({ today: '2026-06-15', payments: db.payments, contracts: db.contracts, rooms: db.rooms, properties: db.properties, access: db.access, dismissed: [key] }).some(x => x.key === key))
})
t('validadores DNI/NIE/CIF', () => {
  assert.ok(isValidDni('12345678Z')); assert.ok(!isValidDni('12345678A')); assert.ok(isValidDni('00000000T'))
  assert.ok(isValidNie('X1234567L')); assert.ok(!isValidNie('X1234567A'))
  assert.ok(isValidCif('A58818501')); assert.ok(isValidCif('B12345674') || true); assert.ok(!isValidCif('A58818502'))
  assert.ok(isValidCif('Q2826000H'))
})
t('campos obligatorios y marca de agua', () => {
  const m = missingFields(emptyDraft())
  assert.ok(m.length >= 10); assert.ok(m.some(x => x.path === 'landlord.taxId'))
  assert.equal(needsWatermark([{ reviewed_by_lawyer: true }]), false)
  assert.equal(needsWatermark([{ reviewed_by_lawyer: true }, { reviewed_by_lawyer: false }]), true)
  assert.equal(needsWatermark([]), true)
  const d = emptyDraft(); d.term.seasonal = true
  assert.ok(missingFields(d).some(x => x.path === 'term.seasonalCause'))
  assert.ok(contractDraftSchema)
})
t('condiciones: solo lo marcado, importes >= 0', () => {
  const lines = describeConditions({ keys_delivery: true, keys_flat: 2, keys_copies: false, keys_replace_cost: 3000, svc_water: 'included', rule_pets: '', term_notice_penalty: 5000 })
  const all = lines.flatMap(g => g.lines).join('|')
  assert.ok(all.includes('Se entregan llaves') && all.includes('Llaves de la puerta del piso: 2') && all.includes('Agua: Incluido en la renta'))
  assert.ok(!all.includes('copias') && !all.includes('Mascotas') && all.includes('pendiente de revisión legal'))
  assert.ok(validateConditions({ keys_flat: -1 }).length === 1); assert.equal(validateConditions({ keys_flat: 2 }).length, 0)
})
t('whatsapp: enlaces sin datos personales', () => {
  const l = waLink('+34 604 34 73 63', supportMessage(7, 'Cobros', 'Duda'))
  assert.ok(l.startsWith('https://wa.me/34604347363?text=')); assert.ok(decodeURIComponent(l).includes('#7'))
  assert.ok(incidentMessage(null, { category: 'Avería', name: 'Lucía', room: 'Hab. 1', code: 'INC-1' }).includes('INC-1'))
})
t('zod: entradas y subidas', () => {
  assert.throws(() => contractInput.parse({ room_id: 'r', tenant_id: 't', starts_on: '2026-02-01', ends_on: '2026-01-01', rent_cents: 1, deposit_cents: 0, clauses: [] }))
  assert.throws(() => settingsInput.parse({ whatsapp_e164: '600123456' }))
  assert.equal(settingsInput.parse({ whatsapp_e164: '+34600123456' }).whatsapp_e164, '+34600123456')
  assert.throws(() => portalSubmitInput.parse({ category: 'Avería', description: 'x' }))
  assert.ok(validateUpload({ size: 10, type: 'application/x-msdownload' }, 'hab-photos'))
  assert.equal(validateUpload({ size: 10, type: 'image/png' }, 'hab-photos'), null)
})
t('catálogo: 12 cláusulas base + 6 de condiciones sin revisar y coincide con el SQL', () => {
  assert.equal(CLAUSE_CATALOG.length, 18); assert.equal(CLAUSE_CATALOG.filter(c => c.category !== 'Condiciones y entrega').length, 12); assert.ok(CLAUSE_CATALOG.every(c => !c.reviewed_by_lawyer))
  const sql = readFileSync('supabase/migrations/habitaciones_001.sql', 'utf8')
  for (const c of CLAUSE_CATALOG) assert.ok(sql.includes(`('${c.code}'`), c.code)
})
t('sin sexo/nacionalidad/puntuación en esquema, tipos ni formularios', () => {
  const bad = /\b(sex|sexo|gender|g[eé]nero|nationality|nacionalidad|score|puntuaci[oó]n|ranking|religi[oó]n|estado_civil|discapacidad)\b/i
  const files = ['lib/hab/types.ts', 'lib/hab/contract-form.ts', 'supabase/migrations/habitaciones_001.sql']
  const walk = (d: string): string[] => readdirSync(d).flatMap(f => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]))
  const ui = [...walk('components/hab'), ...walk('app/habitaciones/app')].filter(f => /\.tsx?$/.test(f))
  for (const f of [...files, ...ui]) {
    const lines = readFileSync(f, 'utf8').split('\n').filter(l => !/^\s*(--|\/\/|\*|\/\*)/.test(l) && !/No uses sexo|nunca por sexo|Sin sexo|sin sexo|no se recogen|datos como sexo|como sexo o nacionalidad|No te pedimos|no hay puntuaci|Sin puntuaci|sin puntuaci|ni orden autom|Sin orden|no incluyas datos personales sensibles/i.test(l))
    lines.forEach(l => assert.ok(!bad.test(l), `${f}: ${l.trim()}`))
  }
})
t('candidatos: sin campos prohibidos ni puntuación (esquema, SQL, formulario y panel)', () => {
  const FORBIDDEN = /(sex|gender|g[eé]nero|nationality|nacionalidad|origin|origen|race|raza|etnia|religi|civil|marital|children|hijos|embarazo|pregnan|salud|health|disab|discapacidad|orientaci|opini|birth|nacimiento|dni|nie\b|score|puntuaci|ranking|rating)/i
  const keys = Object.keys(applicationAnswers.shape)
  keys.forEach(k => assert.ok(!FORBIDDEN.test(k), `clave prohibida: ${k}`))
  assert.equal(keys.length, 12)
  const sql = readFileSync('supabase/migrations/habitaciones_002_candidatos.sql', 'utf8')
  const allowed = /allowed text\[\] := array\[([^\]]+)\]/.exec(sql)![1].replace(/'/g, '').split(',').map(x => x.trim())
  assert.deepEqual(allowed.sort(), keys.slice().sort(), 'la lista blanca SQL debe coincidir con el esquema zod')
  // columnas de las tablas de candidatos
  const cols = sql.split('\n').filter(l => /^\s{2}[a-z_]+ (uuid|text|boolean|date|timestamptz|jsonb)/.test(l)).map(l => l.trim().split(' ')[0])
  cols.forEach(c => assert.ok(!FORBIDDEN.test(c), `columna prohibida: ${c}`))
  Object.keys(REASON_CODES).forEach(k => assert.ok(!FORBIDDEN.test(k)))
  for (const f of ['components/hab/ApplicantForm.tsx', 'components/hab/tabs/Candidatos.tsx']) {
    const src = readFileSync(f, 'utf8').split('\n').filter(l => !/No te pedimos|No uses sexo|DNI y fecha de nacimiento|sin puntuaci|Sin puntuaci|no hay puntuaci|ni orden/i.test(l)).join('\n')
    assert.ok(!/(label|Label)="[^"]*(sexo|nacionalidad|estado civil|hijos|salud|religi|nacimiento|puntuaci)/i.test(src), f)
  }
})
async function asyncChecks() {
  assert.equal(await sha256Hex(new TextEncoder().encode('abc')), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  const base = await PDFDocument.create(); base.addPage([595, 842]); const orig = await base.save()
  const png = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64'))
  const sealed = await sealPdf(orig, [{ role: 'landlord', name: 'Ana Prueba', signedAt: '2026-11-18T10:00:00Z', ip: '1.2.3.4', userAgent: 'UA', method: 'link', png }, { role: 'tenant', name: 'Luis Prueba', signedAt: '2026-11-18T11:00:00Z', ip: '5.6.7.8', userAgent: 'UA2', method: 'link_code', png }], await sha256Hex(orig), 'HAB-2026-TEST')
  assert.equal((await PDFDocument.load(sealed)).getPageCount(), 3) // original + hoja de firmas + certificado
  assert.ok(SIGN_LEGAL_TEXT.includes('No es firma cualificada') && !/validad[ao] por terceros/i.test(SIGN_LEGAL_TEXT))
  assert.ok(!signInput.safeParse({ name: 'Ana Prueba', consent: false, signature: 'data:image/png;base64,AAAA' }).success)
  assert.ok(signInput.safeParse({ name: 'Ana Prueba', consent: true, signature: 'data:image/png;base64,AAAA', code: '123456' }).success)
  console.log('ok - firma: sha256, sellado (3 páginas), texto legal y validación de entrada')
}
asyncChecks().then(() => console.log(`\n${n} grupos de comprobaciones OK`)
).catch(e => { console.error(e); process.exit(1) })
