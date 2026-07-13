<?php
// ============================================================
//  Salas multiplayer do Caça-Bandeiras (estilo Kahoot/GeoGuessr).
//
//  POST {acao:'criar', dificuldade, rodadas, rodadaMs, nome, telao?}
//       → {codigo, token}   (limpa salas velhas, sorteia bandeiras)
//  POST {acao:'entrar', codigo, nome}          → {token}
//  POST {acao:'comecar', codigo, token}        → {ok}   (só o host)
//  POST {acao:'responder', codigo, token, rodada, iso} → {ok}
//  GET  ?codigo=X&token=Y                      → estado da sala
//
//  SEM cron e SEM websocket: a fase (lobby/contagem/rodada/revelacao/
//  fim) é FUNÇÃO PURA do relógio do servidor — nenhum request "avança"
//  a partida; o host só dispara o começo. Pontos são calculados na
//  leitura, nunca armazenados nem aceitos do cliente.
//
//  Salas em salas/sala-<CODIGO>.json (bloqueadas por .htaccess).
//  Escrita atômica: tmp + rename; exclusão mútua por arquivo .lock.
// ============================================================

declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

const DIR_SALAS = __DIR__ . '/salas';
const TTL_S = 7200;          // sala morre 2h após a última escrita
const MAX_SALAS = 20;
const MAX_JOGADORES = 40;
const LETRAS_CODIGO = 'BCDFGHJKLMNPQRSTVWXZ'; // só consoantes: não forma palavra no telão
const REVELACAO_MS = 7000;
const CONTAGEM_MS = 3000;
const RODADAS_OK = [5, 10];
const RODADA_MS_OK = [15000, 20000, 30000];
const PONTOS_BASE = 500;     // acerto vale 500 + até 500 de bônus de velocidade

// pools por dificuldade — espelham src/data/caca-bandeiras.ts (fonte de verdade)
const POOLS = [
  'facil' => ['br','ar','us','cn','ru','ca','au','jp','mx','it','fr','pt','uy','py','cl','bo','pe','co','ve','ec','es','de','gb','in','eg','za','kr','gr'],
  'medio' => ['br','ar','us','cn','ru','ca','au','jp','mx','it','fr','pt','uy','py','cl','bo','pe','co','ve','ec','es','de','gb','in','eg','za','kr','gr','gy','sr','cu','jm','pa','cr','ma','ng','ke','tr','sa','il','th','vn','id','ph','nz','ch'],
  'dificil' => ['gy','sr','cu','jm','pa','cr','ma','ng','ke','tr','sa','il','th','vn','id','ph','nz','ch','se','no','dk','fi','is','nl','be','at','pl','ua','cz','hu','hr','ro','pk','bd','ir','iq','ie','ci','td','ml','sn','gn','et','gh','cm','hn','ni','mn','kz','dz','tn','mm'],
];

function falha(int $code, string $msg): void {
  http_response_code($code);
  echo json_encode(['erro' => $msg]);
  exit;
}

function agoraMs(): int { return (int) round(microtime(true) * 1000); }
function arquivoSala(string $codigo): string { return DIR_SALAS . '/sala-' . $codigo . '.json'; }

function lerSala(string $codigo): ?array {
  $bruto = @file_get_contents(arquivoSala($codigo));
  if ($bruto === false) return null;
  $sala = json_decode($bruto, true);
  return is_array($sala) ? $sala : null;
}

// escrita atômica: leitores nunca veem arquivo pela metade
function escreverSala(array $sala): void {
  $f = arquivoSala($sala['codigo']);
  $tmp = $f . '.tmp' . getmypid();
  file_put_contents($tmp, json_encode($sala, JSON_UNESCAPED_UNICODE));
  rename($tmp, $f);
}

