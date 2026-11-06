import test from 'node:test';
import assert from 'node:assert/strict';
import { criarHandlerCatalogo } from '../netlify/functions/catalogo.mjs';
import { prepararConsulta } from '../netlify/lib/catalogo.mjs';
import { normalizarTituloTmdb, normalizarEpisodioTmdb, chaveCatalogo } from '../src/utils/catalogo.mjs';
import { atualizarLista } from '../netlify/lib/minha-lista.mjs';
const base = 'https://capte.netlify.app/api/catalogo/index.php';
test('TMDB recebe autenticação privada, pt-BR e região Brasil para filmes', async () => {
  let chamado;
  const handler = criarHandlerCatalogo({ token: 'token-apenas-de-teste', fetcher: async (url, options) => { chamado = { url: new URL(url), options }; return Response.json({ results: [{ id: 1, title: 'A Origem' }] }); } });
  const res = await handler(new Request(`${base}?acao=buscar&tipo=filmes&q=A%20Origem`));
  assert.equal(res.status, 200);
  assert.equal(chamado.url.pathname, '/3/search/movie');
  assert.equal(chamado.url.searchParams.get('language'), 'pt-BR');
  assert.equal(chamado.url.searchParams.get('region'), 'BR');
  assert.equal(chamado.options.headers.Authorization, 'Bearer token-apenas-de-teste');
  assert.ok(!(await res.text()).includes('token-apenas-de-teste'));
  const series = prepararConsulta(new URLSearchParams({ acao: 'buscar', tipo: 'series' }));
  assert.equal(series.path, '/tv/popular');
  assert.equal(series.query.get('language'), 'pt-BR');
});
test('temporadas e episódios são consultados separadamente e validam IDs', () => {
  assert.equal(prepararConsulta(new URLSearchParams({ acao: 'temporadas', id: '123' })).path, '/tv/123');
  assert.equal(prepararConsulta(new URLSearchParams({ acao: 'episodios', id: '123', temporada: '0' })).path, '/tv/123/season/0');
  for (const query of ['acao=buscar&tipo=pessoas', 'acao=temporadas&id=../12', 'acao=episodios&id=123&temporada=-1', 'acao=episodios&id=123&temporada=1/credits']) assert.throws(() => prepararConsulta(new URLSearchParams(query)));
});
test('sem token permite fallback; token inválido e erro de provedor não expõem dados', async () => {
  const res = await criarHandlerCatalogo()(new Request(`${base}?tipo=series`));
  assert.equal(res.status, 503);
  assert.equal((await res.json()).code, 'TMDB_NOT_CONFIGURED');
  const handler = criarHandlerCatalogo({ token: 'secreto-de-teste', fetcher: async () => new Response('secreto-de-teste', { status: 401 }) });
  const fail = await handler(new Request(`${base}?tipo=series`));
  assert.equal(fail.status, 503);
  assert.ok(!(await fail.text()).includes('secreto-de-teste'));
  assert.equal((await handler(new Request(base, { method: 'POST' }))).status, 405);
});
test('normalização conserva português e IDs de temporadas e episódios', () => {
  const item = normalizarTituloTmdb({ id: 1, title: 'A Origem', overview: 'Uma sinopse em português.', poster_path: '/capa.jpg', release_date: '2010-07-16' }, 'filmes');
  assert.equal(item.nome, 'A Origem'); assert.equal(item.ano, '2010'); assert.equal(item.fonte, 'tmdb');
  assert.equal(item.imagem, 'https://image.tmdb.org/t/p/w500/capa.jpg');
  assert.deepEqual(normalizarEpisodioTmdb({ id: 10, name: 'O começo', season_number: 1, episode_number: 2, air_date: '2026-01-01', runtime: 45 }), { id: 10, name: 'O começo', season: 1, number: 2, airdate: '2026-01-01', runtime: 45 });
});
test('TMDB não sobrescreve progresso legado de série com o mesmo ID', () => {
  const legado = { id: 100, tipo: 'series', nome: 'Série antiga' };
  const tmdb = { id: 100, tipo: 'series', nome: 'Série em português', fonte: 'tmdb' };
  const ep = { id: 12, temporada: 1, numero: 1, nome: 'Primeiro' };
  let doc = atualizarLista(null, { action: 'episodio', item: legado, episodio: ep, visto: true });
  doc = atualizarLista(doc, { action: 'salvar', item: tmdb });
  assert.equal(chaveCatalogo(legado), 'series:100');
  assert.equal(chaveCatalogo(tmdb), 'tmdb:series:100');
  assert.deepEqual(doc.itens['series:100'].vistos, [12]);
  assert.deepEqual(doc.itens['tmdb:series:100'].vistos, []);
  assert.equal(doc.itens['tmdb:series:100'].fonte, 'tmdb');
  doc = atualizarLista(doc, { action: 'status', chave: 'tmdb:series:100', status: 'assistindo' });
  assert.equal(doc.itens['series:100'].status, 'assistindo');
  doc = atualizarLista(doc, { action: 'remover', chave: 'tmdb:series:100' });
  assert.deepEqual(doc.itens['series:100'].vistos, [12]);
  assert.throws(() => atualizarLista(doc, { action: 'salvar', item: { ...tmdb, fonte: 'outra' } }));
});

test('séries usam nome e filmes usam título ao normalizar', () => {
  const dados = { id: 2, title: 'Título de filme', name: 'Nome da série' };
  assert.equal(normalizarTituloTmdb(dados, 'series').nome, 'Nome da série');
  assert.equal(normalizarTituloTmdb(dados, 'filmes').nome, 'Título de filme');
});
