<?php
declare(strict_types=1);
require_once __DIR__ . '/bootstrap.php';
if ($_SERVER['REQUEST_METHOD'] === 'GET') responder(200, estado($configurado, $clientId));
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: GET, POST');
    responder(405, ['error' => 'Método não permitido.']);
}
if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 16384) responder(413, ['error' => 'Requisição muito grande.']);
$entrada = file_get_contents('php://input', false, null, 0, 16385);
if (strlen($entrada) > 16384) responder(413, ['error' => 'Requisição muito grande.']);
$dados = json_decode($entrada, true);
if (!is_array($dados)) responder(400, ['error' => 'Requisição inválida.']);
$csrf = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
if (!hash_equals($_SESSION['csrf'], $csrf)) responder(403, ['error' => 'Sessão inválida. Recarregue a página.']);
if (($dados['action'] ?? '') === 'logout') {
    $_SESSION = ['csrf' => bin2hex(random_bytes(32)), 'nonce' => bin2hex(random_bytes(32))];
    session_regenerate_id(true);
    responder(200, estado($configurado, $clientId));
}
if (($dados['action'] ?? '') !== 'login') responder(400, ['error' => 'Ação inválida.']);
if (!$configurado) responder(503, ['error' => 'Login com Google ainda não configurado.']);
if (!is_string($dados['credential'] ?? null) || strlen($dados['credential']) > 12000 || $dados['credential'] === '') responder(400, ['error' => 'Credencial inválida.']);
$autoload = dirname(__DIR__, 2) . '/vendor/autoload.php';
if (!is_file($autoload)) responder(503, ['error' => 'Serviço de login indisponível.']);
require_once $autoload;
require_once __DIR__ . '/google-token.php';
try {
    $payload = verificarTokenGoogle($dados['credential'], $clientId, $_SESSION['nonce'], certificadosGoogle());
    session_regenerate_id(true);
    $_SESSION['user'] = ['id' => $payload['sub'], 'name' => $payload['name'] ?? 'Usuário Google', 'email' => $payload['email'] ?? ''];
    $_SESSION['expires_at'] = time() + 7200;
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
    $_SESSION['nonce'] = bin2hex(random_bytes(32));
    responder(200, estado($configurado, $clientId));
} catch (Throwable $erro) {
    responder(401, ['error' => 'Não foi possível validar o login com Google. Tente novamente.']);
}
