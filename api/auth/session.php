<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
ini_set('session.use_strict_mode', '1');
ini_set('session.use_only_cookies', '1');
$base = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'], 3)), '/') . '/';
session_name('acompanhe_session');
session_set_cookie_params(['lifetime' => 0, 'path' => $base, 'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off', 'httponly' => true, 'samesite' => 'Lax']);
if (!@session_start()) {
    http_response_code(503);
    echo json_encode(['error' => 'Não foi possível iniciar a sessão.']);
    exit;
}
function responder(int $status, array $dados): void {
    http_response_code($status);
    echo json_encode($dados, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
$config = is_file(__DIR__ . '/config.local.php') ? require __DIR__ . '/config.local.php' : [];
$clientId = getenv('GOOGLE_CLIENT_ID') ?: ($config['google_client_id'] ?? '');
$configurado = (bool) preg_match('/^[a-zA-Z0-9._-]+\.apps\.googleusercontent\.com$/D', $clientId);
if (isset($_SESSION['expires_at']) && $_SESSION['expires_at'] <= time()) {
    $_SESSION = [];
    session_regenerate_id(true);
}
$_SESSION['csrf'] ??= bin2hex(random_bytes(32));
$_SESSION['nonce'] ??= bin2hex(random_bytes(32));
function estado(bool $configurado, string $clientId): array {
    return ['configured' => $configurado, 'clientId' => $configurado ? $clientId : null, 'csrf' => $_SESSION['csrf'], 'nonce' => $_SESSION['nonce'], 'user' => $_SESSION['user'] ?? null];
}
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
