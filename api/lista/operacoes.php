<?php
declare(strict_types=1);
function chaveLista(array $item): string {
    if (!in_array($item['tipo'] ?? '', ['series', 'filmes'], true) || !is_int($item['id'] ?? null) || $item['id'] < 1) throw new InvalidArgumentException('Título inválido.');
    return $item['tipo'] . ':' . $item['id'];
}
function atualizarLista(array $documento, array $operacao): array {
    $itens = $documento['itens'] ?? [];
    $chave = isset($operacao['item']) && is_array($operacao['item']) ? chaveLista($operacao['item']) : ($operacao['chave'] ?? '');
    if (!is_string($chave) || !preg_match('/^(series|filmes):[1-9]\d*$/D', $chave)) throw new InvalidArgumentException('Título inválido.');
    $action = $operacao['action'] ?? '';
    if ($action === 'remover') { unset($itens[$chave]); return ['itens' => $itens]; }
    if (!in_array($action, ['salvar', 'status', 'episodio', 'atual'], true)) throw new InvalidArgumentException('Operação inválida.');
    $item = $itens[$chave] ?? null;
    if (!$item) {
        if (!isset($operacao['item']) || !is_array($operacao['item'])) throw new InvalidArgumentException('Adicione o título à lista primeiro.');
        if (count($itens) >= 500) throw new InvalidArgumentException('Sua lista atingiu o limite de 500 títulos.');
        $origem = $operacao['item'];
        $texto = static fn($valor, $max) => is_string($valor) ? mb_substr($valor, 0, $max) : '';
        $url = static fn($valor) => is_string($valor) && preg_match('/^https?:\/\//', $valor) ? mb_substr($valor, 0, 2000) : '';
        if (trim($texto($origem['nome'] ?? '', 200)) === '') throw new InvalidArgumentException('Nome do título não informado.');
        $item = ['id' => $origem['id'], 'tipo' => $origem['tipo'], 'nome' => $texto($origem['nome'], 200), 'imagem' => $url($origem['imagem'] ?? ''), 'ano' => $texto($origem['ano'] ?? '', 4), 'sinopse' => $texto($origem['sinopse'] ?? '', 5000), 'url' => $url($origem['url'] ?? ''), 'status' => 'quero', 'vistos' => [], 'atual' => null];
    }
    if (in_array($action, ['salvar', 'status'], true)) {
        $status = $operacao['status'] ?? $item['status'];
        if (!in_array($status, ['quero', 'assistindo', 'concluido'], true)) throw new InvalidArgumentException('Situação inválida.');
        $item['status'] = $status;
        if ($status === 'concluido') $item['atual'] = null;
    } else {
        if ($item['tipo'] !== 'series') throw new InvalidArgumentException('Filmes não possuem episódios.');
        $ep = $operacao['episodio'] ?? null;
        if (!is_array($ep) || !is_int($ep['id'] ?? null) || $ep['id'] < 1 || !is_int($ep['temporada'] ?? null) || $ep['temporada'] < 0 || !array_key_exists('numero', $ep) || ($ep['numero'] !== null && (!is_int($ep['numero']) || $ep['numero'] < 0))) throw new InvalidArgumentException('Episódio inválido.');
        $episodio = ['id' => $ep['id'], 'temporada' => $ep['temporada'], 'numero' => $ep['numero'], 'nome' => is_string($ep['nome'] ?? null) ? mb_substr($ep['nome'], 0, 200) : ''];
        if ($action === 'atual') {
            if (in_array($ep['id'], $item['vistos'], true)) throw new InvalidArgumentException('Este episódio já está marcado como visto.');
            $item['atual'] = $episodio;
            $item['status'] = 'assistindo';
        } else {
            if (!is_bool($operacao['visto'] ?? null)) throw new InvalidArgumentException('Marcação inválida.');
            $vistos = array_fill_keys($item['vistos'], true);
            if ($operacao['visto']) $vistos[$ep['id']] = true; else unset($vistos[$ep['id']]);
            if (count($vistos) > 20000) throw new InvalidArgumentException('Limite de episódios atingido.');
            $item['vistos'] = array_keys($vistos);
            if (($item['atual']['id'] ?? null) === $ep['id'] && $operacao['visto']) $item['atual'] = null;
            if ($item['status'] === 'quero' || ($item['status'] === 'concluido' && !$operacao['visto'])) $item['status'] = 'assistindo';
        }
    }
    $item['updatedAt'] = gmdate('Y-m-d\TH:i:s.000\Z');
    $itens[$chave] = $item;
    return ['itens' => $itens];
}
