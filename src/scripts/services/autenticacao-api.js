const endpoint = new URL('../../../api/auth/session.php', import.meta.url);
export async function consultarSessao() {
  return requisitar();
}
export async function alterarSessao(action, csrf, credential) {
  return requisitar({ method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }, body: JSON.stringify({ action, credential }) });
}
async function requisitar(opcoes = {}) {
  const resposta = await fetch(endpoint, { ...opcoes, credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(20000) });
  const dados = await resposta.json();
  if (!resposta.ok) throw new Error(dados.error || 'Não foi possível consultar o login.');
  return dados;
}
