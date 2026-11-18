// Prueba del endpoint de contacto con Resend simulado: npx tsx scripts/dev/hab-contacto-check.ts
import assert from 'node:assert/strict'
process.env.RESEND_API_KEY = 'test'; process.env.HAB_MAIL_FROM = 'Vendoya <admin@vendoya.es>'
const sent: any[] = []
globalThis.fetch = (async (_u: any, init: any) => { sent.push(JSON.parse(init.body)); return { ok: true } }) as any
const mk = (b: any, ip = '1.1.1.1') => new Request('http://x/api', { method: 'POST', headers: { 'x-forwarded-for': ip }, body: JSON.stringify(b) })
;(async () => {
  const { POST } = await import('../../app/api/habitaciones/contacto/route')
  const ok = { n: 'Ana', e: 'ana@ejemplo.com', p: 'Propietario', h: '1 a 3', c: true, web: '' }
  assert.equal((await POST(mk(ok))).status, 200)
  assert.equal(sent.length, 2)
  assert.deepEqual(sent[0].to, ['admin@vendoya.es']); assert.equal(sent[0].reply_to, 'ana@ejemplo.com')
  assert.deepEqual(sent[1].to, ['ana@ejemplo.com']); assert.match(sent[1].text, /24 h laborables/)
  assert.ok(sent.every(m => m.from === 'Vendoya <admin@vendoya.es>'))
  assert.equal((await POST(mk({ ...ok, web: 'spam' }, '2.2.2.2'))).status, 200); assert.equal(sent.length, 2) // honeypot
  assert.equal((await POST(mk({ ...ok, c: false }, '3.3.3.3'))).status, 400)
  assert.equal((await POST(mk({ ...ok, e: 'mal' }, '3.3.3.3'))).status, 400)
  assert.equal((await POST(mk({ ...ok, n: 'A\r\nBcc: x@y.z' }, '4.4.4.4'))).status, 200)
  assert.ok(!/[\r\n]/.test(sent[sent.length - 2].subject))
  for (let i = 0; i < 4; i++) await POST(mk(ok, '5.5.5.5'))
  assert.equal((await POST(mk(ok, '5.5.5.5'))).status, 200) // 5ª
  assert.equal((await POST(mk(ok, '5.5.5.5'))).status, 429) // 6ª
  delete process.env.RESEND_API_KEY
  assert.equal((await POST(mk(ok, '6.6.6.6'))).status, 503)
  console.log('contacto OK')
})()
