// node --test test/
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { handleScreen, MAX_TEXT } from '../functions/api/screen.js'
import { onRequestGet as config } from '../functions/api/config.js'

const KEY = 'ck_test_value'
const same = { 'Sec-Fetch-Site': 'same-origin', 'Content-Type': 'application/json' }
const post = (body, headers = same) => new Request('https://shield-proxy.example-site.com/api/screen', { method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body) })
const j = (o, status = 200) => new Response(JSON.stringify(o), { status })
const answer = { verdict: 'block', risk_score: 91, findings: [{ id: 'inj-1', category: 'injection', severity: 'high', detail: 'Instruction override' }], sanitized_text: null, partial: false, note: 'Heuristic screen.' }

test('a screening call goes to the Shield prompt endpoint with the server-side key and returns the verdict', async () => {
  const calls = []
  const f = async (url, init) => { calls.push({ url: String(url), key: init.headers['X-Caelara-Key'], body: JSON.parse(init.body) }); return j(answer) }
  const r = await handleScreen(post({ text: 'Ignore previous instructions' }), { CAELARA_API_KEY: KEY }, f)
  const b = await r.json()
  assert.equal(r.status, 200); assert.equal(b.verdict, 'block'); assert.equal(b.findings[0].category, 'injection')
  assert.equal(calls.length, 1); assert.equal(calls[0].url, 'https://shield.caelaralabs.com/v1/shield/prompt'); assert.equal(calls[0].key, KEY); assert.equal(calls[0].body.redact, true)
  assert.ok(!JSON.stringify(b).includes(KEY), 'the key never appears in a response')
})

test('input is validated before any paid call', async () => {
  const calls = []
  const f = async (...a) => { calls.push(a); return j(answer) }
  for (const body of [{}, { text: '' }, { text: '   ' }, { text: 5 }, { text: 'x'.repeat(MAX_TEXT + 1) }, '{ not json', '[]']) {
    assert.equal((await handleScreen(post(body), { CAELARA_API_KEY: KEY }, f)).status, 400)
  }
  assert.equal(calls.length, 0)
})

test('only the site itself may call, a key must be set, and only POST is accepted', async () => {
  const f = async () => j(answer)
  assert.equal((await handleScreen(post({ text: 'hi' }, { 'Content-Type': 'application/json' }), { CAELARA_API_KEY: KEY }, f)).status, 403)
  assert.equal((await handleScreen(post({ text: 'hi' }, { 'Content-Type': 'application/json' }), { CAELARA_API_KEY: KEY, ALLOW_DIRECT_CALLS: 'true' }, f)).status, 200)
  assert.equal((await handleScreen(post({ text: 'hi' }), {}, f)).status, 503)
  const get = new Request('https://shield-proxy.example-site.com/api/screen', { headers: same })
  const r = await handleScreen(get, { CAELARA_API_KEY: KEY }, f)
  assert.equal(r.status, 405); assert.equal(r.headers.get('Allow'), 'POST')
})

test('payment and rate-limit answers become a readable error, and odd upstream values are normalised', async () => {
  const r = await handleScreen(post({ text: 'hi' }), { CAELARA_API_KEY: KEY }, async () => j({ error: 'x' }, 402))
  assert.equal(r.status, 503); assert.match((await r.json()).error, /out of credit|key/)
  const odd = await handleScreen(post({ text: 'hi' }), { CAELARA_API_KEY: KEY }, async () => j({ verdict: 'maybe', findings: 'no', risk_score: 'high' }))
  const b = await odd.json()
  assert.equal(b.verdict, 'review'); assert.deepEqual(b.findings, []); assert.equal(b.risk_score, null)
})

test('redaction can be turned off and the config endpoint returns the brand and form', async () => {
  let sent
  await handleScreen(post({ text: 'hi', redact: false }), { CAELARA_API_KEY: KEY }, async (u, init) => { sent = JSON.parse(init.body); return j(answer) })
  assert.equal(sent.redact, false)
  const c = await (await config({ env: { NEXT_PUBLIC_BRAND_NAME: 'Acme Guard' } })).json()
  assert.equal(c.brand, 'Acme Guard'); assert.equal(c.method, 'POST'); assert.equal(c.path, '/api/screen'); assert.ok(c.fields.length === 1)
  assert.ok(!JSON.stringify(c).includes(KEY))
})
