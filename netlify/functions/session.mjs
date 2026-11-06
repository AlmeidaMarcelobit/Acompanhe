import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
const client = new OAuth2Client();
const cookieName = '__Host-acompanhe_session';
const defaultClientId = '';
const random = () => randomBytes(32).toString('base64url');
function same(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
function sign(body, secret) { return createHmac('sha256', secret).update(body).digest('base64url'); }
function encode(session, secret) {
  const body = Buffer.from(JSON.stringify(session)).toString('base64url');
  return `${body}.${sign(body, secret)}`;
}
function decode(value, secret) {
  try {
    if (!value || value.length > 6000) return null;
    const [body, signature, extra] = value.split('.');
    if (extra || !same(signature, sign(body, secret))) return null;
    const data = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (!Number.isFinite(data.expires) || data.expires <= Date.now() || typeof data.csrf !== 'string' || typeof data.nonce !== 'string') return null;
    return data;
  } catch { return null; }
}
function anonymous() { return { csrf: random(), nonce: random(), expires: Date.now() + 7200000, user: null }; }
export function createHandler({ secret, clientId = defaultClientId, verify = async token => (await client.verifyIdToken({ idToken: token, audience: clientId })).getPayload() } = {}) {
  return async request => {
    const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
    const reply = (status, data, session) => {
      const result = { ...headers };
      if (session) result['Set-Cookie'] = `${cookieName}=${encode(session, secret)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=7200`;
      return new Response(JSON.stringify(data), { status, headers: result });
    };
    if (!secret || Buffer.byteLength(secret) < 32) return reply(503, { error: 'Serviço de login ainda não configurado.' });
    const configured = /^[a-zA-Z0-9._-]+\.apps\.googleusercontent\.com$/.test(clientId);
    const raw = (request.headers.get('cookie') || '').split(';').map(v => v.trim()).find(v => v.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
    const saved = decode(raw, secret);
    let session = saved || anonymous();
    const state = () => ({ configured, clientId: configured ? clientId : null, csrf: session.csrf, nonce: session.nonce, user: session.user });
    if (request.method === 'GET') return reply(200, state(), saved ? null : session);
    if (request.method !== 'POST') { headers.Allow = 'GET, POST'; return reply(405, { error: 'Método não permitido.' }); }
    if (request.headers.get('origin') !== new URL(request.url).origin || !saved || !same(request.headers.get('x-csrf-token'), session.csrf)) return reply(403, { error: 'Sessão inválida. Recarregue a página.' });
    if (Number(request.headers.get('content-length')) > 16384) return reply(413, { error: 'Requisição muito grande.' });
    let data;
    try {
      const text = await request.text();
      if (Buffer.byteLength(text) > 16384) return reply(413, { error: 'Requisição muito grande.' });
      data = JSON.parse(text);
      if (!data || typeof data !== 'object') throw new Error();
    } catch { return reply(400, { error: 'Requisição inválida.' }); }
    if (data.action === 'logout') { session = anonymous(); return reply(200, state(), session); }
    if (data.action !== 'login') return reply(400, { error: 'Ação inválida.' });
    if (!configured) return reply(503, { error: 'Login com Google ainda não configurado.' });
    if (typeof data.credential !== 'string' || !data.credential || data.credential.length > 12000) return reply(400, { error: 'Credencial inválida.' });
    try {
      const payload = await verify(data.credential);
      if (!payload || payload.aud !== clientId || !['accounts.google.com', 'https://accounts.google.com'].includes(payload.iss) || !Number.isFinite(payload.exp) || payload.exp * 1000 <= Date.now() || typeof payload.sub !== 'string' || !payload.sub || !same(payload.nonce, session.nonce)) throw new Error();
      session = { ...anonymous(), user: { id: payload.sub, name: String(payload.name || 'Usuário Google').slice(0, 200), email: String(payload.email || '').slice(0, 320) } };
      return reply(200, state(), session);
    } catch { return reply(401, { error: 'Não foi possível validar o login com Google. Tente novamente.' }); }
  };
}
export default request => createHandler({ secret: process.env.SESSION_SECRET, clientId: process.env.GOOGLE_CLIENT_ID || defaultClientId })(request);
