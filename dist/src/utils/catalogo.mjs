export const chaveCatalogo = item => `${item.fonte === 'tmdb' ? 'tmdb:' : ''}${item.tipo}:${item.id}`;
export function normalizarTituloTmdb(item, tipo) {
  return { id: item.id, fonte: 'tmdb', tipo, nome: tipo === 'series' ? item.name || item.original_name : item.title || item.original_title, imagem: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null, ano: (item.release_date || item.first_air_date)?.slice(0, 4), sinopse: item.overview || '', url: `https://www.themoviedb.org/${tipo === 'series' ? 'tv' : 'movie'}/${item.id}?language=pt-BR` };
}
export function normalizarEpisodioTmdb(ep) {
  return { id: ep.id, season: ep.season_number, number: ep.episode_number, name: ep.name || `Episódio ${ep.episode_number}`, airdate: ep.air_date || null, runtime: ep.runtime || null };
}
