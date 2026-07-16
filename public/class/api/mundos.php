<?php

declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

const DIR_MUNDOS = __DIR__ . '/mundos';
const CHARSET_CODIGO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const TAM_CODIGO = 5;
const MAX_MUNDOS = 300;
const MAX_PAYLOAD = 700000;
const TTL_DIAS = 7;
const MIN_ENTRE_SAVES_S = 4;
const MAX_CRIAR_POR_MIN = 40;

function falha(int $code, string $msg, array $extra = []): void {
  http_response_code($code);
  echo json_encode(['erro' => $msg] + $extra, JSON_UNESCAPED_UNICODE);
  exit;
}

function arquivoMundo(string $codigo): string {
  return DIR_MUNDOS . '/mundo-' . $codigo . '.json';
}

function validarCodigo(string $codigo): bool {
  return preg_match('/^[' . CHARSET_CODIGO . ']{' . TAM_CODIGO . '}\z/', $codigo) === 1;
}

function lerMundo(string $codigo): ?array {
  $bruto = @file_get_contents(arquivoMundo($codigo));
  if ($bruto === false) return null;
  $m = json_decode($bruto, true);
  return is_array($m) ? $m : null;
}

function escreverMundo(string $codigo, array $mundo): void {
  $f = arquivoMundo($codigo);
  $tmp = $f . '.tmp' . getmypid();
  if (file_put_contents($tmp, json_encode($mundo, JSON_UNESCAPED_UNICODE)) === false || !rename($tmp, $f)) {
    @unlink($tmp);
    falha(500, 'não consegui gravar o mundo — tenta de novo?');
  }
}

function comLock(string $codigo, callable $fn) {
  $lock = fopen(arquivoMundo($codigo) . '.lock', 'c');
  if ($lock === false || !flock($lock, LOCK_EX)) falha(500, 'não consegui travar o mundo');
  try { return $fn(); }
  finally { flock($lock, LOCK_UN); fclose($lock); }
}

function limparMundosVelhos(): array {
  $arquivos = glob(DIR_MUNDOS . '/mundo-*.json') ?: [];
  $corte = time() - TTL_DIAS * 86400;
  $vivos = 0;
  $criadosNoUltimoMin = 0;
  foreach ($arquivos as $f) {
    $mt = filemtime($f) ?: time();
    if ($mt < $corte) { @unlink($f); @unlink($f . '.lock'); }
    else {
      $vivos++;
      if ($mt > time() - 60) $criadosNoUltimoMin++;
    }
  }
  return [$vivos, $criadosNoUltimoMin];
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') falha(405, 'método não permitido');

$corpo = json_decode(file_get_contents('php://input') ?: '', true);
if (!is_array($corpo)) falha(400, 'JSON inválido');

$acao = $corpo['acao'] ?? '';

if (!is_dir(DIR_MUNDOS)) @mkdir(DIR_MUNDOS, 0755, true);

if ($acao === 'criar') {
  [$vivos, $criadosNoUltimoMin] = limparMundosVelhos();
  if ($criadosNoUltimoMin >= MAX_CRIAR_POR_MIN) falha(429, 'muita gente criando mundo agora — espera um minutinho!');
  if ($vivos >= MAX_MUNDOS) falha(507, 'os mundos estão cheios — avise o professor!');

  do {
    $codigo = '';
    for ($i = 0; $i < TAM_CODIGO; $i++) $codigo .= CHARSET_CODIGO[random_int(0, strlen(CHARSET_CODIGO) - 1)];
    $claim = @fopen(arquivoMundo($codigo), 'x');
  } while ($claim === false);
  fclose($claim);

  escreverMundo($codigo, [
    'codigo' => $codigo,
    'criadoEm' => time(),
    'salvoEm' => 0,
    'payload' => null,
  ]);
  echo json_encode(['ok' => true, 'codigo' => $codigo]);
  exit;
}

$codigo = $corpo['codigo'] ?? '';
if (!is_string($codigo) || !validarCodigo($codigo)) falha(400, 'código de mundo inválido');

$mundo = lerMundo($codigo);
if ($mundo === null) falha(404, 'não achei esse mundo — confere o código?');

if ($acao === 'carregar') {
  limparMundosVelhos();
  @touch(arquivoMundo($codigo));
  echo json_encode(['payload' => $mundo['payload'], 'salvoEm' => $mundo['salvoEm'] ?? 0], JSON_UNESCAPED_UNICODE);
  exit;
}

if ($acao === 'salvar') {
  $payload = $corpo['payload'] ?? null;
  if (!is_string($payload) || strlen($payload) > MAX_PAYLOAD) falha(400, 'mundo grande demais');
  $dados = json_decode($payload, true);
  if (!is_array($dados) || !isset($dados['blocos']) || !is_string($dados['blocos'])) falha(400, 'payload inválido');
  $base = is_int($corpo['base'] ?? null) ? $corpo['base'] : 0;
  $force = ($corpo['force'] ?? false) === true;

  $salvoEm = comLock($codigo, function () use ($codigo, $dados, $base, $force) {
    $m = lerMundo($codigo);
    if ($m === null) falha(404, 'não achei esse mundo');
    if (time() - ($m['salvoEm'] ?? 0) < MIN_ENTRE_SAVES_S) falha(429, 'calma, salvando rápido demais');
    if (!$force && ($m['salvoEm'] ?? 0) > $base) {
      falha(409, 'conflito', ['salvoEm' => $m['salvoEm']]);
    }
    $m['payload'] = $dados;
    $m['salvoEm'] = time();
    escreverMundo($codigo, $m);
    return $m['salvoEm'];
  });
  echo json_encode(['ok' => true, 'salvoEm' => $salvoEm]);
  exit;
}

falha(400, 'ação desconhecida');
