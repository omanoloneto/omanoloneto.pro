<?php
// ============================================================
//  Salas multiplayer do MineBlocks (visitas em tempo real).
//
//  POST {acao:'criar',  nome, foto}                              → {codigo, token}
//  POST {acao:'entrar', codigo, nome}                            → {token, nome, foto, seq, jogadores}
//  POST {acao:'sync',   codigo, token, desde, edicoes, pos}      → {seq, edicoes, jogadores, anfitriao}
//                                          (desde < snapshotSeq) → {reset:true, foto, seq, ...}
//  POST {acao:'foto',   codigo, token, foto, ateSeq}             → {ok}   (só anfitrião — compactação)
//  POST {acao:'sair',   codigo, token}                           → {ok}
//
//  O mundo canônico é um SNAPSHOT (foto = seed + blocos RLE) mais um
//  DIÁRIO de edições numeradas (seq). Cliente diz "vi até a seq N" e
//  recebe só o que veio depois — junto manda as edições dele e a
//  posição, e recebe a posição dos colegas. Sem websocket, sem cron:
//  polling puro, igual salas.php do Caça-Bandeiras.
//
//  Dois arquivos por sala pra não reescrever o snapshot (15-60KB) a
//  cada poll: sala-<COD>.json (meta, pequeno) + sala-<COD>-foto.json.
//  O anfitrião (dono, ou o mais antigo ativo se o dono sumir) roda os
//  sistemas automáticos do jogo e, de tempos em tempos, manda uma
//  foto nova pro diário ser podado (compactação).
//
//  Escrita atômica tmp+rename; exclusão mútua por arquivo .lock
//  separado (rename troca o inode — lock no próprio JSON seria racy).
// ============================================================

declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

const DIR_SALAS = __DIR__ . '/mb-salas';
const LETRAS_CODIGO = 'BCDFGHJKLMNPQRSTVWXZ'; // 20 consoantes — não forma palavra
const TTL_S = 10800;            // sala parada há 3h é limpa na criação de outra
const MAX_SALAS = 30;
const MAX_JOGADORES = 30;       // turma inteira
const MAX_FOTO = 700000;        // bytes do JSON da foto (RLE real fica em 15-60KB)
const MAX_EDICOES_POR_SYNC = 200;
const MAX_DIARIO = 3000;        // freio de emergência; anfitrião compacta muito antes
const ATIVO_S = 12;             // visto há <12s conta pra eleger anfitrião
// aba em segundo plano: o Chrome estrangula timers pra ~1/min — a folga
// tem que ser MAIOR que isso, senão alt-tab de 2min expulsa a criança
const SUMIU_S = 120;            // visto há >120s sai da sala sozinho

// mundo 96×96×40; MAX_BLOCO tem que casar com a tabela do cliente
// (id acima da tabela envenena o save do dono: o decodificarRLE recusa
// o mundo inteiro no próximo carregar)
const MAX_X = 96;
const MAX_Y = 40;
const MAX_Z = 96;
const MAX_BLOCO = 16;

function falha(int $code, string $msg, array $extra = []): void {
  http_response_code($code);
  echo json_encode(['erro' => $msg] + $extra, JSON_UNESCAPED_UNICODE);
  exit;
}

function arquivoSala(string $codigo): string {
  return DIR_SALAS . '/sala-' . $codigo . '.json';
}

function arquivoFoto(string $codigo): string {
  return DIR_SALAS . '/sala-' . $codigo . '-foto.json';
}

function lerJson(string $f): ?array {
  $bruto = @file_get_contents($f);
  if ($bruto === false) return null;
  $d = json_decode($bruto, true);
  return is_array($d) ? $d : null;
}

// escrita atômica: leitores nunca veem arquivo pela metade.
// Falha de disco NÃO pode virar {ok:true} silencioso.
function escreverJson(string $f, array $dados): void {
  $tmp = $f . '.tmp' . getmypid();
  if (file_put_contents($tmp, json_encode($dados, JSON_UNESCAPED_UNICODE)) === false || !rename($tmp, $f)) {
    @unlink($tmp);
    falha(500, 'não consegui gravar a sala — tenta de novo?');
  }
}

// o mesmo .lock cobre meta E foto da sala
function comLock(string $codigo, callable $fn) {
  $lock = fopen(arquivoSala($codigo) . '.lock', 'c');
  if ($lock === false || !flock($lock, LOCK_EX)) falha(500, 'não consegui travar a sala');
  try { return $fn(); }
  finally { flock($lock, LOCK_UN); fclose($lock); }
}

// \z e não $: o $ do PCRE aceita um \n no final — daria dois nomes
// visualmente idênticos na mesma sala
function validarCodigo(string $codigo): bool {
  return preg_match('/^[' . LETRAS_CODIGO . ']{4}\z/', $codigo) === 1;
}

