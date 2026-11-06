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

