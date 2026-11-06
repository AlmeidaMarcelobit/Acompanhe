import { createHash, timingSafeEqual } from 'node:crypto';
import { getStore } from '@netlify/blobs';
import { obterSessao } from './session.mjs';
import { atualizarLista } from '../lib/minha-lista.mjs';
const responder = (status, dados) => Response.json(dados, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
function mesmo(a, b) { const x = Buffer.from(a || ''), y = Buffer.from(b || ''); return x.length === y.length && timingSafeEqual(x, y); }
export function criarHandlerLista({ secret, armazenamento = () => getStore({ name: 'acompanhe-listas', consistency: 'strong' }) } = {}) {
  return async request => {
    if (!secret || Buffer.byteLength(secret) < 32) return responder(503, { error: 'Serviço de lista ainda não configurado.' });
    const sessao = obterSessao(request, secret);
    if (!sessao?.user?.id) return responder(401, { error: 'Entre com Google para acessar sua lista.' });
    if (!['GET', 'POST'].includes(request.method)) return responder(405, { error: 'Método não permitido.' });
    if (request.method === 'POST' && (request.headers.get('origin') !== new URL(request.url).origin || !mesmo(request.headers.get('x-csrf-token'), sessao.csrf))) return responder(403, { error: 'Sessão inválida. Recarregue a página.' });
    let operacao;
    if (request.method === 'POST') {
      if (Number(request.headers.get('content-length')) > 256000) return responder(413, { error: 'Requisição muito grande.' });
      try { const text = await request.text(); if (Buffer.byteLength(text) > 256000) return responder(413, { error: 'Requisição muito grande.' }); operacao = JSON.parse(text); }
      catch { return responder(400, { error: 'Requisição inválida.' }); }
    }
    try {
      const store = armazenamento();
      const chave = createHash('sha256').update(sessao.user.id).digest('hex');
      for (let tentativa = 0; tentativa < 4; tentativa++) {
        const entrada = await store.getWithMetadata(chave, { type: 'json' });
        const documento = entrada?.data || { itens: {} };
        if (request.method === 'GET') return responder(200, { itens: Object.values(documento.itens) });
        let novo;
        try { novo = atualizarLista(documento, operacao); }
        catch (erro) { return responder(400, { error: erro.message }); }
        const resultado = await store.setJSON(chave, novo, entrada ? { onlyIfMatch: entrada.etag } : { onlyIfNew: true });
        if (resultado.modified) return responder(200, { itens: Object.values(novo.itens) });
      }
      return responder(409, { error: 'Sua lista foi alterada em outro acesso. Tente novamente.' });
    } catch { return responder(503, { error: 'Não foi possível acessar sua lista. Tente novamente.' }); }
  };
}
export default request => criarHandlerLista({ secret: process.env.SESSION_SECRET })(request);