function validarNome(string $nome): bool {
  return preg_match('/^[A-Z0-9]{2,10}\z/', $nome) === 1;
}

// foto = {seed:int, blocos:'<RLE base64>'}
function validarFoto($foto): array {
  if (!is_array($foto) || !isset($foto['seed'], $foto['blocos'])) falha(400, 'foto inválida');
  if (!is_int($foto['seed']) || !is_string($foto['blocos'])) falha(400, 'foto inválida');
  $limpa = ['seed' => $foto['seed'], 'blocos' => $foto['blocos']];
  if (strlen(json_encode($limpa)) > MAX_FOTO) falha(400, 'mundo grande demais');
  return $limpa;
}

function posLimpa($pos): array {
  if (!is_array($pos)) $pos = [];
  $n = function ($v, float $min, float $max): float {
    $f = is_numeric($v) ? (float)$v : 0.0;
    if (!is_finite($f)) $f = 0.0;
    return round(max($min, min($max, $f)), 2);
  };
  return [
    'x' => $n($pos['x'] ?? 0, -8, MAX_X + 8),
    'y' => $n($pos['y'] ?? 0, -8, MAX_Y + 24),
    'z' => $n($pos['z'] ?? 0, -8, MAX_Z + 8),
    'yaw' => $n($pos['yaw'] ?? 0, -10, 10),
    'pitch' => $n($pos['pitch'] ?? 0, -2, 2),
  ];
}

// pos de quem acabou de chegar: centro do mapa (spawn), não (0,0,0) —
// senão o boneco nasce enterrado no canto até o 1º sync do novato
function posInicial(): array {
  return posLimpa(['x' => MAX_X / 2 + 0.5, 'y' => 30, 'z' => MAX_Z / 2 + 0.5]);
}

function agoraMs(): int {
  return (int) round(microtime(true) * 1000);
}

// tira quem sumiu (aba fechada sem 'sair', Chromebook que dormiu)
function expulsarSumidos(array &$sala, int $agora): void {
  foreach ($sala['jogadores'] as $tok => $j) {
    if ($agora - ($j['vistoMs'] ?? 0) > SUMIU_S * 1000) unset($sala['jogadores'][$tok]);
  }
}

// anfitrião = dono se ativo; senão o ativo mais antigo. Regra pura da
// leitura — todos os clientes chegam à mesma resposta, sem eleição.
function tokenAnfitriao(array $sala, int $agora): ?string {
  $dono = $sala['dono'];
  $j = $sala['jogadores'][$dono] ?? null;
  if ($j !== null && $agora - ($j['vistoMs'] ?? 0) <= ATIVO_S * 1000) return $dono;
  $melhor = null;
  $melhorEntrou = PHP_INT_MAX;
  foreach ($sala['jogadores'] as $tok => $jg) {
    if ($agora - ($jg['vistoMs'] ?? 0) > ATIVO_S * 1000) continue;
    $entrou = $jg['entrouMs'] ?? PHP_INT_MAX;
    if ($entrou < $melhorEntrou || ($entrou === $melhorEntrou && strcmp((string)$tok, (string)$melhor) < 0)) {
      $melhor = (string)$tok;
      $melhorEntrou = $entrou;
    }
  }
  return $melhor;
}

