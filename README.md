# Acompanhe

Site publicado em https://capte.netlify.app/, com deploy automático do repositório GitHub conectado ao Netlify. O desenvolvimento local usa XAMPP; os dados locais e os dados do site publicado são ambientes separados.

Catálogo de filmes e séries com HTML, CSS e JavaScript. O desenvolvimento no XAMPP dispensa build; a publicação no Netlify usa npm run build. A página inicial busca títulos em APIs e exibe episódios agrupados por temporada.

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

Pastas usam nomes sem acentos para facilitar caminhos e publicação. scripts/vendor fica reservado para bibliotecas de terceiros quando necessárias. As imagens e os estilos antigos foram preservados; a página estática de detalhes foi substituída pelo diálogo do catálogo. A inicial usa a estrutura acima.

## APIs

- [TVmaze](https://www.tvmaze.com/api): séries e episódios, sem chave, com CORS. Dados sob CC BY-SA; mantenha a atribuição e observe a licença ao reutilizar dados.
- [SampleAPIs](https://www.sampleapis.com/api-list/movies): catálogo de demonstração de filmes de ação e aventura, sem chave. Busca local nos títulos retornados, em idioma original; sem ano ou sinopse. Link para IMDb quando disponível.

Os nomes dos episódios seguem o idioma da fonte, frequentemente inglês. O catálogo de filmes é limitado à coleção de demonstração de ação e aventura, não é uma base completa ou garantia de lançamentos atuais. Erros e resultados vazios são tratados na interface; consultas com falha oferecem nova tentativa. As APIs de catálogo não exigem credenciais.

## Login com Google

Qualquer pessoa pode entrar com a própria conta Google após habilitar o aplicativo. O Client ID identifica o Acompanhe e é único para o aplicativo; os usuários não precisam criar credenciais. Não é necessário Client Secret neste fluxo.

1. No [Google Cloud / Google Auth Platform](https://console.cloud.google.com/auth/overview), crie ou selecione um projeto e configure Branding (nome e email de suporte) e Audience. Para permitir contas Google pessoais, escolha público externo. Durante testes, cadastre os usuários de teste; para disponibilizar ao público, publique o aplicativo e cumpra os requisitos exibidos pelo Google.
2. Em Clients, crie um cliente OAuth do tipo Aplicativo da Web. Em Origens JavaScript autorizadas, adicione `http://localhost` (sem `/Acompanhe`). Se usar outra porta, registre a origem com essa porta. Em produção, registre a origem HTTPS real. O fluxo usa popup e callback JavaScript, sem URI de redirecionamento.
3. Copie `api/auth/config.example.php` para `api/auth/config.local.php` e preencha `google_client_id` com o Client ID terminado em `.apps.googleusercontent.com`. Alternativamente, defina a variável `GOOGLE_CLIENT_ID` no ambiente do Apache. O arquivo local contém os valores reais e é ignorado pelo Git.
4. As dependências PHP são instaladas com `composer install` (ou `C:/xampp/php/php.exe tools/composer.phar install` se o Composer local estiver disponível). Reinicie o Apache se alterar variáveis de ambiente e abra `http://localhost/Acompanhe/`.

A interface fica em `src/components/autenticacao/google-login.js`, o acesso ao backend em `src/scripts/services/autenticacao-api.js`, e a sessão em `api/auth/session.php`. A biblioteca `firebase/php-jwt` valida a assinatura RS256 usando os certificados HTTPS do Google; o backend verifica público, emissor, validade e nonce. Certificados são armazenados na sessão respeitando o max-age informado pelo Google. O backend também verifica nonce e CSRF e renova o identificador da sessão ao entrar e sair. Tokens do Google não são guardados no navegador. A sessão usa cookie HttpOnly/SameSite e dura até duas horas ou até expirar a sessão do navegador. Use HTTPS em produção.

Sem Client ID configurado, o catálogo permanece disponível e a área da conta informa que o login estará disponível em breve. Nome e email aparecem após entrar; a lista e os episódios são vinculados ao identificador da conta Google. Sair encerra a sessão no Acompanhe, sem desconectar a conta Google do navegador.

Referências: [configuração do Google Identity Services](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid) e [validação no servidor](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).

### Verificação

`C:/xampp/php/php.exe tests/google-token.php` testa token válido e rejeição de audiência, emissor, expiração, nonce, sujeito, algoritmo e assinatura incorretos. No Windows/XAMPP, se a geração da chave de teste falhar, defina `OPENSSL_CONF=C:/xampp/apache/conf/openssl.cnf` no ambiente do terminal. O PHP precisa ter cURL, OpenSSL e um diretório de sessões gravável. As dependências estão fixadas em composer.lock.

## Publicar no Netlify — capte.netlify.app

O Netlify usa `netlify/functions/session.mjs` para autenticação. A API PHP continua sendo usada no XAMPP. O endereço da API é o mesmo: o netlify.toml redireciona a consulta PHP para a Function no deploy.

1. No Google Auth Platform, abra o cliente OAuth do Acompanhe e adicione `https://capte.netlify.app` às **Origens JavaScript autorizadas** (sem barra final ou caminho). Mantenha `http://localhost` se continuar usando XAMPP. Para liberar contas pessoais ao público, configure público externo e publique o aplicativo; no modo de testes, apenas usuários de teste autorizados podem entrar.
2. Nas variáveis de ambiente do site no Netlify, configure `SESSION_SECRET` com um valor privado próprio para a sessão do site, com pelo menos 32 bytes, no escopo Functions. Gere com `node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"`. A autenticação Google não exige Client Secret. Não coloque os valores reais no Git.
3. Configure `GOOGLE_CLIENT_ID` no escopo Functions com o Client ID do Acompanhe. Nenhum Client Secret Google é utilizado.
4. Publique pelo repositório conectado ao Netlify, usando o `netlify.toml`: build `npm run build`, diretório público `dist`, functions `netlify/functions`. Depois de mudar variáveis de ambiente, faça novo deploy. Um upload manual apenas de HTML/CSS não instala a Function.
5. Acesse o site e teste o botão de login com sua conta. Para testar localmente a versão Netlify, use Netlify Dev com as mesmas variáveis configuradas. Para conferir código: `npm ci`, `npm test`, `npm run build`.

O build copia apenas index.html e src/ para dist, evitando publicar arquivos PHP, configuração local, dependências e testes como conteúdo estático. A Function verifica o ID token pela biblioteca oficial google-auth-library e usa cookie de sessão assinado, HttpOnly, Secure e SameSite, com expiração de duas horas. O cookie contém os dados básicos do perfil, sem tokens Google. O logout substitui o cookie neste navegador; não existe revogação centralizada de cópias do cookie antes da expiração. A chave SESSION_SECRET deve ser estável entre deploys; trocá-la invalida todas as sessões existentes. Os perfis não têm uma tabela própria; o progresso de Minha Lista é armazenado separadamente por conta.

### Configuração do site e ambiente de desenvolvimento

Os valores reais permanecem em .env e api/auth/config.local.php no computador de desenvolvimento. A configuração antiga netlify/lib/lab-config.mjs também foi retirada do versionamento e não é mais importada pela Function. O .env.example documenta apenas os nomes das variáveis, sem valores.

Para o site publicado, cadastre GOOGLE_CLIENT_ID e SESSION_SECRET nas variáveis do Netlify, no escopo Functions, usando os valores reais do .env local. O arquivo .env não é enviado pelo Git e não configura automaticamente o ambiente remoto. Faça um novo deploy depois de configurar essas variáveis. A origem https://capte.netlify.app deve estar autorizada no Google Cloud.

As dependências, o build e os testes já incluídos permanecem no repositório. O deploy continua publicando apenas dist e a Function.

## Histórico do projeto

Veja a [revisão do histórico Git](docs/historico-git.md) para a avaliação de cada commit original e a sequência reorganizada.

## Minha Lista e progresso dos episódios

Entre com Google, abra um filme ou série no catálogo, escolha **Quero assistir**, **Assistindo** ou **Concluído** e clique em **Adicionar à minha lista**. A aba Minha Lista permite filtrar por situação e reabrir os detalhes. A situação pode ser alterada no seletor e o título pode ser removido junto com o progresso salvo.

Nas séries, cada episódio tem **Já vi** e **Estou neste**. Marcar um episódio inicia a série em Assistindo; o episódio atual é exibido no card e nos detalhes. Ao marcar o atual como visto, a sugestão passa ao próximo episódio regular ainda não visto e já disponível segundo a fonte. Desmarcar um episódio de uma série concluída volta a situação para Assistindo. A situação Concluído é escolhida manualmente, limpa a indicação do episódio atual e não marca episódios em lote. Especiais podem ser marcados individualmente. A lista aceita até 500 títulos por conta.

- **Netlify:** `netlify/functions/minha-lista.mjs` grava no Netlify Blobs, no store `acompanhe-listas`, separado por identificador de conta. Usa consistência forte e gravação condicional com reaplicação da operação quando outro acesso grava ao mesmo tempo. Dados sobrevivem a novos deploys e podem ser recuperados em outro dispositivo ao entrar com a mesma conta, dentro do mesmo site Netlify.
- **XAMPP:** `api/lista/index.php` grava em SQLite em `api/lista/dados/listas.sqlite`. PHP precisa de PDO SQLite e permissão de escrita nessa pasta. O arquivo de dados é ignorado pelo Git e protegido pelo `.htaccess` no Apache. O banco local e o armazenamento Netlify são ambientes separados; não existe migração automática entre eles.
- **Interface:** `src/components/minha-lista/` contém os controles; `src/scripts/services/minha-lista-api.js` consulta a API. O catálogo pode ser visto sem login; gravações exigem sessão e CSRF. Sair limpa a lista carregada na tela, sem apagar os dados salvos. Erros de gravação são exibidos sem confirmar sucesso.

O `netlify.toml` encaminha `/api/lista/index.php` para a Function, mantendo a mesma URL de API para os dois ambientes. A biblioteca `@netlify/blobs` é instalada pelo npm; em Functions publicadas, a conexão usa o contexto do próprio site. Não é necessário adicionar outra chave de armazenamento ao frontend. Faça novo deploy para disponibilizar esta função; os testes locais não substituem a conferência do armazenamento no site publicado.

Validação: `npm test` executa testes de login e lista, incluindo persistência entre sessões, isolamento entre contas, gravações concorrentes e falha de armazenamento. `C:/xampp/php/php.exe tests/minha-lista.php` verifica as regras equivalentes no PHP. A interface também foi conferida em sessão isolada de desenvolvimento, sem alterar contas Google reais.
