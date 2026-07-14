<?php
// ============================================================
//  Mundos salvos do MineBlocks (sandbox voxel de /class/games).
//
//  POST {acao:'criar',    nome, senha}                        → {ok}
//  POST {acao:'salvar',   nome, senha, payload, base, force}  → {ok, salvoEm}
//  POST {acao:'carregar', nome, senha}                        → {payload, salvoEm}
//
//  Cada mundo é um arquivo mundos/mundo-<nome>.json (o .htaccess da
//  subpasta bloqueia acesso direto). A senha vira password_hash() na
//  criação; salvar E carregar exigem a senha certa. Compartilhar a
//  senha deixa um amigo continuar o mundo — UM DE CADA VEZ: o save
//  leva o `base` (salvoEm que o cliente conhece) e, se o servidor tem
//  um save mais novo, devolve 409 conflito em vez de apagar o
//  trabalho do outro (force=true, confirmado pela criança, passa).
//
//  Sem contas, sem e-mail: proteção proporcional a site de escola —
//  senha errada 5× seguidas trava o mundo por 30s (freia chute de
//  PIN), e criar tem teto por minuto (freia script maluco, deixa a
//  turma inteira criar no começo da aula).
//  Escrita atômica tmp+rename; exclusão mútua por arquivo .lock.
// ============================================================

declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

const DIR_MUNDOS = __DIR__ . '/mundos';
const MAX_MUNDOS = 300;
const MAX_PAYLOAD = 700000;   // bytes do payload JSON (RLE real fica em 15-60KB)
const TTL_DIAS = 180;         // mundo sem save há 6 meses é limpo na criação de outro
const MIN_ENTRE_SAVES_S = 4;  // rate limit por mundo (o cliente salva a cada 20s)
const MAX_CRIAR_POR_MIN = 40; // turma inteira cabe; flood de script não
const FALHAS_TRAVA = 5;       // senha errada 5× → espera
const TRAVA_S = 30;

function falha(int $code, string $msg, array $extra = []): void {
  http_response_code($code);
  echo json_encode(['erro' => $msg] + $extra, JSON_UNESCAPED_UNICODE);
  exit;
}

function arquivoMundo(string $nome): string {
  return DIR_MUNDOS . '/mundo-' . $nome . '.json';
}

function lerMundo(string $nome): ?array {
  $bruto = @file_get_contents(arquivoMundo($nome));
  if ($bruto === false) return null;
  $m = json_decode($bruto, true);
  return is_array($m) ? $m : null;
}

// escrita atômica: leitores nunca veem arquivo pela metade.
// Falha de disco/permissão NÃO pode virar {ok:true} silencioso.
function escreverMundo(string $nome, array $mundo): void {
  $f = arquivoMundo($nome);
  $tmp = $f . '.tmp' . getmypid();
  if (file_put_contents($tmp, json_encode($mundo, JSON_UNESCAPED_UNICODE)) === false || !rename($tmp, $f)) {
    @unlink($tmp);
    falha(500, 'não consegui gravar o mundo — tenta de novo?');
  }
}