function listaJogadores(array $sala, string $menos): array {
  $lista = [];
  foreach ($sala['jogadores'] as $tok => $j) {
    if ($tok === $menos) continue;
    $lista[] = [
      'nome' => $j['nome'],
      'x' => $j['x'], 'y' => $j['y'], 'z' => $j['z'],
      'yaw' => $j['yaw'], 'pitch' => $j['pitch'],
    ];
  }
  return $lista;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') falha(405, 'método não permitido');

$corpo = json_decode(file_get_contents('php://input') ?: '', true);
if (!is_array($corpo)) falha(400, 'JSON inválido');

$acao = $corpo['acao'] ?? '';

if (!is_dir(DIR_SALAS)) @mkdir(DIR_SALAS, 0755, true);

// ------------------------------------------------------------ criar
if ($acao === 'criar') {
  $nome = $corpo['nome'] ?? '';
  if (!is_string($nome) || !validarNome($nome)) falha(400, 'nome inválido');
  $foto = validarFoto($corpo['foto'] ?? null);

  // limpeza oportunista de salas abandonadas (mtime = última atividade)
  $vivas = 0;
  foreach (glob(DIR_SALAS . '/sala-????.json') ?: [] as $f) {
    if (time() - (filemtime($f) ?: time()) > TTL_S) {
      $cod = substr(basename($f, '.json'), 5);
      @unlink($f);
      @unlink(arquivoFoto($cod));
      @unlink($f . '.lock');
    } else {
      $vivas++;
    }
  }
  // fotos órfãs (meta morreu no meio do caminho) não podem viver pra sempre
  foreach (glob(DIR_SALAS . '/sala-*-foto.json') ?: [] as $f) {
    $cod = substr(basename($f, '-foto.json'), 5);
    if (!file_exists(arquivoSala($cod))) @unlink($f);
  }
  if ($vivas >= MAX_SALAS) falha(429, 'muitas salas abertas agora — espera um pouquinho!');

  // fopen 'x' CLAIMA o código atomicamente — dois "criar" simultâneos
  // nunca sorteiam a mesma sala (file_exists sozinho seria corrida)
  do {
    $codigo = '';
    for ($i = 0; $i < 4; $i++) $codigo .= LETRAS_CODIGO[random_int(0, strlen(LETRAS_CODIGO) - 1)];
    $claim = @fopen(arquivoSala($codigo), 'x');
  } while ($claim === false);
  fclose($claim);

  $token = bin2hex(random_bytes(8));
  $agora = agoraMs();
  escreverJson(arquivoFoto($codigo), $foto);
  escreverJson(arquivoSala($codigo), [
    'codigo' => $codigo,
    'criadoMs' => $agora,
    'dono' => $token,
    'snapshotSeq' => 0,
    'proxSeq' => 1,
    'edicoes' => [],
    'jogadores' => [
      $token => ['nome' => $nome, 'entrouMs' => $agora, 'vistoMs' => $agora, 'loteVisto' => -1] + posInicial(),
    ],
  ]);
  echo json_encode(['codigo' => $codigo, 'token' => $token]);
  exit;
}

// todas as outras ações precisam de sala existente
$codigo = $corpo['codigo'] ?? '';
if (!is_string($codigo) || !validarCodigo(strtoupper($codigo))) falha(400, 'código inválido');
$codigo = strtoupper($codigo);
if (!file_exists(arquivoSala($codigo))) falha(404, 'essa sala não existe (ou já fechou)');

// ------------------------------------------------------------ entrar
if ($acao === 'entrar') {
  $nome = $corpo['nome'] ?? '';
  if (!is_string($nome) || !validarNome($nome)) falha(400, 'nome inválido');

  $resp = comLock($codigo, function () use ($codigo, $nome) {
    $sala = lerJson(arquivoSala($codigo));
    if ($sala === null) falha(404, 'essa sala não existe (ou já fechou)');
    $agora = agoraMs();
    expulsarSumidos($sala, $agora);
    if (count($sala['jogadores']) >= MAX_JOGADORES) falha(429, 'a sala está cheia!');

    // nome repetido ganha número — dois PEDRO viram PEDRO e PEDRO2
    $nomes = array_column($sala['jogadores'], 'nome');
    $final = $nome;
    $n = 2;
    while (in_array($final, $nomes, true)) $final = substr($nome, 0, 8) . $n++;

    $token = bin2hex(random_bytes(8));
    $sala['jogadores'][$token] = ['nome' => $final, 'entrouMs' => $agora, 'vistoMs' => $agora, 'loteVisto' => -1] + posInicial();
    escreverJson(arquivoSala($codigo), $sala);

    $foto = lerJson(arquivoFoto($codigo));
    if ($foto === null) falha(500, 'a foto do mundo sumiu — cria outra sala?');
    return [
      'token' => $token,
      'nome' => $final,
      'foto' => $foto,
      'seq' => $sala['snapshotSeq'],
      'jogadores' => listaJogadores($sala, $token),
    ];
  });
  echo json_encode($resp, JSON_UNESCAPED_UNICODE);
  exit;
}

// sync/foto/sair exigem token de quem já está na sala
$token = $corpo['token'] ?? '';
if (!is_string($token) || $token === '') falha(400, 'token inválido');

// ------------------------------------------------------------ sync
if ($acao === 'sync') {
  $desde = is_int($corpo['desde'] ?? null) ? $corpo['desde'] : 0;
  $loteN = is_int($corpo['lote'] ?? null) ? $corpo['lote'] : -1;
  $edicoes = $corpo['edicoes'] ?? [];
  if (!is_array($edicoes) || count($edicoes) > MAX_EDICOES_POR_SYNC) falha(400, 'edições demais num sync só');

  $resp = comLock($codigo, function () use ($codigo, $token, $desde, $loteN, $edicoes, $corpo) {
    $sala = lerJson(arquivoSala($codigo));
    if ($sala === null) falha(404, 'essa sala não existe (ou já fechou)');
    if (!isset($sala['jogadores'][$token])) falha(403, 'você não está nesta sala');
    $agora = agoraMs();
    $j = $sala['jogadores'][$token];
    $loteVisto = $j['loteVisto'] ?? -1;
    $cheio = false;

    // lote já visto = resposta do sync anterior se perdeu no caminho e o
    // cliente re-enviou: as edições JÁ estão no diário, não duplica
    $duplicado = $loteN >= 0 && $loteN === $loteVisto;
    if (!$duplicado && count($edicoes) > 0) {
      if (count($sala['edicoes']) + count($edicoes) > MAX_DIARIO) {
        // diário lotado: recusa SÓ as edições (presença segue viva) e
        // avisa — o anfitrião manda uma foto e destrava a sala
        $cheio = true;
      } else {
        foreach ($edicoes as $e) {
          if (!is_array($e) || count($e) !== 4) falha(400, 'edição inválida');
          [$x, $y, $z, $b] = array_values($e);
          if (!is_int($x) || !is_int($y) || !is_int($z) || !is_int($b)) falha(400, 'edição inválida');
          if ($x < 0 || $x >= MAX_X || $y < 0 || $y >= MAX_Y || $z < 0 || $z >= MAX_Z) falha(400, 'edição fora do mundo');
          if ($b < 0 || $b > MAX_BLOCO) falha(400, 'bloco inválido');
          $sala['edicoes'][] = [$sala['proxSeq']++, $x, $y, $z, $b];
        }
        if ($loteN >= 0) $loteVisto = $loteN;
      }
    }

    // presença + posição
    $sala['jogadores'][$token] = ['nome' => $j['nome'], 'entrouMs' => $j['entrouMs'], 'vistoMs' => $agora, 'loteVisto' => $loteVisto]
      + posLimpa($corpo['pos'] ?? null);
    expulsarSumidos($sala, $agora);
    escreverJson(arquivoSala($codigo), $sala);

    $seqAtual = $sala['proxSeq'] - 1;
    $anfitriao = tokenAnfitriao($sala, $agora) === $token;

    // cliente ficou pra trás da compactação → manda o mundo inteiro de novo
    if ($desde < $sala['snapshotSeq']) {
      $foto = lerJson(arquivoFoto($codigo));
      if ($foto === null) falha(500, 'a foto do mundo sumiu — cria outra sala?');
      return [
        'reset' => true,
        'foto' => $foto,
        'seq' => $sala['snapshotSeq'],
        'jogadores' => listaJogadores($sala, $token),
        'anfitriao' => $anfitriao,
        'cheio' => $cheio,
        'diario' => count($sala['edicoes']),
      ];
    }

    $novas = [];
    foreach ($sala['edicoes'] as $e) {
      if ($e[0] > $desde) $novas[] = $e;
    }
    return [
      'seq' => $seqAtual,
      'edicoes' => $novas,
      'jogadores' => listaJogadores($sala, $token),
      'anfitriao' => $anfitriao,
      'cheio' => $cheio,
      'diario' => count($sala['edicoes']),
    ];
  });
  echo json_encode($resp, JSON_UNESCAPED_UNICODE);
  exit;
}

// ------------------------------------------------------------ foto (compactação, só anfitrião)
if ($acao === 'foto') {
  $foto = validarFoto($corpo['foto'] ?? null);
  $ateSeq = is_int($corpo['ateSeq'] ?? null) ? $corpo['ateSeq'] : -1;

  comLock($codigo, function () use ($codigo, $token, $foto, $ateSeq) {
    $sala = lerJson(arquivoSala($codigo));
    if ($sala === null) falha(404, 'essa sala não existe (ou já fechou)');
    if (!isset($sala['jogadores'][$token])) falha(403, 'você não está nesta sala');
    $agora = agoraMs();
    if (tokenAnfitriao($sala, $agora) !== $token) falha(403, 'só o anfitrião manda foto');
    if ($ateSeq < $sala['snapshotSeq'] || $ateSeq > $sala['proxSeq'] - 1) falha(400, 'ateSeq inválido');

    escreverJson(arquivoFoto($codigo), $foto);
    $sala['snapshotSeq'] = $ateSeq;
    $sala['edicoes'] = array_values(array_filter($sala['edicoes'], fn($e) => $e[0] > $ateSeq));
    escreverJson(arquivoSala($codigo), $sala);
  });
  echo json_encode(['ok' => true]);
  exit;
}

// ------------------------------------------------------------ sair
if ($acao === 'sair') {
  comLock($codigo, function () use ($codigo, $token) {
    $sala = lerJson(arquivoSala($codigo));
    if ($sala === null) return;
    unset($sala['jogadores'][$token]);
    if (count($sala['jogadores']) === 0) {
      // sala vazia morre na hora (o TTL é só o plano B)
      @unlink(arquivoSala($codigo));
      @unlink(arquivoFoto($codigo));
      @unlink(arquivoSala($codigo) . '.lock');
    } else {
      escreverJson(arquivoSala($codigo), $sala);
    }
  });
  echo json_encode(['ok' => true]);
  exit;
}

falha(400, 'ação desconhecida');
