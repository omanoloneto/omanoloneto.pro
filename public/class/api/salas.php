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

require __DIR__ . '/rooms-lib.php';

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

sendJsonHeaders();

function salaFile(string $codigo): string {
  return roomFile(DIR_SALAS, $codigo);
}

function lerSala(string $codigo): ?array {
  return readJson(salaFile($codigo));
}

function escreverSala(array $sala): void {
  writeJson(salaFile($sala['codigo']), $sala);
}

// A fase é derivada do relógio — o coração do multiplayer sem cron.
// avancoMs: tempo "pulado" quando todos respondem antes do timer
// (a fase continua função pura de inicioMs + avancoMs + agora).
function faseDaSala(array $sala, int $agora): array {
  if ($sala['inicioMs'] === null) return ['fase' => 'lobby'];
  $c = $sala['cfg'];
  $t = $agora - $sala['inicioMs'] + ($sala['avancoMs'] ?? 0);
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

function validarNome(mixed $nome): string {
  if (!matchesCharset($nome, 'A-Z', 2, 6)) fail(400, 'nome inválido');
  return $nome;
}

function validarCodigo(mixed $codigo): string {
  if (!matchesCharset($codigo, LETRAS_CODIGO, 4, 4)) fail(400, 'código inválido');
  return $codigo;
}

// ============================================================
$metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($metodo === 'GET') {
  $codigo = validarCodigo($_GET['codigo'] ?? '');
  $token = $_GET['token'] ?? '';
  if (!isToken($token)) fail(400, 'token inválido');
  $sala = lerSala($codigo);
  if ($sala === null) fail(404, 'sala não existe');
  if (!isset($sala['jogadores'][$token])) fail(403, 'você não está nesta sala');
  $agora = nowMs();
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
        // decorativos + rodadas passadas: o mapa pintado sobrevive a reconexão
        'marcados' => array_merge($sala['marcados'] ?? [], array_slice($sala['bandeiras'], 0, $rod)),
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

requirePost();
[$corpo, $acao] = readJsonBody();

if ($acao === 'criar') {
  $dificuldade = $corpo['dificuldade'] ?? '';
  if (!isset(POOLS[$dificuldade])) fail(400, 'dificuldade inválida');
  $rodadas = $corpo['rodadas'] ?? null;
  if (!in_array($rodadas, RODADAS_OK, true)) fail(400, 'rodadas inválidas');
  $rodadaMs = $corpo['rodadaMs'] ?? null;
  if (!in_array($rodadaMs, RODADA_MS_OK, true)) fail(400, 'tempo inválido');
  $nome = validarNome($corpo['nome'] ?? '');
  $telao = ($corpo['telao'] ?? false) === true;

  if (!is_dir(DIR_SALAS)) @mkdir(DIR_SALAS, 0755, true);
  if (cleanOldRooms(DIR_SALAS, TTL_S, 4) >= MAX_SALAS) fail(429, 'muitas salas abertas agora — tente de novo em alguns minutos');

  $codigo = claimRandomCode(DIR_SALAS, LETRAS_CODIGO, 4, 8);
  if ($codigo === null) fail(500, 'não consegui criar a sala');

  $pool = POOLS[$dificuldade];
  shuffle($pool);
  $token = newToken();
  $sala = [
    'codigo' => $codigo,
    'criadoMs' => nowMs(),
    'inicioMs' => null,
    'avancoMs' => 0,
    'cfg' => ['rodadas' => $rodadas, 'rodadaMs' => $rodadaMs, 'dificuldade' => $dificuldade],
    'bandeiras' => array_slice($pool, 0, $rodadas),
    // 3 países decorativos já pintados com a bandeira no início (nunca perguntados)
    'marcados' => array_slice($pool, $rodadas, 3),
    'host' => $token,
    'jogadores' => [$token => ['nome' => $nome, 'telao' => $telao, 'entrouMs' => nowMs()]],
    'respostas' => array_fill(0, $rodadas, []),
  ];
  escreverSala($sala);
  echo json_encode(['codigo' => $codigo, 'token' => $token]);
  exit;
}

if ($acao === 'entrar') {
  $codigo = validarCodigo($corpo['codigo'] ?? '');
  $nome = validarNome($corpo['nome'] ?? '');
  $resultado = withLock(salaFile($codigo), function () use ($codigo, $nome) {
    $sala = lerSala($codigo);
    if ($sala === null) fail(404, 'sala não encontrada — confira o código');
    if (faseDaSala($sala, nowMs())['fase'] === 'fim') fail(410, 'essa partida já acabou');
    if (count($sala['jogadores']) >= MAX_JOGADORES) fail(429, 'a sala está cheia');
    foreach ($sala['jogadores'] as $j) {
      if ($j['nome'] === $nome && !$j['telao']) fail(409, 'já tem alguém com esse nome na sala');
    }
    $token = newToken();
    $sala['jogadores'][$token] = ['nome' => $nome, 'telao' => false, 'entrouMs' => nowMs()];
    escreverSala($sala);
    return ['token' => $token];
  });
  echo json_encode($resultado);
  exit;
}

if ($acao === 'comecar') {
  $codigo = validarCodigo($corpo['codigo'] ?? '');
  $token = (string) ($corpo['token'] ?? '');
  if (!isToken($token)) fail(400, 'token inválido');
  withLock(salaFile($codigo), function () use ($codigo, $token) {
    $sala = lerSala($codigo);
    if ($sala === null) fail(404, 'sala não existe');
    if ($token !== $sala['host']) fail(403, 'só quem criou a sala pode começar');
    if ($sala['inicioMs'] !== null) fail(409, 'a partida já começou');
    $sala['inicioMs'] = nowMs();
    escreverSala($sala);
  });
  echo json_encode(['ok' => true]);
  exit;
}

if ($acao === 'responder') {
  $codigo = validarCodigo($corpo['codigo'] ?? '');
  $token = (string) ($corpo['token'] ?? '');
  if (!isToken($token)) fail(400, 'token inválido');
  $rodada = $corpo['rodada'] ?? null;
  $iso = $corpo['iso'] ?? '';
  if (!is_int($rodada) || !is_string($iso) || !preg_match('/^[a-z]{2}$/', $iso)) fail(400, 'resposta inválida');
  withLock(salaFile($codigo), function () use ($codigo, $token, $rodada, $iso) {
    $sala = lerSala($codigo);
    if ($sala === null) fail(404, 'sala não existe');
    $eu = $sala['jogadores'][$token] ?? null;
    if ($eu === null) fail(403, 'você não está nesta sala');
    if ($eu['telao']) fail(403, 'o telão não joga');
    $f = faseDaSala($sala, nowMs());
    if ($f['fase'] !== 'rodada' || $f['rodada'] !== $rodada) fail(409, 'essa rodada já fechou');
    if (isset($sala['respostas'][$rodada][$token])) fail(409, 'você já respondeu');
    // dtMs vem do relógio do SERVIDOR — bônus de velocidade à prova de trapaça
    $sala['respostas'][$rodada][$token] = [
      'iso' => $iso,
      'dtMs' => $sala['cfg']['rodadaMs'] - $f['restanteMs'],
    ];
    // todos os jogadores (sem contar o telão) já responderam?
    // pula o resto da rodada — o relógio salta direto pra revelação
    $elegiveis = 0;
    foreach ($sala['jogadores'] as $j) { if (!$j['telao']) $elegiveis++; }
    if (count($sala['respostas'][$rodada]) >= $elegiveis) {
      $sala['avancoMs'] = ($sala['avancoMs'] ?? 0) + $f['restanteMs'];
    }
    escreverSala($sala);
  });
  echo json_encode(['ok' => true]);
  exit;
}

fail(400, 'ação desconhecida');
