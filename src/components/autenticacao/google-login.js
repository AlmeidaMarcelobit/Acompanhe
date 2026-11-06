import { consultarSessao, alterarSessao } from '../../scripts/services/autenticacao-api.js';
let biblioteca;
function carregarGoogle() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (biblioteca) return biblioteca;
  biblioteca = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    const timeout = setTimeout(() => reject(new Error('O Google demorou para responder. Recarregue a página.')), 15000);
    script.onload = () => { clearTimeout(timeout); resolve(); };
    script.onerror = () => { clearTimeout(timeout); reject(new Error('Não foi possível carregar o Google. Recarregue a página.')); };
    document.head.append(script);
  });
  return biblioteca;
}
export async function iniciarAutenticacao() {
  const botao = document.querySelector('#google-login');
  const perfil = document.querySelector('#perfil');
  const mensagem = document.querySelector('#auth-status');
  const sair = document.querySelector('#sair');
  let sessao;
  let ocupado = false;
  function atualizar() {
    perfil.hidden = !sessao.user;
    botao.hidden = Boolean(sessao.user);
    if (sessao.user) {
      document.querySelector('#usuario-nome').textContent = sessao.user.name;
      document.querySelector('#usuario-email').textContent = sessao.user.email;
      mensagem.textContent = '';
    }
  }
  async function prepararBotao() {
    if (!sessao.configured) {
      mensagem.textContent = 'Login com Google em breve.';
      return;
    }
    await carregarGoogle();
    window.google.accounts.id.initialize({
      client_id: sessao.clientId,
      nonce: sessao.nonce,
      auto_select: false,
      callback: async ({ credential }) => {
        if (ocupado) return;
        ocupado = true;
        mensagem.textContent = 'Entrando…';
        try {
          sessao = await alterarSessao('login', sessao.csrf, credential);
          atualizar();
          window.dispatchEvent(new CustomEvent('autenticacao:alterada', { detail: sessao.user }));
        } catch (erro) { mensagem.textContent = erro.message; }
        finally { ocupado = false; }
      },
    });
    botao.replaceChildren();
    window.google.accounts.id.renderButton(botao, { type: 'standard', theme: 'outline', size: 'large', text: 'signin_with', locale: 'pt-BR' });
  }
  sair.addEventListener('click', async () => {
    if (ocupado) return;
    ocupado = true;
    sair.disabled = true;
    try {
      sessao = await alterarSessao('logout', sessao.csrf);
      window.google?.accounts.id.disableAutoSelect();
      atualizar();
      mensagem.textContent = 'Você saiu da sua conta.';
      window.dispatchEvent(new CustomEvent('autenticacao:alterada', { detail: null }));
      await prepararBotao();
    } catch (erro) { mensagem.textContent = erro.message; }
    finally { sair.disabled = false; ocupado = false; }
  });
  try {
    sessao = await consultarSessao();
    atualizar();
    if (!sessao.user) await prepararBotao();
  } catch { mensagem.textContent = 'Login indisponível. Recarregue a página para tentar novamente.'; }
}
