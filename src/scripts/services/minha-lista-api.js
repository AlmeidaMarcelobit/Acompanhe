import { consultarSessao } from './autenticacao-api.js';
const endpoint = new URL('../../../api/lista/index.php', import.meta.url);
const ouvintes = new Set();
let estado = { usuario: null, itens: [], carregando: false, salvando: false, pronto: false, erro: '' };
let geracao = 0;
let csrf = '';
export const chaveLista = item => `${item.tipo}:${item.id}`;
export const obterEstadoLista = () => estado;
export const encontrarNaLista = item => estado.itens.find(salvo => chaveLista(salvo) === chaveLista(item));
export function observarLista(callback) { ouvintes.add(callback); callback(estado); return () => ouvintes.delete(callback); }
function publicar(dados) { estado = { ...estado, ...dados }; ouvintes.forEach(callback => callback(estado)); }
async function requisitar(opcoes = {}) {
  const resposta = await fetch(endpoint, { ...opcoes, credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(20000) });
  const dados = await resposta.json();
  if (!resposta.ok) { const erro = new Error(resposta.status === 401 ? 'Sua sessão expirou. Recarregue a página e entre novamente.' : dados.error || 'Não foi possível acessar sua lista.'); erro.status = resposta.status; throw erro; }
  return dados;
}
export async function vincularLista(usuario) {
  const atual = ++geracao;
  csrf = '';
  publicar({ usuario, itens: [], carregando: Boolean(usuario), salvando: false, pronto: false, erro: '' });
  if (!usuario) return;
  try {
    const sessao = await consultarSessao();
    if (atual !== geracao) return;
    if (sessao.user?.id !== usuario.id) throw new Error('Sua sessão expirou. Entre novamente para acessar sua lista.');
    csrf = sessao.csrf;
    const dados = await requisitar();
    if (atual === geracao) publicar({ itens: dados.itens, pronto: true });
  } catch (erro) { if (atual === geracao) publicar({ erro: erro.message, ...(erro.status === 401 ? { itens: [], pronto: false } : {}) }); }
  finally { if (atual === geracao) publicar({ carregando: false }); }
}
export async function atualizarMinhaLista(operacao) {
  if (!estado.usuario || !estado.pronto || estado.salvando) return false;
  const atual = geracao;
  publicar({ salvando: true, erro: '' });
  try {
    const dados = await requisitar({ method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }, body: JSON.stringify(operacao) });
    if (atual !== geracao) return false;
    publicar({ itens: dados.itens });
    return true;
  } catch (erro) { if (atual === geracao) publicar({ erro: erro.message, ...(erro.status === 401 ? { itens: [], pronto: false } : {}) }); return false; }
  finally { if (atual === geracao) publicar({ salvando: false }); }
}
