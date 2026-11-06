import { prepararConsulta } from '../lib/catalogo.mjs';
export function criarHandlerCatalogo({ token, fetcher = fetch } = {}) {
  return async request => {
    const responder = (status, dados) => Response.json(dados, { status, headers: { 'Cache-Control': status === 200 ? 'public, max-age=300, s-maxage=600' : 'no-store', 'X-Content-Type-Options': 'nosniff' } });
    if (request.method !== 'GET') return responder(405, { error: 'Método não permitido.' });
    let consulta;
    try { consulta = prepararConsulta(new URL(request.url).searchParams); }
    catch (erro) { return responder(400, { error: erro.message }); }
    if (!token?.trim()) return responder(503, { code: 'TMDB_NOT_CONFIGURED', error: 'Catálogo em português ainda não configurado.' });
    try {
      const resposta = await fetcher(`https://api.themoviedb.org/3${consulta.path}?${consulta.query}`, { headers: { Authorization: `Bearer ${token.trim()}`, Accept: 'application/json' }, signal: AbortSignal.timeout(12000) });
      if (!resposta.ok) return responder(resposta.status === 404 ? 404 : 503, { error: resposta.status === 404 ? 'Título não encontrado.' : 'Não foi possível consultar o catálogo. Tente novamente.' });
      return responder(200, await resposta.json());
    } catch { return responder(503, { error: 'Não foi possível consultar o catálogo. Tente novamente.' }); }
  };
}
export default request => criarHandlerCatalogo({ token: process.env.TMDB_READ_ACCESS_TOKEN })(request);
