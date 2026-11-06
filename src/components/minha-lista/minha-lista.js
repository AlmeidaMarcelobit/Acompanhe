import { elemento } from '../../utils/texto.js';
import { criarCard } from '../catalogo/card.js';
import { observarLista, vincularLista, atualizarMinhaLista, chaveLista, encontrarNaLista } from '../../scripts/services/minha-lista-api.js';
export const rotulos = { quero: 'Quero assistir', assistindo: 'Assistindo', concluido: 'Concluído' };
export function nomeEpisodio(ep) { return `T${ep.temporada} · ${ep.numero == null ? 'Especial' : `E${String(ep.numero).padStart(2, '0')}`} — ${ep.nome}`; }
export function iniciarMinhaLista(abrir) {
  const grid = document.querySelector('#itens-lista');
  const mensagem = document.querySelector('#lista-status');
  const vazio = document.querySelector('#lista-vazia');
  const tentar = document.querySelector('#lista-tentar');
  const filtros = [...document.querySelectorAll('[data-filtro-lista]')];
  let filtro = 'todos';
  let ultimo;
  function render(estado) {
    ultimo = estado;
    grid.setAttribute('aria-busy', String(estado.carregando));
    mensagem.textContent = estado.erro || (estado.carregando ? 'Carregando sua lista…' : estado.usuario ? `${estado.itens.length} título(s) na sua lista. Progresso salvo na sua conta.` : 'Entre com Google para criar sua lista e acompanhar seus episódios.');
    tentar.hidden = !estado.erro || !estado.usuario;
    tentar.disabled = estado.carregando || estado.salvando;
    filtros.forEach(botao => {
      const valor = botao.dataset.filtroLista;
      const quantidade = estado.itens.filter(item => valor === 'todos' || item.status === valor).length;
      botao.textContent = `${valor === 'todos' ? 'Todos' : rotulos[valor]} (${quantidade})`;
      botao.setAttribute('aria-pressed', String(valor === filtro));
    });
    const itens = estado.itens.filter(item => filtro === 'todos' || item.status === filtro).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    grid.replaceChildren(...itens.map(item => {
      const card = criarCard(item, abrir);
      card.append(elemento('span', rotulos[item.status], `situacao situacao-${item.status}`));
      const progresso = item.tipo === 'series' ? item.atual ? `Você está em ${nomeEpisodio(item.atual)}` : `${item.vistos.length} episódio(s) visto(s)` : item.status === 'concluido' ? 'Filme já assistido' : 'Abra para atualizar sua lista';
      card.append(elemento('span', progresso, 'resumo-progresso'));
      return card;
    }));
    vazio.hidden = !estado.usuario || estado.carregando || Boolean(estado.erro) || itens.length > 0;
    vazio.querySelector('h3').textContent = estado.itens.length ? 'Nenhum título neste filtro.' : 'Sua próxima história começa no catálogo.';
  }
  filtros.forEach(botao => botao.addEventListener('click', () => { filtro = botao.dataset.filtroLista; render(ultimo); }));
  tentar.addEventListener('click', () => vincularLista(ultimo.usuario));
  return observarLista(render);
}
export function criarEditorLista(item) {
  const area = elemento('section', undefined, 'editor-lista');
  area.setAttribute('aria-label', 'Acompanhar este título');
  const titulo = elemento('h3', 'Minha Lista');
  const linha = elemento('div', undefined, 'editor-acoes');
  const label = elemento('label', 'Situação');
  const select = elemento('select');
  select.setAttribute('aria-label', `Situação de ${item.nome}`);
  Object.entries(rotulos).forEach(([valor, texto]) => { const option = elemento('option', texto); option.value = valor; select.append(option); });
  label.append(select);
  const salvar = elemento('button', 'Adicionar à minha lista');
  salvar.type = 'button';
  const remover = elemento('button', 'Remover');
  remover.type = 'button'; remover.className = 'remover-lista';
  const mensagem = elemento('p', '', 'mensagem-lista');
  mensagem.setAttribute('role', 'status');
  const resumo = elemento('p', '', 'resumo-atual');
  linha.append(label, salvar, remover);
  area.append(titulo, linha, resumo, mensagem);
  let existe = false;
  salvar.addEventListener('click', () => atualizarMinhaLista({ action: 'salvar', item, status: select.value }));
  select.addEventListener('change', () => { if (existe) atualizarMinhaLista({ action: 'status', chave: chaveLista(item), status: select.value }); });
  remover.addEventListener('click', () => atualizarMinhaLista({ action: 'remover', chave: chaveLista(item) }));
  const parar = observarLista(estado => {
    const salvo = encontrarNaLista(item);
    existe = Boolean(salvo);
    salvar.hidden = existe;
    remover.hidden = !existe;
    if (salvo) select.value = salvo.status;
    select.disabled = salvar.disabled = remover.disabled = !estado.usuario || !estado.pronto || estado.salvando;
    mensagem.textContent = estado.erro || (estado.salvando ? 'Salvando progresso…' : !estado.usuario ? 'Entre com Google para salvar este título e marcar episódios.' : estado.carregando ? 'Carregando sua lista…' : salvo ? 'Salvo na sua lista.' : 'Escolha a situação e adicione à sua lista.');
    resumo.textContent = salvo?.tipo === 'series' ? `${salvo.vistos.length} episódio(s) visto(s)${salvo.atual ? ` · Estou em ${nomeEpisodio(salvo.atual)}` : ''}` : '';
  });
  return { area, parar };
}
export function criarControleEpisodio(item, episodio) {
  const ep = { id: episodio.id, temporada: episodio.season ?? 0, numero: episodio.number ?? null, nome: episodio.name || 'Título não informado' };
  const controles = elemento('div', undefined, 'episodio-acoes');
  const label = elemento('label', undefined, 'episodio-visto');
  const check = elemento('input'); check.type = 'checkbox'; check.setAttribute('aria-label', `Já vi ${nomeEpisodio(ep)}`);
  label.append(check, elemento('span', 'Já vi'));
  const atual = elemento('button', 'Estou neste'); atual.type = 'button'; atual.setAttribute('aria-label', `Estou em ${nomeEpisodio(ep)}`);
  controles.append(label, atual);
  check.addEventListener('change', () => atualizarMinhaLista({ action: 'episodio', item, episodio: ep, visto: check.checked }));
  atual.addEventListener('click', () => atualizarMinhaLista({ action: 'atual', item, episodio: ep }));
  const parar = observarLista(estado => {
    const salvo = encontrarNaLista(item);
    check.checked = Boolean(salvo?.vistos.includes(ep.id));
    check.disabled = atual.disabled = !estado.usuario || !estado.pronto || estado.salvando;
    atual.disabled ||= check.checked;
    const selecionado = salvo?.atual?.id === ep.id;
    atual.setAttribute('aria-pressed', String(selecionado));
    atual.textContent = selecionado ? 'Episódio atual' : 'Estou neste';
    label.classList.toggle('visto', check.checked);
  });
  return { controles, parar };
}
