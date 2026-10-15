export const DEFAULT_MODEL = 'openai/gpt-oss-20b';
const ENDPOINT = 'https://integrate.api.nvidia.com/v1/chat/completions';
class SafeError extends Error { constructor(status, message) { super(message); this.status = status; } }
const fail = (status, message) => { throw new SafeError(status, message); };
const coefficient = n => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 10 && Math.abs(n * 100 - Math.round(n * 100)) < 1e-9;

export function validateInput(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).sort().join(',') !== 'b,m' || !coefficient(data.m) || !coefficient(data.b)) fail(400, 'Send only slope and intercept from −10 to 10 with up to two decimals.');
  return { m: data.m, b: data.b };
}
export function validateOutput(content, key = '') {
  let output;
  try { output = JSON.parse(content); } catch { fail(502, 'The AI response could not be reviewed. Try again.'); }
  if (!output || typeof output !== 'object' || Array.isArray(output) || Object.keys(output).join(',') !== 'explanation' || typeof output.explanation !== 'string' || !output.explanation.trim() || output.explanation.length > 2400 || (key && output.explanation.includes(key))) fail(502, 'The AI response could not be reviewed. Try again.');
  return { explanation: output.explanation.trim() };
}
async function boundedText(response) {
  const reader = response.body?.getReader();
  if (!reader) fail(502, 'The AI service returned an empty response.');
  const chunks = []; let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 32768) fail(502, 'The AI response was too large. Try again.');
      chunks.push(value);
    }
    return Buffer.concat(chunks).toString('utf8');
  } finally { await reader.cancel().catch(() => {}); }
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    const finish = error => { clearTimeout(timer); req.off('data', data); req.off('end', end); req.off('error', errorHandler); if (error) { req.resume(); reject(error); } };
    const data = chunk => { size += chunk.length; if (size > 1024) finish(new SafeError(413, 'The request is too large.')); else chunks.push(chunk); };
    const end = () => { finish(); try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { reject(new SafeError(400, 'Send a valid JSON request.')); } };
    const errorHandler = () => finish(new SafeError(400, 'The request could not be read.'));
    const timer = setTimeout(() => finish(new SafeError(408, 'The request took too long.')), 5000);
    req.on('data', data); req.on('end', end); req.on('error', errorHandler);
  });
}
function localRequest(req, requireOrigin) {
  try {
    const base = new URL(`http://${req.headers.host}`);
    if (!['localhost', '127.0.0.1', '[::1]'].includes(base.hostname) || base.username || base.password || base.pathname !== '/') return false;
    if (req.headers.origin) return new URL(req.headers.origin).origin === base.origin;
    return !requireOrigin;
  } catch { return false; }
}
export function createNimMiddleware({ apiKey = '', model = DEFAULT_MODEL, fetchImpl = globalThis.fetch, timeoutMs = 30000, now = Date.now, rateLimit = 6 } = {}) {
  const key = typeof apiKey === 'string' ? apiKey.trim() : '';
  const safeModel = typeof model === 'string' && /^[a-z0-9._-]+\/[a-z0-9._-]+$/i.test(model) && model.length <= 120 && !(key && model.includes(key)) ? model : DEFAULT_MODEL;
  const attempts = []; let active = 0;
  return async function middleware(req, res, next) {
    const path = req.url?.split('?')[0];
    if (path !== '/api/nim/status' && path !== '/api/explanation') return next();
    const send = (status, data) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff'); res.end(JSON.stringify(data)); };
    try {
      if (!localRequest(req, path === '/api/explanation')) fail(403, 'Use this API from the local lesson app.');
      if (path === '/api/nim/status') {
        if (req.method !== 'GET') fail(405, 'Use GET for service status.');
        return send(200, { configured: Boolean(key), model: safeModel });
      }
      if (req.method !== 'POST') fail(405, 'Use POST to request an explanation.');
      if (!key) fail(503, 'AI explanations are not configured. Add NVIDIA_API_KEY on the server and restart the app.');
      if ((req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase() !== 'application/json') fail(415, 'Send a JSON request.');
      const current = now(); while (attempts.length && attempts[0] <= current - 60000) attempts.shift();
      if (attempts.length >= rateLimit || active >= 2) fail(429, 'Please wait before requesting another explanation.');
      attempts.push(current);
      const input = validateInput(await readBody(req));
      // Bodies may finish together after the earlier admission check.
      if (active >= 2) fail(429, 'Please wait before requesting another explanation.');
      const controller = new AbortController(); let timer;
      active++;
      try {
        const operation = (async () => {
          const response = await fetchImpl(ENDPOINT, {
            method: 'POST', signal: controller.signal,
            headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: safeModel, temperature: 0.2, max_tokens: 900, stream: false,
              ...(safeModel === 'openai/gpt-oss-20b' ? { reasoning_effort: 'low' } : {}), messages: [
              { role: 'system', content: 'Draft a short plain-text explanation of the confirmed equation y = mx + b for a secondary-school learner. Do not change the confirmed coefficients. Explain slope as change in y for a step of 1 in x and intercept as y at x=0. You have not received or read any teacher notes. Do not claim verification or source citations. Return ONLY a JSON object with exactly one key: explanation, a nonempty plain-text string of at most 2400 characters. No HTML, code, credentials, or markdown fences.' },
              { role: 'user', content: JSON.stringify({ m: input.m, b: input.b, changeInYForOneStep: input.m, yAtZero: input.b }) },
            ] }),
          });
          if (!response.ok) {
            await response.body?.cancel().catch(() => {});
            if (response.status === 410) fail(502, 'The configured NVIDIA model is no longer available. Set NVIDIA_NIM_MODEL to an available model and restart the app.');
            fail(502, 'The AI service could not complete the request. Try again later.');
          }
          let payload; try { payload = JSON.parse(await boundedText(response)); } catch (error) { if (error instanceof SafeError) throw error; fail(502, 'The AI service returned an unreadable response.'); }
          if (payload?.choices?.[0]?.finish_reason === 'length') fail(502, 'The AI response was incomplete. Try again.');
          const content = payload?.choices?.[0]?.message?.content;
          if (typeof content !== 'string' || content.length > 12000) fail(502, 'The AI response could not be reviewed. Try again.');
          return validateOutput(content, key);
        })();
        const timeout = new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new SafeError(504, 'The AI request timed out. Try again.')); }, timeoutMs); });
        send(200, await Promise.race([operation, timeout]));
      } finally { clearTimeout(timer); controller.abort(); active--; }
    } catch (error) { send(error instanceof SafeError ? error.status : 502, { error: error instanceof SafeError ? error.message : 'The AI service is unavailable. Try again later.' }); }
  };
}