// exclusão mútua pra read-modify-write (lock em arquivo separado,
// porque o rename troca o inode do JSON)
function comLock(string $codigo, callable $fn) {
  $lock = fopen(arquivoSala($codigo) . '.lock', 'c');
  if ($lock === false || !flock($lock, LOCK_EX)) falha(500, 'não consegui travar a sala');
  try { return $fn(); }
  finally { flock($lock, LOCK_UN); fclose($lock); }
}

// A fase é derivada do relógio — o coração do multiplayer sem cron
function faseDaSala(array $sala, int $agora): array {
  if ($sala['inicioMs'] === null) return ['fase' => 'lobby'];
  $c = $sala['cfg'];
  $t = $agora - $sala['inicioMs'];
  if ($t < CONTAGEM_MS) return ['fase' => 'contagem', 'restanteMs' => CONTAGEM_MS - $t];
  $t -= CONTAGEM_MS;
  $ciclo = $c['rodadaMs'] + REVELACAO_MS;
  $rodada = intdiv($t, $ciclo);
  if ($rodada >= $c['rodadas']) return ['fase' => 'fim'];
  $dentro = $t % $ciclo;
  if ($dentro < $c['rodadaMs']) {
    return ['fase' => 'rodada', 'rodada' => $rodada, 'restanteMs' => $c['rodadaMs'] - $dentro];
  }
  return ['fase' => 'revelacao', 'rodada' => $rodada, 'restanteMs' => $ciclo - $dentro];
}

function pontosRodada(array $sala, int $rodada, string $tok): int {
  $r = $sala['respostas'][$rodada][$tok] ?? null;
  if ($r === null || $r['iso'] !== $sala['bandeiras'][$rodada]) return 0;
  return PONTOS_BASE + (int) round(PONTOS_BASE * max(0, 1 - $r['dtMs'] / $sala['cfg']['rodadaMs']));
}

function totaisDe(array $sala, string $tok): array {
  $pontos = 0;
  $acertos = 0;
  foreach (array_keys($sala['respostas']) as $i) {
    $p = pontosRodada($sala, (int) $i, $tok);
    if ($p > 0) { $pontos += $p; $acertos++; }
  }
  return [$pontos, $acertos];
}

function placarDe(array $sala): array {
  $lista = [];
  foreach ($sala['jogadores'] as $tok => $j) {
    if ($j['telao']) continue;
    [$p, $a] = totaisDe($sala, (string) $tok);
    $lista[] = ['nome' => $j['nome'], 'pontos' => $p, 'acertos' => $a];
  }
  usort($lista, fn($x, $y) => $y['pontos'] <=> $x['pontos']);
  return $lista;
}

function limparSalasVelhas(): int {
  $vivas = 0;
  foreach (glob(DIR_SALAS . '/sala-*.json') ?: [] as $f) {
    if (time() - filemtime($f) > TTL_S) {
      @unlink($f);
      @unlink($f . '.lock');
    } else {
      $vivas++;
    }
  }
  return $vivas;
}

function validarNome(mixed $nome): string {
  if (!is_string($nome) || !preg_match('/^[A-Z]{2,6}$/', $nome)) falha(400, 'nome inválido');
  return $nome;
}

function validarCodigo(mixed $codigo): string {
  if (!is_string($codigo) || !preg_match('/^[' . LETRAS_CODIGO . ']{4}$/', $codigo)) falha(400, 'código inválido');
  return $codigo;
}

