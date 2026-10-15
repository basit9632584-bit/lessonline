import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, request as httpRequest } from 'node:http';
import { createNimMiddleware, validateInput, validateOutput, DEFAULT_MODEL } from '../server/nim.mjs';

const key = 'test-secret-not-a-real-credential';
const good = text => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ explanation: text ?? 'Slope 2 means y rises by 2 when x rises by 1. At x=0, y=1.' }) } }] }));
async function fixture(t, options = {}) {
  const middleware = createNimMiddleware({ apiKey: key, ...options });
  const server = createServer((req, res) => middleware(req, res, () => { res.statusCode = 404; res.end(); }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  return async (body = { m: 2, b: 1 }, extra = {}) => {
    const { path = '/api/explanation', headers = {}, method = 'POST' } = extra;
    const response = await fetch(base + path, { method, headers: { Origin: base, 'Content-Type': 'application/json', ...headers }, ...(method === 'GET' ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }) });
    return { status: response.status, data: await response.json() };
  };
}

test('coefficient validation is bounded and excludes notes', () => {
  for (const data of [{ m: 10.01, b: 1 }, { m: 0.001, b: 1 }, { m: Infinity, b: 1 }, { m: '2', b: 1 }, { m: 2, b: 1, notes: 'private' }, null]) assert.throws(() => validateInput(data));
  assert.deepEqual(validateInput({ m: -10, b: 0.29 }), { m: -10, b: 0.29 });
});
test('strict model output excludes extra fields and credentials', () => {
  for (const content of ['not json', '{}', '[]', '{"explanation":""}', JSON.stringify({ explanation: 'x'.repeat(2401) }), JSON.stringify({ explanation: 'text', m: 99 }), JSON.stringify({ explanation: key })]) assert.throws(() => validateOutput(content, key));
  assert.deepEqual(validateOutput('{"explanation":" Good. "}'), { explanation: 'Good.' });
});
test('status and missing configuration do not expose credentials', async t => {
  const request = await fixture(t, { apiKey: '', fetchImpl: () => assert.fail('must not call provider') });
  assert.deepEqual(await request({}, { path: '/api/nim/status', method: 'GET' }), { status: 200, data: { configured: false, model: DEFAULT_MODEL } });
  assert.equal((await request()).status, 503);
});
test('provider receives confirmed numbers only and fixed endpoint', async t => {
  let sent;
  const request = await fixture(t, { fetchImpl: async (url, options) => { assert.equal(url, 'https://integrate.api.nvidia.com/v1/chat/completions'); assert.equal(options.headers.Authorization, `Bearer ${key}`); sent = JSON.parse(options.body); return good(); } });
  const result = await request();
  assert.equal(result.status, 200);
  assert.deepEqual(JSON.parse(sent.messages[1].content), { m: 2, b: 1, changeInYForOneStep: 2, yAtZero: 1 });
  assert.equal(sent.model, DEFAULT_MODEL);
  assert.equal(sent.reasoning_effort, 'low');
  assert.equal(sent.max_tokens, 900);
  assert.equal(JSON.stringify(result).includes(key), false);
  assert.deepEqual(Object.keys(result.data), ['explanation']);
});
test('invalid input cannot reach provider; request size is bounded', async t => {
  const request = await fixture(t, { fetchImpl: () => assert.fail('must not call provider') });
  assert.equal((await request({ m: 2, b: 1, notes: 'private notes' })).status, 400);
  assert.equal((await request('{')).status, 400);
  assert.equal((await request('x'.repeat(1025))).status, 413);
});
test('cross origin and missing origin rejected', async t => {
  const request = await fixture(t, { fetchImpl: () => assert.fail('must not call provider') });
  assert.equal((await request(undefined, { headers: { Origin: 'https://example.com' } })).status, 403);
  assert.equal((await request(undefined, { headers: { Origin: '' } })).status, 403);
});
test('non-OK and malformed provider responses yield safe errors', async t => {
  for (const fetchImpl of [async () => new Response(key, { status: 401 }), async () => new Response(key), async () => good(key), async () => new Response(JSON.stringify({ choices: [{ message: { content: '{"explanation":"ok","sourceLineNumbers":[1]}' } }] }))]) {
    const request = await fixture(t, { fetchImpl });
    const result = await request();
    assert.equal(result.status, 502);
    assert.equal(JSON.stringify(result).includes(key), false);
  }
});
test('retired NVIDIA model gives an actionable error without exposing provider text', async t => {
  const request = await fixture(t, { fetchImpl: async () => new Response(key, { status: 410 }) });
  const result = await request();
  assert.equal(result.status, 502);
  assert.match(result.data.error, /model is no longer available/);
  assert.match(result.data.error, /NVIDIA_NIM_MODEL/);
  assert.equal(JSON.stringify(result).includes(key), false);
});
test('timeout stays bounded even when injected fetch ignores abort', async t => {
  const request = await fixture(t, { timeoutMs: 15, fetchImpl: () => new Promise(() => {}) });
  const result = await request();
  assert.equal(result.status, 504);
});
test('provider output bytes and request rate are bounded', async t => {
  const request = await fixture(t, { rateLimit: 1, fetchImpl: async () => new Response('x'.repeat(32769)) });
  assert.equal((await request()).status, 502);
  assert.equal((await request()).status, 429);
});
test('configured status includes only safe model and boolean', async t => {
  const request = await fixture(t, { model: key });
  const result = await request({}, { path: '/api/nim/status', method: 'GET' });
  assert.deepEqual(result.data, { configured: true, model: DEFAULT_MODEL });
});

test('valid JSON from a length-truncated completion is rejected', async t => {
  const request = await fixture(t, { fetchImpl: async () => new Response(JSON.stringify({ choices: [{ finish_reason: 'length', message: { content: '{"explanation":"Apparently complete."}' } }] })) });
  assert.equal((await request()).status, 502);
});

test('simultaneous delayed bodies cannot exceed two provider calls', async t => {
  let calls = 0; const releases = [];
  let arrived = 0; let ready;
  const bodiesWaiting = new Promise(resolve => { ready = resolve; });
  const middleware = createNimMiddleware({ apiKey: key, fetchImpl: () => { calls++; return new Promise(resolve => releases.push(() => resolve(good()))); } });
  const server = createServer((req, res) => {
    middleware(req, res, () => res.end());
    if (++arrived === 3) ready();
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const requests = [];
  const results = Array.from({ length: 3 }, () => new Promise(resolve => {
    const req = httpRequest(base + '/api/explanation', { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json', 'Content-Length': 13 } }, res => {
      res.resume(); res.on('end', () => resolve(res.statusCode));
    });
    req.on('error', error => assert.fail(error.message));
    req.write('{"m":2,'); requests.push(req);
  }));
  // Wait until all three have passed the first admission check and await bodies.
  await bodiesWaiting;
  requests.forEach(req => req.end('"b":1}'));
  const rejected = await Promise.race(results);
  assert.equal(rejected, 429);
  assert.equal(calls, 2);
  releases.forEach(release => release());
  assert.deepEqual((await Promise.all(results)).sort(), [200, 200, 429]);
});
