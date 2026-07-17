<?php

declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

const DIR_MUNDO = __DIR__ . '/wm-mundo';
const ARQUIVO = DIR_MUNDO . '/jogadores.json';
const MAX_JOGADORES = 40;
const SUMIU_S = 120;
const MAX_X = 60;
const MAX_Y = 40;

function falha(int $code, string $msg): void {
  http_response_code($code);
  echo json_encode(['erro' => $msg], JSON_UNESCAPED_UNICODE);
  exit;
}

function lerTodos(): array {
  $bruto = @file_get_contents(ARQUIVO);
  if ($bruto === false) return [];
  $j = json_decode($bruto, true);
  return is_array($j) ? $j : [];
}

function escreverTodos(array $jogadores): void {
  $tmp = ARQUIVO . '.tmp' . getmypid();
  if (file_put_contents($tmp, json_encode($jogadores, JSON_UNESCAPED_UNICODE)) === false || !rename($tmp, ARQUIVO)) {
    @unlink($tmp);
    falha(500, 'não consegui gravar');
  }
}

function comLock(callable $fn) {
  $lock = fopen(ARQUIVO . '.lock', 'c');
  if ($lock === false || !flock($lock, LOCK_EX)) falha(500, 'não consegui travar');
  try { return $fn(); }
  finally { flock($lock, LOCK_UN); fclose($lock); }
}

function expulsarSumidos(array $jogadores): array {
  $corte = time() - SUMIU_S;
  return array_filter($jogadores, fn($j) => ($j['visto'] ?? 0) >= $corte);
}

function validarNome(string $nome): bool {
  return preg_match('/^[A-Z0-9]{2,10}\z/', $nome) === 1;
}

function publicos(array $jogadores, string $excetoToken): array {
  $fora = [];
  foreach ($jogadores as $token => $j) {
    if ($token === $excetoToken) continue;
    $fora[] = ['nome' => $j['nome'], 'skin' => $j['skin'], 'x' => $j['x'], 'y' => $j['y'], 'dir' => $j['dir'], 'andando' => $j['andando']];
  }
  return $fora;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') falha(405, 'método não permitido');

$corpo = json_decode(file_get_contents('php://input') ?: '', true);
if (!is_array($corpo)) falha(400, 'JSON inválido');

$acao = $corpo['acao'] ?? '';

if (!is_dir(DIR_MUNDO)) @mkdir(DIR_MUNDO, 0755, true);

if ($acao === 'entrar') {
  $nome = $corpo['nome'] ?? '';
  $skin = $corpo['skin'] ?? '';
  if (!is_string($nome) || !validarNome($nome)) falha(400, 'nome inválido');
  if (!in_array($skin, ['dog', 'cat'], true)) falha(400, 'bicho inválido');

  $resp = comLock(function () use ($nome, $skin) {
    $jogadores = expulsarSumidos(lerTodos());
    if (count($jogadores) >= MAX_JOGADORES) falha(429, 'a vila está cheia — espera um pouquinho!');
    $nomes = array_column($jogadores, 'nome');
    $final = $nome;
    $n = 2;
    while (in_array($final, $nomes, true)) $final = substr($nome, 0, 8) . $n++;
    $token = bin2hex(random_bytes(8));
    $jogadores[$token] = ['nome' => $final, 'skin' => $skin, 'x' => 16, 'y' => 13, 'dir' => 0, 'andando' => false, 'visto' => time()];
    escreverTodos($jogadores);
    return ['token' => $token, 'nome' => $final];
  });
  echo json_encode($resp);
  exit;
}

$token = $corpo['token'] ?? '';
if (!is_string($token) || !preg_match('/^[a-f0-9]{16}\z/', $token)) falha(400, 'token inválido');

if ($acao === 'sync') {
  $pos = $corpo['pos'] ?? null;
  if (!is_array($pos)) falha(400, 'pos inválida');
  $x = is_numeric($pos['x'] ?? null) ? max(0, min(MAX_X, (float) $pos['x'])) : 0;
  $y = is_numeric($pos['y'] ?? null) ? max(0, min(MAX_Y, (float) $pos['y'])) : 0;
  $dir = in_array($pos['dir'] ?? null, [0, 1, 2, 3], true) ? $pos['dir'] : 0;
  $andando = ($pos['andando'] ?? false) === true;

  $resp = comLock(function () use ($token, $x, $y, $dir, $andando) {
    $jogadores = expulsarSumidos(lerTodos());
    if (!isset($jogadores[$token])) falha(403, 'você saiu da vila — entra de novo');
    $jogadores[$token]['x'] = $x;
    $jogadores[$token]['y'] = $y;
    $jogadores[$token]['dir'] = $dir;
    $jogadores[$token]['andando'] = $andando;
    $jogadores[$token]['visto'] = time();
    escreverTodos($jogadores);
    return ['jogadores' => publicos($jogadores, $token)];
  });
  echo json_encode($resp, JSON_UNESCAPED_UNICODE);
  exit;
}

if ($acao === 'sair') {
  comLock(function () use ($token) {
    $jogadores = lerTodos();
    unset($jogadores[$token]);
    escreverTodos($jogadores);
  });
  echo json_encode(['ok' => true]);
  exit;
}

falha(400, 'ação desconhecida');