// ============================================================
$metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($metodo === 'GET') {
  $codigo = validarCodigo($_GET['codigo'] ?? '');
  $token = $_GET['token'] ?? '';
  $sala = lerSala($codigo);
  if ($sala === null) falha(404, 'sala não existe');
  if (!isset($sala['jogadores'][$token])) falha(403, 'você não está nesta sala');
  $agora = agoraMs();
  $f = faseDaSala($sala, $agora);
  $eu = $sala['jogadores'][$token];
  $cfg = $sala['cfg'];

  switch ($f['fase']) {
    case 'lobby':
      $nomes = [];
      foreach ($sala['jogadores'] as $j) { if (!$j['telao']) $nomes[] = $j['nome']; }
      echo json_encode([
        'fase' => 'lobby', 'codigo' => $codigo, 'jogadores' => $nomes,
        'cfg' => $cfg, 'souHost' => $token === $sala['host'],
      ], JSON_UNESCAPED_UNICODE);
      break;
    case 'contagem':
      echo json_encode(['fase' => 'contagem', 'restanteMs' => $f['restanteMs']]);
      break;
    case 'rodada': {
      $rod = $f['rodada'];
      echo json_encode([
        'fase' => 'rodada', 'rodada' => $rod, 'total' => $cfg['rodadas'],
        'restanteMs' => $f['restanteMs'], 'rodadaMs' => $cfg['rodadaMs'],
        'bandeira' => $sala['bandeiras'][$rod], // só a atual — as próximas nunca saem
        'respondi' => isset($sala['respostas'][$rod][$token]),
        'responderam' => count($sala['respostas'][$rod] ?? []),
      ]);
      break;
    }
    case 'revelacao': {
      $rod = $f['rodada'];
      $certo = $sala['bandeiras'][$rod];
      $minha = null;
      if (isset($sala['respostas'][$rod][$token])) {
        $r = $sala['respostas'][$rod][$token];
        $minha = ['iso' => $r['iso'], 'acertou' => $r['iso'] === $certo, 'pontos' => pontosRodada($sala, $rod, $token)];
      }
      $acertaram = 0;
      foreach ($sala['respostas'][$rod] ?? [] as $r) { if ($r['iso'] === $certo) $acertaram++; }
      [$meusPontos] = totaisDe($sala, $token);
      $placar = placarDe($sala);
      echo json_encode([
        'fase' => 'revelacao', 'rodada' => $rod, 'total' => $cfg['rodadas'],
        'restanteMs' => $f['restanteMs'], 'certo' => $certo,
        'minha' => $minha, 'meusPontos' => $meusPontos, 'acertaram' => $acertaram,
        'jogando' => count($placar), 'top5' => array_slice($placar, 0, 5),
      ], JSON_UNESCAPED_UNICODE);
      break;
    }
    case 'fim':
      echo json_encode(['fase' => 'fim', 'placar' => placarDe($sala)], JSON_UNESCAPED_UNICODE);
      break;
  }
  exit;
}

if ($metodo !== 'POST') falha(405, 'método não permitido');

$corpo = json_decode(file_get_contents('php://input') ?: '', true);
if (!is_array($corpo)) falha(400, 'JSON inválido');
$acao = $corpo['acao'] ?? '';

if ($acao === 'criar') {
  $dificuldade = $corpo['dificuldade'] ?? '';
  if (!isset(POOLS[$dificuldade])) falha(400, 'dificuldade inválida');
  $rodadas = $corpo['rodadas'] ?? null;
  if (!in_array($rodadas, RODADAS_OK, true)) falha(400, 'rodadas inválidas');
  $rodadaMs = $corpo['rodadaMs'] ?? null;
  if (!in_array($rodadaMs, RODADA_MS_OK, true)) falha(400, 'tempo inválido');
  $nome = validarNome($corpo['nome'] ?? '');
  $telao = ($corpo['telao'] ?? false) === true;

  if (!is_dir(DIR_SALAS)) @mkdir(DIR_SALAS, 0755, true);
  if (limparSalasVelhas() >= MAX_SALAS) falha(429, 'muitas salas abertas agora — tente de novo em alguns minutos');

  do {
    $codigo = '';
    for ($i = 0; $i < 4; $i++) $codigo .= LETRAS_CODIGO[random_int(0, strlen(LETRAS_CODIGO) - 1)];
  } while (file_exists(arquivoSala($codigo)));

  $pool = POOLS[$dificuldade];
  shuffle($pool);
  $token = bin2hex(random_bytes(8));
  $sala = [
    'codigo' => $codigo,
    'criadoMs' => agoraMs(),
    'inicioMs' => null,
    'cfg' => ['rodadas' => $rodadas, 'rodadaMs' => $rodadaMs, 'dificuldade' => $dificuldade],
    'bandeiras' => array_slice($pool, 0, $rodadas),
    'host' => $token,
    'jogadores' => [$token => ['nome' => $nome, 'telao' => $telao, 'entrouMs' => agoraMs()]],
    'respostas' => array_fill(0, $rodadas, []),
  ];
  escreverSala($sala);
  echo json_encode(['codigo' => $codigo, 'token' => $token]);
  exit;
}

