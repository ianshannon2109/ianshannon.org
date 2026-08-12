/* ianshannon.org — API worker.
 *
 * Static assets are served by the platform first; this only runs when no file
 * matches, which is why /api/* lands here and every existing page keeps its
 * current serving path untouched.
 *
 * Two routes:
 *   POST /api/report-access  -> record a lead, return a signed 24h link
 *   GET  /api/report?t=...   -> verify the link, stream the PDF from KV
 *
 * The PDF lives in KV rather than the repo so it isn't guessable or crawlable.
 * This is lead capture, not containment: anyone who gets the file can forward
 * it, and that's understood and accepted.
 */

const REPORT_KEY = 'giving-without-knowing.pdf';
const REPORT_FILENAME = 'Giving Without Knowing - Ian Shannon.pdf';
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const RATE_LIMIT = 5;          // requests per IP per window
const RATE_WINDOW_HOURS = 1;

/* ---------- small helpers ---------- */

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

const enc = new TextEncoder();

function b64urlEncode(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(str) {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/') + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

async function sign(payload, secret) {
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return b64urlEncode(new Uint8Array(sig));
}

/* Constant-time compare so a bad token can't be brute-forced byte by byte. */
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function validEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) && value.length <= 254;
}

/* ---------- routes ---------- */

async function handleReportAccess(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Expected JSON.' }, 400);
  }

  // Honeypot. Bots fill every field they find; humans never see this one.
  // Answer as if it worked so the bot has nothing to learn, but write nothing
  // and hand back a token that leads to no download.
  if (body.website) return json({ ok: true, url: '/api/report?t=' }, 200);

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!validEmail(email)) {
    return json({ error: 'That address doesn’t look right. Check it and try again.' }, 400);
  }

  const source = body.source === 'quiz' ? 'quiz' : 'capstone';
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  // Hashed, not stored raw — enough to rate-limit, not enough to identify.
  const ipHash = await sha256Hex(ip + '|' + env.REPORT_SIGNING_KEY);

  try {
    const recent = await env.DB.prepare(
      `SELECT COUNT(*) AS n FROM leads
        WHERE ip_hash = ?1 AND created_at > datetime('now', ?2)`
    )
      .bind(ipHash, `-${RATE_WINDOW_HOURS} hours`)
      .first();

    if (recent && recent.n >= RATE_LIMIT) {
      return json({ error: 'Too many requests from this connection. Try again later.' }, 429);
    }

    await env.DB.prepare(
      `INSERT OR IGNORE INTO leads (email, source, ip_hash, user_agent)
       VALUES (?1, ?2, ?3, ?4)`
    )
      .bind(email, source, ipHash, (request.headers.get('user-agent') || '').slice(0, 300))
      .run();
  } catch (err) {
    // A storage failure shouldn't cost the reader their download — the lead is
    // the nice-to-have here, the report is the promise.
    console.error('lead write failed:', err && err.message);
  }

  const exp = String(Date.now() + TOKEN_TTL_MS);
  const payload = b64urlEncode(enc.encode(exp));
  const sig = await sign(payload, env.REPORT_SIGNING_KEY);

  return json({ ok: true, url: `/api/report?t=${payload}.${sig}` });
}

async function handleReport(request, env) {
  const token = new URL(request.url).searchParams.get('t') || '';
  const [payload, sig] = token.split('.');

  const deny = () =>
    new Response(
      'This download link has expired or is not valid.\n\nRequest a new one at https://ianshannon.org/capstone',
      { status: 403, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } }
    );

  if (!payload || !sig) return deny();

  const expected = await sign(payload, env.REPORT_SIGNING_KEY);
  if (!timingSafeEqual(sig, expected)) return deny();

  let exp;
  try {
    exp = Number(new TextDecoder().decode(b64urlDecode(payload)));
  } catch {
    return deny();
  }
  if (!Number.isFinite(exp) || Date.now() > exp) return deny();

  // 'stream' so the PDF is piped through rather than buffered in memory.
  const body = await env.REPORTS.get(REPORT_KEY, 'stream');
  if (!body) {
    return new Response('The report file is missing. Please email ian@ianshannon.org.', {
      status: 404,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  return new Response(body, {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `inline; filename="${REPORT_FILENAME}"`,
      // Signed and short-lived: never let a shared cache hold onto it.
      'cache-control': 'private, no-store',
      'x-robots-tag': 'noindex, nofollow',
    },
  });
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname === '/api/report-access') {
      if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
      return handleReportAccess(request, env);
    }

    if (pathname === '/api/report') {
      if (request.method !== 'GET') return json({ error: 'Method not allowed.' }, 405);
      return handleReport(request, env);
    }

    // Anything else is a static asset the platform didn't already resolve.
    return env.ASSETS.fetch(request);
  },
};
