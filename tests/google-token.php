<?php
require __DIR__ . '/../vendor/autoload.php';
require __DIR__ . '/../api/auth/google-token.php';
use Firebase\JWT\JWT;
$key = openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA]);
if (!$key) throw new RuntimeException('Não foi possível gerar chave de teste.');
openssl_pkey_export($key, $private);
$public = openssl_pkey_get_details($key)['key'];
$claims = ['sub' => 'test-user', 'aud' => 'test.apps.googleusercontent.com', 'iss' => 'https://accounts.google.com', 'exp' => time() + 600, 'iat' => time(), 'nonce' => 'test-nonce'];
function verificar(array $claims, string $private, string $public): array {
    return verificarTokenGoogle(JWT::encode($claims, $private, 'RS256', 'test-key'), 'test.apps.googleusercontent.com', 'test-nonce', ['test-key' => $public]);
}
if (verificar($claims, $private, $public)['sub'] !== 'test-user') throw new RuntimeException('Token válido rejeitado.');
foreach (['aud' => 'other-client', 'iss' => 'https://attacker.invalid', 'exp' => time() - 60, 'nonce' => 'wrong-nonce', 'sub' => ''] as $claim => $value) {
    $bad = array_replace($claims, [$claim => $value]);
    $rejeitado = false;
    try { verificar($bad, $private, $public); } catch (Throwable $e) { $rejeitado = true; }
    if (!$rejeitado) throw new RuntimeException("Claim inválida aceita: $claim");
}
$rejeitado = false;
try { verificarTokenGoogle(JWT::encode($claims, str_repeat('x', 64), 'HS256', 'test-key'), $claims['aud'], $claims['nonce'], ['test-key' => $public]); } catch (Throwable $e) { $rejeitado = true; }
if (!$rejeitado) throw new RuntimeException('Algoritmo incorreto aceito.');
$other = openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA]);
openssl_pkey_export($other, $otherPrivate);
$rejeitado = false;
try { verificar($claims, $otherPrivate, $public); } catch (Throwable $e) { $rejeitado = true; }
if (!$rejeitado) throw new RuntimeException('Assinatura incorreta aceita.');
echo "OK: token válido; rejeição de audiência, emissor, expiração, nonce, sujeito, algoritmo e assinatura inválidos.\n";
