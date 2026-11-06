<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
function respostaCatalogo(int $status, array $dados): void {
    http_response_code($status);
    header($status === 200 ? 'Cache-Control: public, max-age=300' : 'Cache-Control: no-store');
    echo json_encode($dados, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'GET') respostaCatalogo(405, ['error' => 'Método não permitido.']);
$acao = $_GET['acao'] ?? 'buscar';
$query = ['language' => 'pt-BR'];
if ($acao === 'buscar') {
    $tipo = $_GET['tipo'] ?? '';
    $termo = $_GET['q'] ?? '';
    if (!in_array($tipo, ['series', 'filmes'], true) || !is_string($termo) || mb_strlen($termo) > 150) respostaCatalogo(400, ['error' => 'Busca inválida.']);
    $recurso = $tipo === 'series' ? 'tv' : 'movie';
    $termo = trim($termo);
    $path = $termo === '' ? "/$recurso/popular" : "/search/$recurso";
    $query['page'] = '1';
    if ($tipo === 'filmes') $query['region'] = 'BR';
    if ($termo !== '') { $query['query'] = $termo; $query['include_adult'] = 'false'; }
} else {
    $id = $_GET['id'] ?? '';
    if (!is_string($id) || !preg_match('/^[1-9]\d{0,9}$/D', $id)) respostaCatalogo(400, ['error' => 'Série inválida.']);
    if ($acao === 'temporadas') $path = "/tv/$id";
    else {
        $temporada = $_GET['temporada'] ?? '';
        if ($acao !== 'episodios' || !is_string($temporada) || !preg_match('/^\d{1,4}$/D', $temporada)) respostaCatalogo(400, ['error' => 'Temporada inválida.']);
        $path = "/tv/$id/season/" . (int) $temporada;
    }
}
$config = is_file(dirname(__DIR__) . '/auth/config.local.php') ? require dirname(__DIR__) . '/auth/config.local.php' : [];
$token = getenv('TMDB_READ_ACCESS_TOKEN') ?: ($config['tmdb_read_access_token'] ?? '');
if (!is_string($token) || trim($token) === '') respostaCatalogo(503, ['code' => 'TMDB_NOT_CONFIGURED', 'error' => 'Catálogo em português ainda não configurado.']);
$curl = curl_init('https://api.themoviedb.org/3' . $path . '?' . http_build_query($query));
curl_setopt_array($curl, [CURLOPT_RETURNTRANSFER => true, CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_TIMEOUT => 12, CURLOPT_PROTOCOLS => CURLPROTO_HTTPS, CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . trim($token), 'Accept: application/json']]);
$json = curl_exec($curl);
$status = curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
curl_close($curl);
if ($json === false || $status !== 200) respostaCatalogo($status === 404 ? 404 : 503, ['error' => $status === 404 ? 'Título não encontrado.' : 'Não foi possível consultar o catálogo. Tente novamente.']);
$dados = json_decode($json, true);
if (!is_array($dados)) respostaCatalogo(503, ['error' => 'Resposta do catálogo inválida.']);
respostaCatalogo(200, $dados);
