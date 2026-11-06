import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandler } from '../netlify/functions/session.mjs';
const url = 'https://capte.netlify.app/api/auth/session.php';
const secret = 'a'.repeat(64);
const clientId = 'test.apps.googleusercontent.com';
const cookie = response => response.headers.get('set-cookie').split(';')[0];
async function start(handler) {
  const response = await handler(new Request(url));
  return { cookie: cookie(response), data: await response.json(), response };
}
function post(state, body, extra = {}) {
  return new Request(url, { method: 'POST', headers: { cookie: state.cookie, origin: new URL(url).origin, 'X-CSRF-Token': state.data.csrf, 'Content-Type': 'application/json', ...extra }, body: JSON.stringify(body) });
}
test('requires configured session secret', async () => {
  assert.equal((await createHandler()(new Request(url))).status, 503);
});
test('session, login, persistence, logout and invalid credentials', async () => {
  let nonce;
  const handler = createHandler({ secret, clientId, verify: async token => {
    if (token !== 'valid') throw new Error('invalid signature');
    return { sub: 'user-1', aud: clientId, iss: 'https://accounts.google.com', exp: Math.floor(Date.now()/1000)+600, nonce, name: 'Pessoa', email: 'pessoa@example.com' };
  } });
  const state = await start(handler);
  nonce = state.data.nonce;
  assert.equal(state.data.user, null);
  assert.match(state.response.headers.get('set-cookie'), /HttpOnly; Secure; SameSite=Lax/);
  assert.equal((await handler(post(state, { action: 'login', credential: 'invalid' }))).status, 401);
  const response = await handler(post(state, { action: 'login', credential: 'valid' }));
  assert.equal(response.status, 200);
  const logged = { cookie: cookie(response), data: await response.json() };
  assert.equal(logged.data.user.id, 'user-1');
  assert.notEqual(logged.data.csrf, state.data.csrf);
  const restored = await handler(new Request(url, { headers: { cookie: logged.cookie } }));
  assert.equal((await restored.json()).user.name, 'Pessoa');
  const logout = await handler(post(logged, { action: 'logout' }));
  assert.equal((await logout.json()).user, null);
  assert.notEqual(cookie(logout), logged.cookie);
});
test('rejects CSRF, foreign origin, tampered cookie, malformed JSON and oversized input', async () => {
  const handler = createHandler({ secret, clientId });
  const state = await start(handler);
  assert.equal((await handler(post(state, { action: 'logout' }, { 'X-CSRF-Token': 'wrong' }))).status, 403);
  assert.equal((await handler(post(state, { action: 'logout' }, { origin: 'https://evil.example' }))).status, 403);
  assert.equal((await handler(post({ ...state, cookie: state.cookie + 'tamper' }, { action: 'logout' }))).status, 403);
  const malformed = post(state, {});
  const bad = new Request(url, { method: 'POST', headers: malformed.headers, body: '{' });
  assert.equal((await handler(bad)).status, 400);
  assert.equal((await handler(post(state, { action: 'login', credential: 'x'.repeat(17000) }))).status, 413);
});
test('rejects wrong Google claims and replayed nonce', async () => {
  let payload;
  const handler = createHandler({ secret, clientId, verify: async () => payload });
  const state = await start(handler);
  const base = { sub: 'user', aud: clientId, iss: 'accounts.google.com', exp: Math.floor(Date.now()/1000)+600, nonce: state.data.nonce };
  for (const change of [{ aud: 'wrong' }, { iss: 'wrong' }, { exp: 1 }, { nonce: 'wrong' }, { sub: '' }]) {
    payload = { ...base, ...change };
    assert.equal((await handler(post(state, { action: 'login', credential: 'token' }))).status, 401);
  }
});
