import { buscarSeries, buscarFilmes, buscarEpisodios } from '../../scripts/services/catalogo-api.js';
import { criarCard } from '../../components/catalogo/card.js';
import { elemento, textoSemHtml } from '../../utils/texto.js';
const catalogo = document.querySelector('#catalogo');
const status = document.querySelector('#status');
const termo = document.querySelector('#termo');
const tentar = document.querySelector('#tentar');
const dialog = document.querySelector('#detalhes');
const conteudo = document.querySelector('#conteudo-detalhes');
let tipo = 'series';
let consulta;
let detalhes;
async function carregar() {
  consulta?.abort();
  const atual = new AbortController();
  consulta = atual;
  const timeout = setTimeout(() => atual.abort(), 20000);
  catalogo.replaceChildren();
  catalogo.setAttribute('aria-busy', 'true');
  tentar.hidden = true;
  status.textContent = 'Carregando catálogo…';
  document.querySelector('#titulo-catalogo').textContent = `${tipo === 'series' ? 'Séries' : 'Filmes'} ${termo.value.trim() ? 'encontrados' : 'para descobrir'}`;
  try {
    const itens = await (tipo === 'series' ? buscarSeries : buscarFilmes)(termo.value.trim(), atual.signal);
    if (consulta !== atual) return;
    catalogo.replaceChildren(...itens.map(item => criarCard(item, abrirDetalhes)));
    status.textContent = itens.length ? `${itens.length} título(s). Selecione um para ver detalhes${tipo === 'series' ? ' e episódios' : ' · Catálogo de demonstração: ação e aventura (títulos originais)'}.` : 'Nenhum título encontrado. Tente outro nome, inclusive no idioma original.';
  } catch {
    if (consulta !== atual) return;
    status.textContent = 'Não foi possível carregar o catálogo. Verifique a conexão e tente novamente.';
    tentar.hidden = false;
  } finally {
    clearTimeout(timeout);
    if (consulta === atual) catalogo.setAttribute('aria-busy', 'false');
  }
}
async function abrirDetalhes(item) {
  detalhes?.abort();
  const atual = new AbortController();
  detalhes = atual;
  document.querySelector('#titulo-detalhes').textContent = item.nome;
  conteudo.replaceChildren(elemento('p', textoSemHtml(item.sinopse) || 'Sinopse não disponível.', 'sinopse'));
  if (item.url && /^https?:\/\//.test(item.url)) {
    const fonte = elemento('a', item.tipo === 'series' ? 'Ver no TVmaze' : 'Ver no IMDb');
    fonte.href = item.url;
    fonte.target = '_blank';
    fonte.rel = 'noopener noreferrer';
    conteudo.append(fonte);
  }
  if (!dialog.open) dialog.showModal();
  if (item.tipo === 'filmes') {
    conteudo.append(elemento('p', 'Filmes não possuem lista de episódios.', 'sinopse'));
    return;
  }
  const mensagem = elemento('p', 'Carregando episódios…', 'sinopse');
  mensagem.setAttribute('role', 'status');
  conteudo.append(mensagem);
  const timeout = setTimeout(() => atual.abort(), 20000);
  try {
    const episodios = await buscarEpisodios(item.id, atual.signal);
    if (detalhes !== atual || !dialog.open) return;
    mensagem.textContent = episodios.length ? `${episodios.length} episódios · Títulos no idioma informado pela fonte.` : 'Nenhum episódio cadastrado para esta série.';
    const temporadas = new Map();
    for (const episodio of episodios) {
      const temporada = episodio.season ?? 0;
      if (!temporadas.has(temporada)) temporadas.set(temporada, []);
      temporadas.get(temporada).push(episodio);
    }
    for (const [numero, lista] of [...temporadas].sort(([a], [b]) => a - b)) {
      const grupo = elemento('details');
      grupo.open = temporadas.size === 1;
      grupo.append(elemento('summary', `${numero === 0 ? 'Especiais' : `Temporada ${numero}`} · ${lista.length} episódios`));
      const ul = elemento('ul', undefined, 'episodios');
      for (const episodio of lista) {
        const li = elemento('li', `${episodio.number == null ? 'Especial' : `E${String(episodio.number).padStart(2, '0')}`} — ${episodio.name || 'Título não informado'}`);
        li.append(elemento('small', `${episodio.airdate ? `Exibição: ${episodio.airdate.split('-').reverse().join('/')}` : 'Data não informada'}${episodio.runtime ? ` · ${episodio.runtime} min` : ''}`));
        ul.append(li);
      }
      grupo.append(ul);
      conteudo.append(grupo);
    }
  } catch {
    if (detalhes !== atual || !dialog.open) return;
    mensagem.textContent = 'Não foi possível carregar os episódios.';
    const repetir = elemento('button', 'Tentar novamente');
    repetir.type = 'button';
    repetir.addEventListener('click', () => abrirDetalhes(item));
    conteudo.append(repetir);
  } finally { clearTimeout(timeout); }
}
document.querySelector('#busca').addEventListener('submit', evento => { evento.preventDefault(); carregar(); });
tentar.addEventListener('click', carregar);
document.querySelectorAll('[data-tipo]').forEach(botao => botao.addEventListener('click', () => {
  tipo = botao.dataset.tipo;
  document.querySelectorAll('[data-tipo]').forEach(outro => outro.setAttribute('aria-pressed', String(outro === botao)));
  termo.placeholder = tipo === 'series' ? 'Buscar uma série…' : 'Buscar um filme…';
  carregar();
}));
document.querySelector('#fechar').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => { detalhes?.abort(); detalhes = null; });
carregar();
