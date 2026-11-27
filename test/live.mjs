import assert from 'node:assert/strict'
import { test } from 'node:test'

const base = process.env.RASTALOOP_TEST_URL || 'http://127.0.0.1:3000'

async function call(path = '/api/demo', { cookie, data, origin = base } = {}) {
  const headers = cookie ? { Cookie: cookie } : {}
  if (data !== undefined) Object.assign(headers, { 'Content-Type': 'application/json', Origin: origin })
  const response = await fetch(`${base}${path}`, { headers, method: data === undefined ? 'GET' : 'POST', body: JSON.stringify(data) })
  return { status: response.status, cookie: response.headers.get('set-cookie')?.split(';')[0], body: await response.json() }
}

test('serves baseline security headers', async () => {
  const response = await fetch(base)
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
  assert.equal(response.headers.get('referrer-policy'), 'strict-origin-when-cross-origin')
  assert.equal(response.headers.get('x-frame-options'), 'DENY')
  assert.equal(response.headers.get('permissions-policy'), 'camera=(), microphone=(), geolocation=(self)')
})

test('persisted demo state is scoped, atomic and resettable through the public API', async () => {
  assert.equal((await call()).status, 404)
  assert.equal((await call('/api/demo', { data: {}, origin: 'https://another-site.example' })).status, 403)
  const first = await call('/api/demo', { data: {} })
  const other = await call('/api/demo', { data: {} })
  assert.equal(first.status, 201)
  assert.ok(first.cookie)
  assert.notEqual(first.cookie, other.cookie)
  const cookie = first.cookie
  const action = { kind: 'report', actor: 'resident', category: 'ramp', segmentId: 'ramp', observation: 'blocked', version: 0 }
  const send = (data) => call('/api/demo/actions', { cookie, data })
  const contenders = await Promise.all([send(action), send(action)])
  assert.deepEqual(contenders.map(result => result.status).sort(), [200, 409])
  const current = await call('/api/demo', { cookie })
  assert.equal(current.body.version, 1)
  assert.equal(current.body.state.cases.length, 2)
  assert.equal((await call('/api/demo', { cookie: other.cookie })).body.state.cases.length, 1)
  const { id: caseId } = current.body.state.cases[1]
  assert.equal((await send({ kind: 'verify', actor: 'operator', caseId, version: 1 })).status, 422)
  const verified = await send({ kind: 'verify', actor: 'reviewer', caseId, version: 1 })
  assert.equal(verified.body.state.cases[1].status, 'verified')
  const reset = await call('/api/demo', { cookie, data: {} })
  assert.equal(reset.body.version, 0)
  assert.equal(reset.body.state.cases.length, 1)
  assert.notEqual(reset.cookie, cookie)
  assert.equal((await call('/api/demo', { cookie: reset.cookie })).body.state.cases.length, 1)
})
