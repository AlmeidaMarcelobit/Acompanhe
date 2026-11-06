# Revisão e reorganização do histórico Git

Revisão realizada em 6 de novembro de 2026. Foram avaliados os 26 commits de main e as alterações locais da área de login. A reorganização preserva as funcionalidades atuais, as dependências e os arquivos do projeto.

## Linha do tempo reorganizada

1. `9b25d31` — Estrutura inicial (commit original preservado)
2. `42a5ac4` — feat(catalogo): cria catalogo estatico e organiza os estilos
3. `78e6392` — feat(catalogo): integra filmes, series e episodios por temporada
4. `95f3c5a` — feat(auth): adiciona login Google com sessao PHP e testes
5. `339a252` — feat(netlify): publica API de login com configuracao por ambiente
6. `0cf6599` — style(auth): integra login e perfil ao tema do Acompanhe
7. `b9c4868` — chore(lab): inclui dependencias e build para estudo em sala
8. Documentação desta revisão e avaliação de cada commit original.

## Avaliação por commit original

| Commit anterior | Conteúdo | Decisão | Etapa nova | Avaliação |
|---|---|---|---|---|
| 9b25d31 | HTML, README vazio e CSS inicial | Manter | 1 | Marco inicial do projeto; protótipo sem funcionalidades. |
| c2b0c3d | Navegação, primeira capa e layout | Agrupar | 2 | Base visual; trazia rodapé duplicado e conteúdo provisório. |
| 94993a1 | Formatação e layout flexível | Agrupar | 2 | Útil, mas dependente da mesma interface estática. |
| b53dc72 | Capa Dark Wolf e estilos de figuras | Agrupar | 2 | A imagem referenciada só foi adicionada depois, em f050865. |
| f050865 | Imagem Dark Wolf | Reordenar e agrupar | 2 | Precisa chegar com o HTML que a referencia. |
| 0e51361 | Novas séries, capas e largura dos cards | Agrupar | 2 | Completa a mesma funcionalidade de catálogo estático. |
| e5cbb34 | Link na primeira capa e ajustes de layout | Agrupar | 2 | O seletor img.capa deixava as demais capas sem a mesma regra. |
| 37ca87d | Link de detalhes e página vazia | Agrupar | 2 | A página só foi preenchida depois; não era uma entrega completa. |
| 90c643c | Links envolvendo todas as capas | Agrupar | 2 | A maioria ainda tinha destino vazio; trata-se de protótipo. |
| ecd0b8f | Formatação e altura de legenda | Agrupar | 2 | Ajuste pequeno da mesma entrega visual. |
| 52da399 | Página de detalhes e estilo global | Agrupar | 2 | A página continha imagem sem src; referência corrigida no snapshot histórico. |
| 9bcedca | Links para reset e CSS por página | Reordenar e agrupar | 2 | Referenciava arquivos que só surgiram em 65add33. |
| 65add33 | Move CSS para pages e separa reset | Agrupar | 2 | Deve acompanhar a troca dos links no HTML. |
| 8a23956 | Remove regras de rodapé | Agrupar | 2 | Mudança fazia sentido junto da centralização dos estilos globais. |
| 4418993 | Remove rodapé duplicado e estiliza rodapé global | Agrupar | 2 | Correção válida, incorporada ao catálogo estático. |
| 9324ac1 | Remove página de detalhes | Mover para a substituição do catálogo | 3 | Isoladamente deixava o link da inicial apontando para um arquivo removido. |
| ff7db24 | Novo HTML dinâmico e referências a módulos | Agrupar | 3 | Página dependia de CSS e JavaScript adicionados em commits posteriores. |
| 1129f78 | Novo CSS responsivo | Agrupar | 3 | Faz parte da substituição completa do catálogo. |
| e892047 | Serviços de APIs e estilos globais | Agrupar | 3 | Misturava estilos e serviços necessários à mesma entrega de interface. |
| 2312fd9 | Diretórios de assets vazios | Agrupar | 3 | Estrutura auxiliar, sem necessidade de commit funcional independente. |
| 43018bb | Componente de card | Agrupar | 3 | Importava utils/texto.js antes de esse arquivo existir em fdfb608. |
| fdfb608 | Página, episódios, busca e utilitários | Agrupar | 3 | Conclui a funcionalidade iniciada por ff7db24. |
| f238a4b | Login Google, PHP e dependências Composer | Manter e completar | 4 | Entrega coerente; testes e exclusões de credenciais foram antecipados para este ponto. |
| 12f0a0a | README completo | Distribuir | 3, 4 e 5 | Cada funcionalidade agora recebe suas próprias instruções quando é introduzida. |
| ba97ccd | Netlify Function, npm e build | Corrigir e completar | 5 | Continha Client ID real e npm test sem seu arquivo. A nova versão usa ambiente e inclui testes. |
| 6fbe59d | Testes, credenciais por ambiente, dependências e build | Separar | 4, 5 e 7 | Misturava validação de login com quase 110 mil linhas de dependências. Dependências e build preservados em commit próprio. |
| Alterações locais | Tema escuro do login, perfil e CSS do componente | Commitar separadamente | 6 | Trabalho anterior preservado, sem depender do stash nem apagar arquivos locais. |

## Critérios e correções

- HTML, CSS, imagens e imports locais são introduzidos juntos quando um depende do outro.
- A remoção da página antiga acompanha a troca para o catálogo dinâmico, sem deixar link quebrado entre commits.
- As capas do protótipo estático recebem a mesma regra de tamanho; a página histórica de detalhes recebe uma imagem válida e reset. Essas correções não alteram a aplicação atual.
- O Client ID real não é embutido em nenhum dos commits reconstruídos. Os valores reais continuam nos arquivos locais ignorados e nas variáveis do Netlify.
- Dependências e artefatos de build permanecem versionados por decisão do responsável pelo projeto, em uma entrega isolada para facilitar revisão.
- Os testes PHP entram com o backend PHP; os testes da Function entram com o comando npm test. Os testes de token usam dados de teste e não substituem as credenciais reais do aplicativo.
- O commit inicial permanece com o hash original. Mensagens intermediárias foram normalizadas por responsabilidade.

## Publicação do histórico

A reconstrução modifica hashes que já existiam em origin/main. Nenhum push foi feito nesta tarefa. A atualização remota precisa de force-with-lease, usando o hash remoto conferido no momento da publicação. Não use um force simples.

O histórico anterior foi salvo em um bundle local externo ao repositório, junto com um patch e cópias das alterações de trabalho. O backup não precisa ser publicado. A pasta .idea e as credenciais locais foram preservadas sem entrar nos novos commits.

## Contexto de publicação

O Acompanhe é um site real, publicado no Netlify com deploy automático pelo GitHub. Referências a laboratório nos nomes de commits antigos acima registram a terminologia usada naquele momento; não descrevem a finalidade atual do site. XAMPP e sessões isoladas são usados apenas para desenvolvimento e testes.
