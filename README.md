# Acompanhe

Catálogo de filmes e séries com HTML, CSS e JavaScript, sem build. A página inicial busca títulos em APIs e exibe episódios agrupados por temporada.

## Como rodar

Inicie o Apache no XAMPP e abra http://localhost/Acompanhe/. É necessário acesso à internet. Use o servidor HTTP, pois o projeto utiliza módulos JavaScript.

Selecione Séries ou Filmes, digite um nome e pressione Buscar. Uma busca vazia carrega sugestões. Clique em um título para consultar sinopse e episódios. Não há reprodução de vídeos.

## Organização: recurso → função → específico

```text
index.html
src/
  assets/
    imagens/
    icones/
    favicons/
    global/
  scripts/
    services/catalogo-api.js
  components/
    catalogo/card.js
  styles/
    globais/base.css
    resets/reset.css
    variaveis/cores.css
  utils/texto.js
  pages/
    index/
      index.css
      index.js
```

Pastas usam nomes sem acentos para facilitar caminhos e publicação. scripts/vendor fica reservado para bibliotecas de terceiros quando necessárias. As imagens, estilos e página estática antigos foram preservados; a inicial usa a estrutura acima.

## APIs

- [TVmaze](https://www.tvmaze.com/api): séries e episódios, sem chave, com CORS. Dados sob CC BY-SA; mantenha a atribuição e observe a licença ao reutilizar dados.
- [SampleAPIs](https://www.sampleapis.com/api-list/movies): catálogo de demonstração de filmes de ação e aventura, sem chave. Busca local nos títulos retornados, em idioma original; sem ano ou sinopse. Link para IMDb quando disponível.

Os nomes dos episódios seguem o idioma da fonte, frequentemente inglês. O catálogo de filmes é limitado à coleção de demonstração de ação e aventura, não é uma base completa ou garantia de lançamentos atuais. Erros e resultados vazios são tratados na interface; consultas com falha oferecem nova tentativa. Nenhuma credencial é armazenada.

## Login com Google

Qualquer pessoa pode entrar com a própria conta Google após habilitar o aplicativo. O Client ID identifica o Acompanhe e é único para o aplicativo; os usuários não precisam criar credenciais. Não é necessário Client Secret neste fluxo.

1. No [Google Cloud / Google Auth Platform](https://console.cloud.google.com/auth/overview), crie ou selecione um projeto e configure Branding (nome e email de suporte) e Audience. Para permitir contas Google pessoais, escolha público externo. Durante testes, cadastre os usuários de teste; para disponibilizar ao público, publique o aplicativo e cumpra os requisitos exibidos pelo Google.
2. Em Clients, crie um cliente OAuth do tipo Aplicativo da Web. Em Origens JavaScript autorizadas, adicione `http://localhost` (sem `/Acompanhe`). Se usar outra porta, registre a origem com essa porta. Em produção, registre a origem HTTPS real. O fluxo usa popup e callback JavaScript, sem URI de redirecionamento.
3. Copie `api/auth/config.example.php` para `api/auth/config.local.php` e preencha `google_client_id` com o Client ID terminado em `.apps.googleusercontent.com`. Alternativamente, defina a variável `GOOGLE_CLIENT_ID` no ambiente do Apache. O arquivo local é ignorado pelo Git.
4. As dependências PHP são instaladas com `composer install` (ou `C:/xampp/php/php.exe tools/composer.phar install` se o Composer local estiver disponível). Reinicie o Apache se alterar variáveis de ambiente e abra `http://localhost/Acompanhe/`.

A interface fica em `src/components/autenticacao/google-login.js`, o acesso ao backend em `src/scripts/services/autenticacao-api.js`, e a sessão em `api/auth/session.php`. A biblioteca `firebase/php-jwt` valida a assinatura RS256 usando os certificados HTTPS do Google; o backend verifica público, emissor, validade e nonce. Certificados são armazenados na sessão respeitando o max-age informado pelo Google. O backend também verifica nonce e CSRF e renova o identificador da sessão ao entrar e sair. Tokens do Google não são guardados no navegador. A sessão usa cookie HttpOnly/SameSite e dura até duas horas ou até expirar a sessão do navegador. Use HTTPS em produção.

Sem Client ID configurado, o catálogo permanece disponível e a área da conta informa que o login estará disponível em breve. Nome e email aparecem após entrar; não há banco de usuários ou sincronização de listas nesta etapa. Sair encerra a sessão no Acompanhe, sem desconectar a conta Google do navegador.

Referências: [configuração do Google Identity Services](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid) e [validação no servidor](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).

### Verificação

`C:/xampp/php/php.exe tests/google-token.php` testa token válido e rejeição de audiência, emissor, expiração, nonce, sujeito, algoritmo e assinatura incorretos. No Windows/XAMPP, se a geração da chave de teste falhar, defina `OPENSSL_CONF=C:/xampp/apache/conf/openssl.cnf` no ambiente do terminal. O PHP precisa ter cURL, OpenSSL e um diretório de sessões gravável. As dependências estão fixadas em composer.lock.
