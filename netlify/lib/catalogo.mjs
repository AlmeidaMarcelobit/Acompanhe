export function prepararConsulta(parametros) {
  const acao = parametros.get('acao') || 'buscar';
  const tipo = parametros.get('tipo');
  if (acao === 'buscar') {
    if (!['series', 'filmes'].includes(tipo)) throw new Error('Tipo de catálogo inválido.');
    const consulta = (parametros.get('q') || '').trim();
    if (consulta.length > 150) throw new Error('Busca muito longa.');
    const recurso = tipo === 'series' ? 'tv' : 'movie';
    const query = new URLSearchParams({ language: 'pt-BR', page: '1' });
    if (tipo === 'filmes') query.set('region', 'BR');
    if (consulta) { query.set('query', consulta); query.set('include_adult', 'false'); }
    return { path: consulta ? `/search/${recurso}` : `/${recurso}/popular`, query };
  }
  const id = parametros.get('id') || '';
  if (!/^[1-9]\d{0,9}$/.test(id)) throw new Error('Série inválida.');
  if (acao === 'temporadas') return { path: `/tv/${id}`, query: new URLSearchParams({ language: 'pt-BR' }) };
  const temporada = parametros.get('temporada') || '';
  if (acao !== 'episodios' || !/^\d{1,4}$/.test(temporada)) throw new Error('Temporada inválida.');
  return { path: `/tv/${id}/season/${Number(temporada)}`, query: new URLSearchParams({ language: 'pt-BR' }) };
}
