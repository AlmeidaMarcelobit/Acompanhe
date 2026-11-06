import test from 'node:test';
import assert from 'node:assert/strict';
import { atualizarLista } from '../netlify/lib/minha-lista.mjs';
import { createHandler } from '../netlify/functions/session.mjs';
import { criarHandlerLista } from '../netlify/functions/minha-lista.mjs';
const serie = { id: 10, tipo: 'series', nome: 'Uma série', imagem: 'https://example.com/capa.jpg' };
const filme = { id: 10, tipo: 'filmes', nome: 'Um filme' };
const ep = { id: 101, temporada: 1, numero: 1, nome: 'Primeiro' };
test('lista guarda situações, episódios, episódio atual e filmes sem confundir IDs', () => {
  let doc = atualizarLista(null, { action: 'salvar', item: serie, status: 'quero' });
  doc = atualizarLista(doc, { action: 'salvar', item: filme, status: 'concluido' });
  assert.equal(Object.keys(doc.itens).length, 2);
  doc = atualizarLista(doc, { action: 'atual', item: serie, episodio: ep });
  assert.equal(doc.itens['series:10'].status, 'assistindo');
  assert.equal(doc.itens['series:10'].atual.id, ep.id);
  doc = atualizarLista(doc, { action: 'episodio', item: serie, episodio: ep, visto: true });
  doc = atualizarLista(doc, { action: 'episodio', item: serie, episodio: ep, visto: true });
  assert.deepEqual(doc.itens['series:10'].vistos, [101]);
  assert.equal(doc.itens['series:10'].atual, null);
  doc = atualizarLista(doc, { action: 'atual', item: serie, episodio: { ...ep, id: 102 } });
  doc = atualizarLista(doc, { action: 'status', chave: 'series:10', status: 'concluido', episodios: doc.itens['series:10'].vistos });
  assert.equal(doc.itens['series:10'].atual, null);
  doc = atualizarLista(doc, { action: 'episodio', item: serie, episodio: ep, visto: false });
  assert.equal(doc.itens['series:10'].status, 'assistindo');
  assert.deepEqual(doc.itens['series:10'].vistos, []);
  doc = atualizarLista(doc, { action: 'remover', chave: 'series:10' });
  assert.equal(Object.keys(doc.itens).length, 1);
  assert.ok(doc.itens['filmes:10']);
});
test('rejeita marcação de episódio inválida e não altera documento original', () => {
  const doc = atualizarLista(null, { action: 'salvar', item: serie });
  const snapshot = JSON.stringify(doc);
  assert.throws(() => atualizarLista(doc, { action: 'status', chave: 'series:10', status: 'inexistente' }));
  assert.throws(() => atualizarLista(doc, { action: 'episodio', item: filme, episodio: ep, visto: true }));
  assert.throws(() => atualizarLista(doc, { action: 'episodio', item: serie, episodio: { ...ep, id: -1 }, visto: true }));
  const seen = atualizarLista(doc, { action: 'episodio', item: serie, episodio: ep, visto: true });
  assert.throws(() => atualizarLista(seen, { action: 'atual', item: serie, episodio: ep }));
  assert.equal(JSON.stringify(doc), snapshot);
});
const secret = 'test-session-secret-'.repeat(4);
const clientId = 'test.apps.googleusercontent.com';
const base = 'https://capte.netlify.app';
async function logar(id) {
  let nonce;
  const auth = createHandler({ secret, clientId, verify: async () => ({ aud: clientId, iss: 'accounts.google.com', exp: Math.floor(Date.now()/1000)+600, sub: id, nonce }) });
  const initial = await auth(new Request(`${base}/api/auth/session.php`));
  const cookie = initial.headers.get('set-cookie').split(';')[0];
  const session = await initial.json(); nonce = session.nonce;
  const login = await auth(new Request(`${base}/api/auth/session.php`, { method: 'POST', headers: { cookie, origin: base, 'x-csrf-token': session.csrf }, body: JSON.stringify({ action: 'login', credential: 'test-only' }) }));
  const state = await login.json();
  return { cookie: login.headers.get('set-cookie').split(';')[0], csrf: state.csrf };
}
function memoria() {
  const docs = new Map();
  let contador = 0;
  return { docs, getWithMetadata: async chave => structuredClone(docs.get(chave) || null), setJSON: async (chave, doc, opts) => {
    const old = docs.get(chave);
    if ((opts.onlyIfNew && old) || (opts.onlyIfMatch && old?.etag !== opts.onlyIfMatch)) return { modified: false };
    const etag = String(++contador); docs.set(chave, { data: structuredClone(doc), etag }); return { modified: true, etag };
  } };
}
function request(user, op, headers = {}) {
  return new Request(`${base}/api/lista/index.php`, { method: op ? 'POST' : 'GET', headers: { cookie: user.cookie, origin: base, 'x-csrf-token': user.csrf, ...headers }, ...(op ? { body: JSON.stringify(op) } : {}) });
}
test('API persiste após nova sessão e isola listas entre contas', async () => {
  const store = memoria();
  const handler = criarHandlerLista({ secret, armazenamento: () => store });
  const pessoa = await logar('pessoa-a');
  const outra = await logar('pessoa-b');
  assert.equal((await handler(new Request(`${base}/api/lista/index.php`))).status, 401);
  assert.equal((await handler(request(pessoa, { action: 'salvar', item: serie }, { 'x-csrf-token': 'wrong' }))).status, 403);
  assert.equal((await handler(request(pessoa, { action: 'salvar', item: serie }, { origin: 'https://outro.example' }))).status, 403);
  assert.equal((await handler(request(pessoa, { action: 'salvar', item: serie }))).status, 200);
  assert.equal((await (await handler(request(outra))).json()).itens.length, 0);
  const novaSessao = await logar('pessoa-a');
  assert.equal((await (await handler(request(novaSessao))).json()).itens[0].nome, serie.nome);
});
test('escritas concorrentes são reaplicadas sem perder episódios', async () => {
  const store = memoria();
  const handler = criarHandlerLista({ secret, armazenamento: () => store });
  const pessoa = await logar('pessoa-c');
  const resultados = await Promise.all([handler(request(pessoa, { action: 'episodio', item: serie, episodio: ep, visto: true })), handler(request(pessoa, { action: 'episodio', item: serie, episodio: { ...ep, id: 102 }, visto: true }))]);
  assert.deepEqual(resultados.map(r => r.status), [200, 200]);
  const lista = await (await handler(request(pessoa))).json();
  assert.deepEqual(lista.itens[0].vistos.sort(), [101, 102]);
});
test('erro de armazenamento não confirma gravação e é recuperável', async () => {
  const handler = criarHandlerLista({ secret, armazenamento: () => { throw new Error('offline'); } });
  assert.equal((await handler(request(await logar('pessoa-d')))).status, 503);
});

