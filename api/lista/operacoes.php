<?php
declare(strict_types=1);
function chaveLista(array $item): string {
    if (!in_array($item['tipo'] ?? '', ['series', 'filmes'], true) || !is_int($item['id'] ?? null) || $item['id'] < 1) throw new InvalidArgumentException('Título inválido.');
    if (isset($item['fonte']) && $item['fonte'] !== 'tmdb') throw new InvalidArgumentException('Fonte inválida.');
    return (($item['fonte'] ?? null) === 'tmdb' ? 'tmdb:' : '') . $item['tipo'] . ':' . $item['id'];
}
function atualizarLista(array $documento, array $operacao): array {
    $itens = $documento['itens'] ?? [];
    $chave = isset($operacao['item']) && is_array($operacao['item']) ? chaveLista($operacao['item']) : ($operacao['chave'] ?? '');
    if (!is_string($chave) || !preg_match('/^(?:tmdb:)?(series|filmes):[1-9]\d*$/D', $chave)) throw new InvalidArgumentException('Título inválido.');
    $action = $operacao['action'] ?? '';
    if ($action === 'remover') { unset($itens[$chave]); return ['itens' => $itens]; }
    if (!in_array($action, ['salvar', 'status', 'episodio', 'atual', 'temporada'], true)) throw new InvalidArgumentException('Operação inválida.');
    $item = $itens[$chave] ?? null;
    if (!$item) {
        if (!isset($operacao['item']) || !is_array($operacao['item'])) throw new InvalidArgumentException('Adicione o título à lista primeiro.');
        if (count($itens) >= 500) throw new InvalidArgumentException('Sua lista atingiu o limite de 500 títulos.');
        $origem = $operacao['item'];
        $texto = static fn($valor, $max) => is_string($valor) ? mb_substr($valor, 0, $max) : '';
        $url = static fn($valor) => is_string($valor) && preg_match('/^https?:\/\//', $valor) ? mb_substr($valor, 0, 2000) : '';
        if (trim($texto($origem['nome'] ?? '', 200)) === '') throw new InvalidArgumentException('Nome do título não informado.');
        $item = ['id' => $origem['id'], 'tipo' => $origem['tipo'], 'nome' => $texto($origem['nome'], 200), 'imagem' => $url($origem['imagem'] ?? ''), 'ano' => $texto($origem['ano'] ?? '', 4), 'sinopse' => $texto($origem['sinopse'] ?? '', 5000), 'url' => $url($origem['url'] ?? ''), 'status' => 'quero', 'vistos' => [], 'atual' => null];
        if (($origem['fonte'] ?? null) === 'tmdb') $item['fonte'] = 'tmdb';
    }
    if (in_array($action, ['salvar', 'status'], true)) {
        $status = $operacao['status'] ?? $item['status'];
        if (!in_array($status, ['quero', 'assistindo', 'concluido'], true)) throw new InvalidArgumentException('Situação inválida.');
        $item['status'] = $status;
        if ($status === 'concluido') {
            if ($item['tipo'] === 'series') {
                $ids = $operacao['episodios'] ?? null;
                if (!is_array($ids) || count($ids) > 20000) throw new InvalidArgumentException('Lista completa de episódios obrigatória.');
                foreach ($ids as $id) if (!is_int($id) || $id < 1) throw new InvalidArgumentException('Episódio inválido.');
                $item['vistos'] = array_values(array_unique(array_merge($item['vistos'], $ids)));
                if (count($item['vistos']) > 20000) throw new InvalidArgumentException('Limite de episódios atingido.');
            }
            $item['atual'] = null;
        }
    } else {
        if ($item['tipo'] !== 'series') throw new InvalidArgumentException('Filmes não possuem episódios.');
        if ($action !== 'temporada') {
        $ep = $operacao['episodio'] ?? null;
        if (!is_array($ep) || !is_int($ep['id'] ?? null) || $ep['id'] < 1 || !is_int($ep['temporada'] ?? null) || $ep['temporada'] < 0 || !array_key_exists('numero', $ep) || ($ep['numero'] !== null && (!is_int($ep['numero']) || $ep['numero'] < 0))) throw new InvalidArgumentException('Episódio inválido.');
        $episodio = ['id' => $ep['id'], 'temporada' => $ep['temporada'], 'numero' => $ep['numero'], 'nome' => is_string($ep['nome'] ?? null) ? mb_substr($ep['nome'], 0, 200) : ''];
        }
        if ($action === 'atual') {
            if (in_array($ep['id'], $item['vistos'], true)) throw new InvalidArgumentException('Este episódio já está marcado como visto.');
            $item['atual'] = $episodio;
            $item['status'] = 'assistindo';
        } else {
            if (!is_bool($operacao['visto'] ?? null)) throw new InvalidArgumentException('Marcação inválida.');
            $vistos = array_fill_keys($item['vistos'], true);
            if ($action === 'temporada') {
                $ids = $operacao['episodios'] ?? null;
                if (!is_int($operacao['temporada'] ?? null) || $operacao['temporada'] < 0 || !is_array($ids) || !$ids || count($ids) > 2000) throw new InvalidArgumentException('Temporada inválida.');
                foreach ($ids as $id) if (!is_int($id) || $id < 1) throw new InvalidArgumentException('Temporada inválida.');
                $ids = array_unique($ids);
            } else $ids = [$ep['id']];
            foreach ($ids as $id) { if ($operacao['visto']) $vistos[$id] = true; else unset($vistos[$id]); }
            if (count($vistos) > 20000) throw new InvalidArgumentException('Limite de episódios atingido.');
            $item['vistos'] = array_keys($vistos);
            if (in_array($item['atual']['id'] ?? null, $ids, true) && $operacao['visto']) $item['atual'] = null;
            if ($item['status'] === 'quero' || ($item['status'] === 'concluido' && !$operacao['visto'])) $item['status'] = 'assistindo';
        }
    }
    $item['updatedAt'] = gmdate('Y-m-d\TH:i:s.000\Z');
    $itens[$chave] = $item;
    return ['itens' => $itens];
}
