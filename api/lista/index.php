<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/auth/bootstrap.php';
require_once __DIR__ . '/operacoes.php';
if (!isset($_SESSION['user']['id'])) responder(401, ['error' => 'Entre com Google para acessar sua lista.']);
$method = $_SERVER['REQUEST_METHOD'];
if (!in_array($method, ['GET', 'POST'], true)) responder(405, ['error' => 'Método não permitido.']);
$operacao = null;
if ($method === 'POST') {
    if (!hash_equals($_SESSION['csrf'], $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '')) responder(403, ['error' => 'Sessão inválida. Recarregue a página.']);
    if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 256000) responder(413, ['error' => 'Requisição muito grande.']);
    $texto = file_get_contents('php://input', false, null, 0, 24001);
    if (strlen($texto) > 256000) responder(413, ['error' => 'Requisição muito grande.']);
    $operacao = json_decode($texto, true);
    if (!is_array($operacao)) responder(400, ['error' => 'Requisição inválida.']);
}
$userId = hash('sha256', $_SESSION['user']['id']);
session_write_close();
try {
    $db = new PDO('sqlite:' . __DIR__ . '/dados/listas.sqlite');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->exec('PRAGMA busy_timeout = 5000');
    $db->exec('CREATE TABLE IF NOT EXISTS listas (usuario TEXT PRIMARY KEY, documento TEXT NOT NULL)');
    if ($method === 'POST') $db->exec('BEGIN IMMEDIATE');
    $query = $db->prepare('SELECT documento FROM listas WHERE usuario = :usuario');
    $query->execute(['usuario' => $userId]);
    $row = $query->fetchColumn();
    $documento = $row === false ? ['itens' => []] : json_decode($row, true, 512, JSON_THROW_ON_ERROR);
    if ($method === 'POST') {
        try { $documento = atualizarLista($documento, $operacao); }
        catch (InvalidArgumentException $erro) { $db->exec('ROLLBACK'); responder(400, ['error' => $erro->getMessage()]); }
        $query = $db->prepare('INSERT INTO listas (usuario, documento) VALUES (:usuario, :documento) ON CONFLICT(usuario) DO UPDATE SET documento = excluded.documento');
        $query->execute(['usuario' => $userId, 'documento' => json_encode($documento, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)]);
        $db->exec('COMMIT');
    }
    responder(200, ['itens' => array_values($documento['itens'])]);
} catch (Throwable $erro) {
    if (isset($db)) { try { $db->exec('ROLLBACK'); } catch (Throwable $ignored) {} }
    responder(503, ['error' => 'Não foi possível acessar sua lista. Tente novamente.']);
}
