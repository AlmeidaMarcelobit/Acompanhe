import { normalizarTituloTmdb, normalizarEpisodioTmdb } from '../../utils/catalogo.mjs';
const endpoint = new URL('../../../api/catalogo/index.php', import.meta.url);
async function obterJson(url, signal) {
  const resposta = await fetch(url, { signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000) });
  if (!resposta.ok) { const dados = await resposta.json().catch(() => ({})); const erro = new Error(dados.error || `Falha na API (${resposta.status}).`); erro.code = dados.code; throw erro; }
  return resposta.json();
}
async function buscarSeriesLegado(termo, signal) {
  const dados = await obterJson(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(termo || 'terminal')}`, signal);
  return dados.map(({ show }) => ({ id: show.id, tipo: 'series', nome: show.name, imagem: show.image?.medium, ano: show.premiered?.slice(0, 4), sinopse: show.summary, url: show.url }));
}
let filmesCache;
async function buscarFilmesLegado(termo, signal) {
  if (!filmesCache) filmesCache = await obterJson('https://api.sampleapis.com/movies/action-adventure', signal);
  const normalizar = texto => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return filmesCache.filter(filme => normalizar(filme.title).includes(normalizar(termo || ''))).map(filme => ({
    id: filme.id, tipo: 'filmes', nome: filme.title, imagem: filme.posterURL,
    sinopse: 'Filme do catálogo de demonstração de ação e aventura da SampleAPIs. Sinopse e ano não disponíveis nesta fonte.',
    url: /^tt\d+$/.test(filme.imdbId) ? `https://www.imdb.com/title/${filme.imdbId}/` : null,
  }));
}
function buscarEpisodiosLegado(id, signal) {
  return obterJson(`https://api.tvmaze.com/shows/${encodeURIComponent(id)}/episodes?specials=1`, signal);
}

function consultarTmdb(parametros, signal) {
  const url = new URL(endpoint); url.search = new URLSearchParams(parametros);
  return obterJson(url, signal);
}
async function buscarTmdb(tipo, termo, signal) {
  try {
    const dados = await consultarTmdb({ acao: 'buscar', tipo, q: termo || '' }, signal);
    return dados.results.map(item => normalizarTituloTmdb(item, tipo));
  } catch (erro) {
    if (erro.code !== 'TMDB_NOT_CONFIGURED') throw erro;
    return (tipo === 'series' ? buscarSeriesLegado : buscarFilmesLegado)(termo, signal);
  }
}
export const buscarSeries = (termo, signal) => buscarTmdb('series', termo, signal);
export const buscarFilmes = (termo, signal) => buscarTmdb('filmes', termo, signal);
export async function buscarTemporadas(item, signal) {
  const dados = await consultarTmdb({ acao: 'temporadas', id: String(item.id) }, signal);
  return dados.seasons || [];
}
export async function buscarEpisodios(item, signal, temporada) {
  if (item.fonte !== 'tmdb') return buscarEpisodiosLegado(item.id, signal);
  const dados = await consultarTmdb({ acao: 'episodios', id: String(item.id), temporada: String(temporada) }, signal);
  return (dados.episodes || []).map(normalizarEpisodioTmdb);
}

export async function buscarTodosEpisodios(item, signal) {
  if (item.fonte !== 'tmdb') return buscarEpisodios(item, signal);
  const temporadas = await buscarTemporadas(item, signal);
  const resultado = [];
  let indice = 0;
  await Promise.all(Array.from({ length: Math.min(4, temporadas.length) }, async () => {
    while (indice < temporadas.length) {
      const temporada = temporadas[indice++];
      resultado.push(...await buscarEpisodios(item, signal, temporada.season_number));
    }
  }));
  return resultado;
}
