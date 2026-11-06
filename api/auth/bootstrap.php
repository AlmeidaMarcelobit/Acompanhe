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
