<?php
require __DIR__ . '/../api/lista/operacoes.php';
function conferir(bool $condicao, string $mensagem): void { if (!$condicao) throw new RuntimeException($mensagem); }
$serie = ['id' => 10, 'tipo' => 'series', 'nome' => 'Série de teste'];
$filme = ['id' => 10, 'tipo' => 'filmes', 'nome' => 'Filme de teste'];
$ep = ['id' => 101, 'temporada' => 1, 'numero' => 1, 'nome' => 'Primeiro'];
$doc = atualizarLista([], ['action' => 'salvar', 'item' => $serie, 'status' => 'quero']);
$doc = atualizarLista($doc, ['action' => 'salvar', 'item' => $filme, 'status' => 'concluido', 'episodios' => [101, 102, 201, 202]]);
conferir(count($doc['itens']) === 2, 'Tipos com o mesmo ID foram confundidos.');
$doc = atualizarLista($doc, ['action' => 'atual', 'item' => $serie, 'episodio' => $ep]);
conferir($doc['itens']['series:10']['atual']['id'] === 101, 'Episódio atual incorreto.');
foreach ([true, true] as $visto) $doc = atualizarLista($doc, ['action' => 'episodio', 'item' => $serie, 'episodio' => $ep, 'visto' => $visto]);
conferir($doc['itens']['series:10']['vistos'] === [101], 'Episódios duplicados.');
conferir($doc['itens']['series:10']['atual'] === null, 'Episódio visto ainda está como atual.');
$doc = atualizarLista($doc, ['action' => 'status', 'chave' => 'series:10', 'status' => 'concluido', 'episodios' => [101, 102, 201, 202]]);
$doc = atualizarLista($doc, ['action' => 'episodio', 'item' => $serie, 'episodio' => $ep, 'visto' => false]);
conferir($doc['itens']['series:10']['status'] === 'assistindo', 'Desmarcar episódio não retomou a série.');
$doc = atualizarLista($doc, ['action' => 'remover', 'chave' => 'series:10']);
conferir(count($doc['itens']) === 1 && isset($doc['itens']['filmes:10']), 'Remoção afetou outro título.');
$rejeitou = false;
try { atualizarLista($doc, ['action' => 'episodio', 'item' => $filme, 'episodio' => $ep, 'visto' => true]); } catch (InvalidArgumentException $e) { $rejeitou = true; }
conferir($rejeitou, 'Filme aceitou episódio.');
echo "OK: situações, IDs por tipo, vistos, episódio atual, remoção e validação PHP.\n";

$doc = atualizarLista([], ['action' => 'episodio', 'item' => $serie, 'episodio' => array_replace($ep, ['id' => 201, 'temporada' => 2]), 'visto' => true]);
$doc = atualizarLista($doc, ['action' => 'atual', 'item' => $serie, 'episodio' => array_replace($ep, ['id' => 102])]);
$op = ['action' => 'temporada', 'item' => $serie, 'temporada' => 1, 'episodios' => [101, 102, 103, 103], 'visto' => true];
$doc = atualizarLista($doc, $op);
$doc = atualizarLista($doc, $op);
$vistos = $doc['itens']['series:10']['vistos']; sort($vistos);
conferir($vistos === [101, 102, 103, 201], 'Lote perdeu outra temporada ou duplicou episódios.');
conferir($doc['itens']['series:10']['atual'] === null, 'Lote não limpou episódio atual já visto.');
$doc = atualizarLista($doc, ['action' => 'episodio', 'item' => $serie, 'episodio' => array_replace($ep, ['id' => 102]), 'visto' => false]);
conferir(!in_array(102, $doc['itens']['series:10']['vistos'], true), 'Marcação individual deixou de funcionar após lote.');
$doc = atualizarLista($doc, array_replace($op, ['visto' => false]));
conferir($doc['itens']['series:10']['vistos'] === [201], 'Desmarcar temporada afetou outra.');
foreach ([[], [0], ['101'], array_fill(0, 2001, 101)] as $ids) {
    $rejeitou = false;
    try { atualizarLista($doc, array_replace($op, ['episodios' => $ids])); } catch (InvalidArgumentException $e) { $rejeitou = true; }
    conferir($rejeitou, 'Temporada inválida aceita.');
}
echo "OK: temporadas inteiras, idempotência, ajuste individual e validação de lotes PHP.\n";

$antiga = ['id' => 100, 'tipo' => 'series', 'nome' => 'Série antiga'];
$nova = ['id' => 100, 'tipo' => 'series', 'nome' => 'Série em português', 'fonte' => 'tmdb'];
$doc = atualizarLista([], ['action' => 'episodio', 'item' => $antiga, 'episodio' => $ep, 'visto' => true]);
$doc = atualizarLista($doc, ['action' => 'salvar', 'item' => $nova]);
conferir($doc['itens']['series:100']['vistos'] === [101], 'A integração TMDB sobrescreveu o legado.');
conferir($doc['itens']['tmdb:series:100']['fonte'] === 'tmdb', 'Fonte TMDB não persistida.');
$doc = atualizarLista($doc, ['action' => 'status', 'chave' => 'tmdb:series:100', 'status' => 'concluido', 'episodios' => [101, 102, 201, 202]]);
conferir($doc['itens']['series:100']['status'] === 'assistindo', 'Status TMDB afetou título legado.');
$doc = atualizarLista($doc, ['action' => 'remover', 'chave' => 'tmdb:series:100']);
conferir(isset($doc['itens']['series:100']), 'Remoção TMDB afetou legado.');
echo "OK: preservação do progresso legado e isolamento entre fontes PHP.\n";

conferir($doc['itens']['series:100']['vistos'] === [101], 'Conclusão alterou outra fonte.');
