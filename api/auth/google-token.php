<?php
declare(strict_types=1);
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
function verificarTokenGoogle(string $token, string $clientId, string $nonce, array $certificados): array {
    $chaves = [];
    foreach ($certificados as $id => $certificado) $chaves[$id] = new Key($certificado, 'RS256');
    $payload = (array) JWT::decode($token, $chaves);
    if (($payload['aud'] ?? null) !== $clientId || !in_array($payload['iss'] ?? '', ['accounts.google.com', 'https://accounts.google.com'], true) || !is_int($payload['exp'] ?? null) || $payload['exp'] <= time() || !is_string($payload['sub'] ?? null) || $payload['sub'] === '' || !is_string($payload['nonce'] ?? null) || !hash_equals($nonce, $payload['nonce'])) {
        throw new UnexpectedValueException('Token inválido.');
    }
    return $payload;
}
function certificadosGoogle(): array {
    if (isset($_SESSION['google_certs'], $_SESSION['google_certs_exp']) && $_SESSION['google_certs_exp'] > time()) return $_SESSION['google_certs'];
    $curl = curl_init('https://www.googleapis.com/oauth2/v1/certs');
    $validade = 0;
    curl_setopt_array($curl, [CURLOPT_RETURNTRANSFER => true, CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_TIMEOUT => 10, CURLOPT_PROTOCOLS => CURLPROTO_HTTPS, CURLOPT_HEADERFUNCTION => static function ($curl, $linha) use (&$validade) {
        if (preg_match('/^cache-control:.*max-age=(\d+)/i', $linha, $m)) $validade = min((int) $m[1], 86400);
        return strlen($linha);
    }]);
    $json = curl_exec($curl);
    $status = curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
    curl_close($curl);
    if ($json === false || $status !== 200) throw new RuntimeException('Google indisponível.');
    $certificados = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
    if (!is_array($certificados) || !$certificados) throw new RuntimeException('Certificados inválidos.');
    $_SESSION['google_certs'] = $certificados;
    $_SESSION['google_certs_exp'] = time() + $validade;
    return $certificados;
}
