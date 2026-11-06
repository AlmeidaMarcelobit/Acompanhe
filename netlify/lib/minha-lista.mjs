export const situacoes = { quero: 'Quero assistir', assistindo: 'Assistindo', concluido: 'Concluído' };
const valido = id => Number.isSafeInteger(id) && id > 0;
const texto = (value, max) => typeof value === 'string' ? value.slice(0, max) : '';
const url = value => typeof value === 'string' && /^https?:\/\//.test(value) ? value.slice(0, 2000) : '';
export function chaveItem(item) {
  if (!item || !['series', 'filmes'].includes(item.tipo) || !valido(item.id)) throw new Error('Título inválido.');
  return `${item.tipo}:${item.id}`;
}
function normalizar(item) {
  chaveItem(item);
  if (!texto(item.nome, 200).trim()) throw new Error('Nome do título não informado.');
  return { id: item.id, tipo: item.tipo, nome: texto(item.nome, 200), imagem: url(item.imagem), ano: texto(item.ano, 4), sinopse: texto(item.sinopse, 5000), url: url(item.url) };
}
function episodioValido(episodio) {
  if (!episodio || !valido(episodio.id) || !Number.isInteger(episodio.temporada) || episodio.temporada < 0 || (episodio.numero !== null && (!Number.isInteger(episodio.numero) || episodio.numero < 0))) throw new Error('Episódio inválido.');
  return { id: episodio.id, temporada: episodio.temporada, numero: episodio.numero, nome: texto(episodio.nome, 200) };
}
export function atualizarLista(documento, operacao) {
  if (!operacao || typeof operacao !== 'object') throw new Error('Operação inválida.');
  const itens = { ...(documento?.itens || {}) };
  const chave = operacao.item ? chaveItem(operacao.item) : operacao.chave;
  if (typeof chave !== 'string' || !/^(series|filmes):[1-9]\d*$/.test(chave)) throw new Error('Título inválido.');
  const existente = itens[chave];
  if (operacao.action === 'remover') { delete itens[chave]; return { itens }; }
  if (!['salvar', 'status', 'episodio', 'atual', 'temporada'].includes(operacao.action)) throw new Error('Operação inválida.');
  if (!existente && !operacao.item) throw new Error('Adicione o título à lista primeiro.');
  if (!existente && Object.keys(itens).length >= 500) throw new Error('Sua lista atingiu o limite de 500 títulos.');
  const item = { ...(existente || { ...normalizar(operacao.item), status: 'quero', vistos: [], atual: null }) };
  if (operacao.action === 'status' || operacao.action === 'salvar') {
    const status = operacao.status ?? item.status;
    if (typeof status !== 'string' || !Object.hasOwn(situacoes, status)) throw new Error('Situação inválida.');
    item.status = status;
    if (status === 'concluido') item.atual = null;
  } else {
    if (item.tipo !== 'series') throw new Error('Filmes não possuem episódios.');
    const vistos = new Set(item.vistos);
    if (operacao.action === 'atual') {
      const episodio = episodioValido(operacao.episodio);
      if (vistos.has(episodio.id)) throw new Error('Este episódio já está marcado como visto.');
      item.atual = episodio;
      item.status = 'assistindo';
    } else {
      if (typeof operacao.visto !== 'boolean') throw new Error('Marcação inválida.');
      let ids;
      if (operacao.action === 'temporada') {
        if (!Number.isInteger(operacao.temporada) || operacao.temporada < 0 || !Array.isArray(operacao.episodios) || !operacao.episodios.length || operacao.episodios.length > 2000 || operacao.episodios.some(id => !valido(id))) throw new Error('Temporada inválida.');
        ids = [...new Set(operacao.episodios)];
      } else ids = [episodioValido(operacao.episodio).id];
      for (const id of ids) { if (operacao.visto) vistos.add(id); else vistos.delete(id); }
      if (vistos.size > 20000) throw new Error('Limite de episódios atingido.');
      item.vistos = [...vistos];
      if (ids.includes(item.atual?.id) && operacao.visto) item.atual = null;
      if (item.status === 'quero' || (item.status === 'concluido' && !operacao.visto)) item.status = 'assistindo';
    }
  }
  item.updatedAt = new Date().toISOString();
  itens[chave] = item;
  return { itens };
}