if ($acao === 'entrar') {
  $codigo = validarCodigo($corpo['codigo'] ?? '');
  $nome = validarNome($corpo['nome'] ?? '');
  $resultado = comLock($codigo, function () use ($codigo, $nome) {
    $sala = lerSala($codigo);
    if ($sala === null) falha(404, 'sala não encontrada — confira o código');
    if (faseDaSala($sala, agoraMs())['fase'] === 'fim') falha(410, 'essa partida já acabou');
    if (count($sala['jogadores']) >= MAX_JOGADORES) falha(429, 'a sala está cheia');
    foreach ($sala['jogadores'] as $j) {
      if ($j['nome'] === $nome && !$j['telao']) falha(409, 'já tem alguém com esse nome na sala');
    }
    $token = bin2hex(random_bytes(8));
    $sala['jogadores'][$token] = ['nome' => $nome, 'telao' => false, 'entrouMs' => agoraMs()];
    escreverSala($sala);
    return ['token' => $token];
  });
  echo json_encode($resultado);
  exit;
}

if ($acao === 'comecar') {
  $codigo = validarCodigo($corpo['codigo'] ?? '');
  $token = (string) ($corpo['token'] ?? '');
  comLock($codigo, function () use ($codigo, $token) {
    $sala = lerSala($codigo);
    if ($sala === null) falha(404, 'sala não existe');
    if ($token !== $sala['host']) falha(403, 'só quem criou a sala pode começar');
    if ($sala['inicioMs'] !== null) falha(409, 'a partida já começou');
    $sala['inicioMs'] = agoraMs();
    escreverSala($sala);
  });
  echo json_encode(['ok' => true]);
  exit;
}

if ($acao === 'responder') {
  $codigo = validarCodigo($corpo['codigo'] ?? '');
  $token = (string) ($corpo['token'] ?? '');
  $rodada = $corpo['rodada'] ?? null;
  $iso = $corpo['iso'] ?? '';
  if (!is_int($rodada) || !is_string($iso) || !preg_match('/^[a-z]{2}$/', $iso)) falha(400, 'resposta inválida');
  comLock($codigo, function () use ($codigo, $token, $rodada, $iso) {
    $sala = lerSala($codigo);
    if ($sala === null) falha(404, 'sala não existe');
    $eu = $sala['jogadores'][$token] ?? null;
    if ($eu === null) falha(403, 'você não está nesta sala');
    if ($eu['telao']) falha(403, 'o telão não joga');
    $f = faseDaSala($sala, agoraMs());
    if ($f['fase'] !== 'rodada' || $f['rodada'] !== $rodada) falha(409, 'essa rodada já fechou');
    if (isset($sala['respostas'][$rodada][$token])) falha(409, 'você já respondeu');
    // dtMs vem do relógio do SERVIDOR — bônus de velocidade à prova de trapaça
    $sala['respostas'][$rodada][$token] = [
      'iso' => $iso,
      'dtMs' => $sala['cfg']['rodadaMs'] - $f['restanteMs'],
    ];
    escreverSala($sala);
  });
  echo json_encode(['ok' => true]);
  exit;
}

falha(400, 'ação desconhecida');
