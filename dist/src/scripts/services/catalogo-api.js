async function obterJson(url, signal) {
  const resposta = await fetch(url, { signal: signal ?? AbortSignal.timeout(20000) });
  if (!resposta.ok) throw new Error(`Falha na API (${resposta.status}).`);
  return resposta.json();
}
export async function buscarSeries(termo, signal) {
  const dados = await obterJson(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(termo || 'terminal')}`, signal);
  return dados.map(({ show }) => ({ id: show.id, tipo: 'series', nome: show.name, imagem: show.image?.medium, ano: show.premiered?.slice(0, 4), sinopse: show.summary, url: show.url }));
}
let filmesCache;
export async function buscarFilmes(termo, signal) {
  if (!filmesCache) filmesCache = await obterJson('https://api.sampleapis.com/movies/action-adventure', signal);
  const normalizar = texto => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return filmesCache.filter(filme => normalizar(filme.title).includes(normalizar(termo || ''))).map(filme => ({
    id: filme.id, tipo: 'filmes', nome: filme.title, imagem: filme.posterURL,
    sinopse: 'Filme do catálogo de demonstração de ação e aventura da SampleAPIs. Sinopse e ano não disponíveis nesta fonte.',
    url: /^tt\d+$/.test(filme.imdbId) ? `https://www.imdb.com/title/${filme.imdbId}/` : null,
  }));
}
export function buscarEpisodios(id, signal) {
  return obterJson(`https://api.tvmaze.com/shows/${encodeURIComponent(id)}/episodes?specials=1`, signal);
}
