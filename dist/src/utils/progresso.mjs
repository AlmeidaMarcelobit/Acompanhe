export function episodiosDisponiveis(episodios, hoje = new Date().toISOString().slice(0, 10)) {
  return episodios.filter(ep => !ep.airdate || ep.airdate <= hoje);
}