function comLock(string $nome, callable $fn) {
  $lock = fopen(arquivoMundo($nome) . '.lock', 'c');
  if ($lock === false || !flock($lock, LOCK_EX)) falha(500, 'não consegui travar o mundo');
  try { return $fn(); }
  finally { flock($lock, LOCK_UN); fclose($lock); }
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') falha(405, 'método não permitido');

$corpo = json_decode(file_get_contents('php://input') ?: '', true);
if (!is_array($corpo)) falha(400, 'JSON inválido');

$acao = $corpo['acao'] ?? '';
$nome = $corpo['nome'] ?? '';
$senha = $corpo['senha'] ?? '';
if (!is_string($nome) || !preg_match('/^[a-z0-9-]{3,16}$/', $nome)) falha(400, 'nome de mundo inválido');
if (!is_string($senha) || strlen($senha) < 4 || strlen($senha) > 20) falha(400, 'senha inválida');

if (!is_dir(DIR_MUNDOS)) @mkdir(DIR_MUNDOS, 0755, true);

if ($acao === 'criar') {
  // limpeza de mundos abandonados (>TTL sem salvar)
  $arquivos = glob(DIR_MUNDOS . '/mundo-*.json') ?: [];
  $corte = time() - TTL_DIAS * 86400;
  $criadosNoUltimoMin = 0;
  foreach ($arquivos as $f) {
    $mt = filemtime($f) ?: time();
    if ($mt < $corte) { @unlink($f); @unlink($f . '.lock'); }
    elseif ($mt > time() - 60) $criadosNoUltimoMin++;
  }
  if ($criadosNoUltimoMin >= MAX_CRIAR_POR_MIN) falha(429, 'muita gente criando mundo agora — espera um minutinho!');
  $arquivos = glob(DIR_MUNDOS . '/mundo-*.json') ?: [];
  if (count($arquivos) >= MAX_MUNDOS) falha(507, 'os mundos estão cheios — avise o professor!');

  comLock($nome, function () use ($nome, $senha) {
    if (lerMundo($nome) !== null) falha(409, 'esse mundo já existe — escolha outro nome (ou carregue ele com a senha)');
    escreverMundo($nome, [
      'nome' => $nome,
      'hash' => password_hash($senha, PASSWORD_DEFAULT),
      'criadoEm' => time(),
      'salvoEm' => 0,
      'falhas' => 0,
      'falhaEm' => 0,
      'payload' => null,
    ]);
  });
  echo json_encode(['ok' => true]);
  exit;
}

// salvar/carregar exigem mundo existente + senha certa
$mundo = lerMundo($nome);
if ($mundo === null) falha(404, 'não achei esse mundo — confere o nome?');

// trava anti-chute: 5 senhas erradas seguidas = 30s de espera
if (($mundo['falhas'] ?? 0) >= FALHAS_TRAVA && time() - ($mundo['falhaEm'] ?? 0) < TRAVA_S) {
  falha(429, 'muitas tentativas de senha — espera meio minutinho e tenta de novo');
}

if (!password_verify($senha, $mundo['hash'] ?? '')) {
  comLock($nome, function () use ($nome) {
    $m = lerMundo($nome);
    if ($m === null) return;
    $m['falhas'] = ($m['falhas'] ?? 0) + 1;
    $m['falhaEm'] = time();
    escreverMundo($nome, $m);
  });
  falha(403, 'senha errada — tenta de novo!');
}

if ($acao === 'carregar') {
  if (($mundo['falhas'] ?? 0) > 0) {
    comLock($nome, function () use ($nome) {
      $m = lerMundo($nome);
      if ($m === null) return;
      $m['falhas'] = 0;
      escreverMundo($nome, $m);
    });
  }
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

  $salvoEm = comLock($nome, function () use ($nome, $dados, $base, $force) {
    $m = lerMundo($nome);
    if ($m === null) falha(404, 'não achei esse mundo');
    if (time() - ($m['salvoEm'] ?? 0) < MIN_ENTRE_SAVES_S) falha(429, 'calma, salvando rápido demais');
    // proteção contra apagar o trabalho do amigo: existe save mais novo
    // que o que este cliente conhece → conflito (force passa por cima)
    if (!$force && ($m['salvoEm'] ?? 0) > $base) {
      falha(409, 'conflito', ['salvoEm' => $m['salvoEm']]);
    }
    $m['payload'] = $dados;
    $m['salvoEm'] = time();
    $m['falhas'] = 0;
    escreverMundo($nome, $m);
    return $m['salvoEm'];
  });
  echo json_encode(['ok' => true, 'salvoEm' => $salvoEm]);
  exit;
}

falha(400, 'ação desconhecida');
