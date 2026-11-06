<?php
require __DIR__ . '/../api/lista/operacoes.php';
function conferir(bool $condicao, string $mensagem): void { if (!$condicao) throw new RuntimeException($mensagem); }
$serie = ['id' => 10, 'tipo' => 'series', 'nome' => 'Série de teste'];
$filme = ['id' => 10, 'tipo' => 'filmes', 'nome' => 'Filme de teste'];
$ep = ['id' => 101, 'temporada' => 1, 'numero' => 1, 'nome' => 'Primeiro'];
$doc = atualizarLista([], ['action' => 'salvar', 'item' => $serie, 'status' => 'quero']);
$doc = atualizarLista($doc, ['action' => 'salvar', 'item' => $filme, 'status' => 'concluido']);
conferir(count($doc['itens']) === 2, 'Tipos com o mesmo ID foram confundidos.');
$doc = atualizarLista($doc, ['action' => 'atual', 'item' => $serie, 'episodio' => $ep]);
conferir($doc['itens']['series:10']['atual']['id'] === 101, 'Episódio atual incorreto.');
foreach ([true, true] as $visto) $doc = atualizarLista($doc, ['action' => 'episodio', 'item' => $serie, 'episodio' => $ep, 'visto' => $visto]);
conferir($doc['itens']['series:10']['vistos'] === [101], 'Episódios duplicados.');
conferir($doc['itens']['series:10']['atual'] === null, 'Episódio visto ainda está como atual.');
$doc = atualizarLista($doc, ['action' => 'status', 'chave' => 'series:10', 'status' => 'concluido']);
$doc = atualizarLista($doc, ['action' => 'episodio', 'item' => $serie, 'episodio' => $ep, 'visto' => false]);
conferir($doc['itens']['series:10']['status'] === 'assistindo', 'Desmarcar episódio não retomou a série.');
$doc = atualizarLista($doc, ['action' => 'remover', 'chave' => 'series:10']);
conferir(count($doc['itens']) === 1 && isset($doc['itens']['filmes:10']), 'Remoção afetou outro título.');
$rejeitou = false;
try { atualizarLista($doc, ['action' => 'episodio', 'item' => $filme, 'episodio' => $ep, 'visto' => true]); } catch (InvalidArgumentException $e) { $rejeitou = true; }
conferir($rejeitou, 'Filme aceitou episódio.');
echo "OK: situações, IDs por tipo, vistos, episódio atual, remoção e validação PHP.\n";
