import { elemento } from '../../utils/texto.js';
export function criarCard(item, abrir) {
  const card = elemento('button', undefined, 'card');
  card.type = 'button';
  card.setAttribute('aria-label', `Ver detalhes de ${item.nome}`);
  const semCapa = () => elemento('span', 'Sem capa', 'sem-capa');
  if (item.imagem) {
    const imagem = elemento('img');
    imagem.src = item.imagem;
    imagem.alt = '';
    imagem.loading = 'lazy';
    imagem.addEventListener('error', () => imagem.replaceWith(semCapa()), { once: true });
    card.append(imagem);
  } else card.append(semCapa());
  card.append(elemento('h3', item.nome), elemento('p', `${item.ano || 'Ano não informado'} · ${item.tipo === 'series' ? 'Série' : 'Filme'}`));
  card.addEventListener('click', () => abrir(item));
  return card;
}