test('temporada marca em lote sem duplicar e mantém outras temporadas', () => {
  let doc = atualizarLista(null, { action: 'episodio', item: serie, episodio: { ...ep, id: 201, temporada: 2 }, visto: true });
  doc = atualizarLista(doc, { action: 'atual', item: serie, episodio: { ...ep, id: 102 } });
  const op = { action: 'temporada', item: serie, temporada: 1, episodios: [101, 102, 103, 103], visto: true };
  doc = atualizarLista(doc, op);
  doc = atualizarLista(doc, op);
  assert.deepEqual(doc.itens['series:10'].vistos.sort(), [101, 102, 103, 201]);
  assert.equal(doc.itens['series:10'].atual, null);
  doc = atualizarLista(doc, { action: 'episodio', item: serie, episodio: { ...ep, id: 102 }, visto: false });
  assert.deepEqual(doc.itens['series:10'].vistos.sort(), [101, 103, 201]);
  doc = atualizarLista(doc, { action: 'status', chave: 'series:10', status: 'concluido', episodios: doc.itens['series:10'].vistos });
  doc = atualizarLista(doc, { ...op, visto: false });
  assert.deepEqual(doc.itens['series:10'].vistos, [201]);
  assert.equal(doc.itens['series:10'].status, 'assistindo');
});
test('temporada preserva episódio atual externo e rejeita lotes inválidos sem gravar', () => {
  const doc = atualizarLista(null, { action: 'atual', item: serie, episodio: { ...ep, id: 201, temporada: 2 } });
  const op = { action: 'temporada', item: serie, temporada: 1, episodios: [101, 102], visto: true };
  const novo = atualizarLista(doc, op);
  assert.equal(novo.itens['series:10'].atual.id, 201);
  for (const valor of [{ episodios: [] }, { episodios: [0] }, { episodios: ['101'] }, { temporada: -1 }, { visto: 'true' }, { episodios: Array(2001).fill(101) }, { item: filme }]) assert.throws(() => atualizarLista(doc, { ...op, ...valor }));
  assert.deepEqual(doc.itens['series:10'].vistos, []);
});
test('temporada e episódio concorrentes preservam ambas as alterações', async () => {
  const store = memoria();
  const handler = criarHandlerLista({ secret, armazenamento: () => store });
  const pessoa = await logar('temporadas-concorrentes');
  const respostas = await Promise.all([
    handler(request(pessoa, { action: 'temporada', item: serie, temporada: 1, episodios: [101, 102, 103], visto: true })),
    handler(request(pessoa, { action: 'episodio', item: serie, episodio: { ...ep, id: 201, temporada: 2 }, visto: true }))
  ]);
  assert.deepEqual(respostas.map(r => r.status), [200, 200]);
  assert.deepEqual((await (await handler(request(pessoa))).json()).itens[0].vistos.sort(), [101, 102, 103, 201]);
});
test('marcação em lote exclui episódios com data futura', async () => {
  const { episodiosDisponiveis } = await import('../src/utils/progresso.mjs');
  assert.deepEqual(episodiosDisponiveis([{ id: 1, airdate: '2026-11-05' }, { id: 2, airdate: '2026-11-06' }, { id: 3, airdate: '2026-11-07' }, { id: 4, airdate: null }], '2026-11-06').map(ep => ep.id), [1, 2, 4]);
});

test('concluir série marca todas as temporadas e permite ajustar um episódio', () => {
  const base = atualizarLista(null, {action:'atual', item:serie, episodio:ep});
  const op = {action:'status', chave:'series:10', status:'concluido', episodios:[101,102,201,202,202]};
  const concluido = atualizarLista(base, op);
  assert.deepEqual(concluido.itens['series:10'].vistos, [101,102,201,202]);
  assert.equal(concluido.itens['series:10'].atual, null);
  assert.equal(concluido.itens['series:10'].status, 'concluido');
  assert.deepEqual(atualizarLista(concluido,op).itens['series:10'].vistos,[101,102,201,202]);
  for (const episodios of [undefined, [101,'202'], [0], Array(20001).fill(1)]) assert.throws(() => atualizarLista(base,{...op,episodios}));
  assert.deepEqual(base.itens['series:10'].vistos,[]);
  const ajuste=atualizarLista(concluido,{action:'episodio',item:serie,episodio:ep,visto:false});
  assert.deepEqual(ajuste.itens['series:10'].vistos,[102,201,202]);
  assert.equal(ajuste.itens['series:10'].status,'assistindo');
});
