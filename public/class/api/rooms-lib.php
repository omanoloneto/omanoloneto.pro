<?php
// Infra comum dos endpoints de sala (salas.php, mb-salas.php, ss-salas.php).
// As chaves de dados em disco/fio ficam em português: formato congelado,
// há três jogos em produção lendo esses JSONs.
declare(strict_types=1);

if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) {
  http_response_code(404);
  exit;
}

function sendJsonHeaders(): void {
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store');
}

function requirePost(): void {
  if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') fail(405, 'método não permitido');
}

function readJsonBody(): array {
  $body = json_decode(file_get_contents('php://input') ?: '', true);
  if (!is_array($body)) fail(400, 'JSON inválido');
  return [$body, $body['acao'] ?? ''];
}

function fail(int $code, string $msg, array $extra = []): void {
  http_response_code($code);
  echo json_encode(['erro' => $msg] + $extra, JSON_UNESCAPED_UNICODE);
  exit;
}

function nowMs(): int {
  return (int) round(microtime(true) * 1000);
}

function roomFile(string $dir, string $code): string {
  return $dir . '/sala-' . $code . '.json';
}

function readJson(string $file): ?array {
  $raw = @file_get_contents($file);
  if ($raw === false) return null;
  $data = json_decode($raw, true);
  return is_array($data) ? $data : null;
}

function writeJson(string $file, array $data, string $failMsg = 'não consegui gravar a sala — tenta de novo?'): void {
  $tmp = $file . '.tmp' . getmypid();
  if (file_put_contents($tmp, json_encode($data, JSON_UNESCAPED_UNICODE)) === false || !rename($tmp, $file)) {
    @unlink($tmp);
    fail(500, $failMsg);
  }
}

function withLock(string $file, callable $fn) {
  $lock = fopen($file . '.lock', 'c');
  if ($lock === false || !flock($lock, LOCK_EX)) fail(500, 'não consegui travar a sala');
  try {
    return $fn();
  } finally {
    flock($lock, LOCK_UN);
    fclose($lock);
  }
}

function newToken(): string {
  return bin2hex(random_bytes(8));
}

function isToken($t): bool {
  return is_string($t) && preg_match('/^[a-f0-9]{16}\z/', $t) === 1;
}

function matchesCharset($s, string $charset, int $min, int $max): bool {
  if (!is_string($s)) return false;
  return preg_match('/^[' . $charset . ']{' . $min . ',' . $max . '}\z/', $s) === 1;
}

function randomCode(string $charset, int $len): string {
  $code = '';
  for ($i = 0; $i < $len; $i++) $code .= $charset[random_int(0, strlen($charset) - 1)];
  return $code;
}

function claimRandomCode(string $dir, string $charset, int $len, int $tries): ?string {
  for ($i = 0; $i < $tries; $i++) {
    $code = randomCode($charset, $len);
    $claim = @fopen(roomFile($dir, $code), 'x');
    if ($claim !== false) {
      fclose($claim);
      return $code;
    }
  }
  return null;
}

function claimExactCode(string $dir, string $code): bool {
  $claim = @fopen(roomFile($dir, $code), 'x');
  if ($claim === false) return false;
  fclose($claim);
  return true;
}

function cleanOldRooms(string $dir, int $ttlS, int $codeLen, ?callable $onDelete = null): int {
  $alive = 0;
  foreach (glob($dir . '/sala-' . str_repeat('?', $codeLen) . '.json') ?: [] as $f) {
    $m = filemtime($f);
    if ($m !== false && time() - $m > $ttlS) {
      if ($onDelete !== null) {
        $code = substr(basename($f, '.json'), 5);
        $onDelete($code);
      }
      @unlink($f);
      @unlink($f . '.lock');
    } else {
      $alive++;
    }
  }
  return $alive;
}

function dropVanishedPlayers(array &$room, int $now, int $goneS): void {
  $cutoff = $now - $goneS * 1000;
  foreach ($room['jogadores'] ?? [] as $tok => $j) {
    if (($j['vistoMs'] ?? 0) < $cutoff) unset($room['jogadores'][$tok]);
  }
}

function activeHost(array $room, int $now, int $activeS): ?string {
  $owner = (string) ($room['dono'] ?? '');
  $cutoff = $now - $activeS * 1000;
  $players = $room['jogadores'] ?? [];
  if ($owner !== '' && isset($players[$owner]) && ($players[$owner]['vistoMs'] ?? 0) >= $cutoff) {
    return $owner;
  }
  $best = null;
  foreach ($players as $tok => $j) {
    if (($j['vistoMs'] ?? 0) < $cutoff) continue;
    if ($best === null || ($j['entrouMs'] ?? 0) < ($players[$best]['entrouMs'] ?? 0)
      || (($j['entrouMs'] ?? 0) === ($players[$best]['entrouMs'] ?? 0) && strcmp((string) $tok, (string) $best) < 0)) {
      $best = (string) $tok;
    }
  }
  return $best;
}
