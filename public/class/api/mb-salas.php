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

require __DIR__ . '/rooms-lib.php';

const DIR_SALAS = __DIR__ . '/mb-salas';

sendJsonHeaders();

function salaFile(string $codigo): string {
  return roomFile(DIR_SALAS, $codigo);
}
const LETRAS_CODIGO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const TTL_S = 10800;            // sala parada há 3h é limpa na criação de outra
const MAX_SALAS = 30;
const MAX_JOGADORES = 30;       // turma inteira
const MAX_FOTO = 4000000;        // bytes do JSON da foto (RLE real fica bem abaixo)
const MAX_EDICOES_POR_SYNC = 200;
const MAX_DIARIO = 3000;        // freio de emergência; anfitrião compacta muito antes
const MAX_METAS_POR_SYNC = 64;  // metadata (baú/placa) muda pouco por sync
const MAX_META_DIARIO = 2000;
const MAX_PENDENTES = 40;       // entregas de logout aguardando o dono
const RESERVA_PENDENTE_MS = 8000; // anfitrião "trava" a entrega enquanto resolve
const ATIVO_S = 12;             // visto há <12s conta pra eleger anfitrião
// aba em segundo plano: o Chrome estrangula timers pra ~1/min — a folga
// tem que ser MAIOR que isso, senão alt-tab de 2min expulsa a criança
const SUMIU_S = 120;            // visto há >120s sai da sala sozinho

// mundo 384×384×80; MAX_BLOCO tem que casar com a tabela do cliente
// (id acima da tabela envenena o save do dono: o decodificarRLE recusa
// o mundo inteiro no próximo carregar)
const MAX_X = 384;
const MAX_Y = 80;
const MAX_Z = 384;
const MAX_BLOCO = 28;   // maior id da tabela do cliente (ar..picareta de ferro)
const MAX_BICHOS = 16;  // teto de Winpups no blackboard (só posição)

function arquivoFoto(string $codigo): string {
  return DIR_SALAS . '/sala-' . $codigo . '-foto.json';
}

// chave da metadata = índice da célula (x + z*SX + y*SX*SZ)
function validarChave($k): bool {
  return is_int($k) && $k >= 0 && $k < MAX_X * MAX_Y * MAX_Z;
}

// metadata de uma célula: baú {dono, itens[]} | placa {autor, texto}
function metaLimpa($m) {
  if (!is_array($m)) return false;
  $tipo = $m['tipo'] ?? '';
  if ($tipo === 'bau') {
    if (!isset($m['dono']) || !is_string($m['dono']) || strlen($m['dono']) > 16) return false;
    if (!isset($m['itens']) || !is_array($m['itens']) || count($m['itens']) > 64) return false;
    foreach ($m['itens'] as $n) if (!is_int($n) || $n < 0 || $n > 999) return false;
    return ['tipo' => 'bau', 'dono' => $m['dono'], 'itens' => array_values($m['itens'])];
  }
  if ($tipo === 'placa') {
    if (!isset($m['autor'], $m['texto']) || !is_string($m['autor']) || !is_string($m['texto'])) return false;
    if (strlen($m['autor']) > 16 || mb_strlen($m['texto']) > 64) return false;
    return ['tipo' => 'placa', 'autor' => $m['autor'], 'texto' => $m['texto']];
  }
  return false;
}

// mapa de metadata da foto: {chaveStr: meta}
function metasLimpas($metas): array {
  $out = [];
  if (is_array($metas)) {
    foreach ($metas as $k => $m) {
      if (!validarChave((int)$k) || (string)(int)$k !== (string)$k) continue;
      $lm = metaLimpa($m);
      if ($lm !== false) $out[(string)(int)$k] = $lm;
    }
  }
  return $out;
}

// foto = {seed:int, blocos:'<RLE base64>', metas:{chave: meta}}
function validarFoto($foto): array {
  if (!is_array($foto) || !isset($foto['seed'], $foto['blocos'])) fail(400, 'foto inválida');
  if (!is_int($foto['seed']) || !is_string($foto['blocos'])) fail(400, 'foto inválida');
  $limpa = ['seed' => $foto['seed'], 'blocos' => $foto['blocos'], 'metas' => metasLimpas($foto['metas'] ?? null)];
  if (strlen(json_encode($limpa)) > MAX_FOTO) fail(400, 'mundo grande demais');
  return $limpa;
}

function nomeDoDono(array $sala): string {
  $j = $sala['jogadores'][$sala['dono']] ?? null;
  return $j['nome'] ?? '';
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
  return posLimpa(['x' => MAX_X / 2 + 0.5, 'y' => 62, 'z' => MAX_Z / 2 + 0.5]);
}

// bichos (Winpup) = blackboard escrito SÓ pelo anfitrião e lido por todos.
// Só posição/estado, saneado e limitado — nunca afeta o mundo (o drop de lã
// vem como edição de bloco normal).
function bichosLimpos($arr): array {
  if (!is_array($arr)) return [];
  $arr = array_slice($arr, 0, MAX_BICHOS); // bound: nunca itera além do teto
  $out = [];
  $n = function ($v, float $min, float $max): float {
    $f = is_numeric($v) ? (float)$v : 0.0;
    if (!is_finite($f)) $f = 0.0;
    return round(max($min, min($max, $f)), 2);
  };
  foreach ($arr as $b) {
    if (count($out) >= MAX_BICHOS) break;
    if (!is_array($b)) continue;
    $out[] = [
      'i' => (int) max(0, min(255, (int)($b['i'] ?? 0))),
      'x' => $n($b['x'] ?? 0, -8, MAX_X + 8),
      'y' => $n($b['y'] ?? 0, -8, MAX_Y + 24),
      'z' => $n($b['z'] ?? 0, -8, MAX_Z + 8),
      'yaw' => $n($b['yaw'] ?? 0, -10, 10),
    ];
  }
  return $out;
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

requirePost();
[$corpo, $acao] = readJsonBody();

if (!is_dir(DIR_SALAS)) @mkdir(DIR_SALAS, 0755, true);

// ------------------------------------------------------------ criar
if ($acao === 'criar') {
  $nome = $corpo['nome'] ?? '';
  if (!is_string($nome) || !matchesCharset($nome, 'A-Z0-9', 2, 10)) fail(400, 'nome inválido');
  $foto = validarFoto($corpo['foto'] ?? null);

  // limpeza oportunista de salas abandonadas (mtime = última atividade)
  $vivas = cleanOldRooms(DIR_SALAS, TTL_S, 5, fn (string $cod) => @unlink(arquivoFoto($cod)));
  // fotos órfãs (meta morreu no meio do caminho) não podem viver pra sempre
  foreach (glob(DIR_SALAS . '/sala-*-foto.json') ?: [] as $f) {
    $cod = substr(basename($f, '-foto.json'), 5);
    if (!file_exists(salaFile($cod))) @unlink($f);
  }
  if ($vivas >= MAX_SALAS) fail(429, 'muitas salas abertas agora — espera um pouquinho!');

  $codigo = $corpo['codigo'] ?? '';
  if (!is_string($codigo)) fail(400, 'código inválido');
  $codigo = strtoupper($codigo);
  if (!matchesCharset($codigo, LETRAS_CODIGO, 5, 5)) fail(400, 'código inválido');
  if (!claimExactCode(DIR_SALAS, $codigo)) fail(409, 'esse mundo já está aberto — entra nele!');

  $token = newToken();
  $agora = nowMs();
  writeJson(arquivoFoto($codigo), $foto);
  writeJson(salaFile($codigo), [
    'codigo' => $codigo,
    'criadoMs' => $agora,
    'dono' => $token,
    'snapshotSeq' => 0,
    'proxSeq' => 1,
    'edicoes' => [],
    'snapshotMetaSeq' => 0,
    'proxMetaSeq' => 1,
    'metasDiario' => [],
    'pendentes' => [], // entregas de logout aguardando o dono resolver
    'proxPendenteId' => 1,
    'jogadores' => [
      $token => ['nome' => $nome, 'entrouMs' => $agora, 'vistoMs' => $agora, 'loteVisto' => -1] + posInicial(),
    ],
  ]);
  echo json_encode(['codigo' => $codigo, 'token' => $token]);
  exit;
}

// todas as outras ações precisam de sala existente
$codigo = $corpo['codigo'] ?? '';
if (!is_string($codigo) || !matchesCharset(strtoupper($codigo), LETRAS_CODIGO, 5, 5)) fail(400, 'código inválido');
$codigo = strtoupper($codigo);
if (!file_exists(salaFile($codigo))) fail(404, 'essa sala não existe (ou já fechou)');

// ------------------------------------------------------------ entrar
if ($acao === 'entrar') {
  $nome = $corpo['nome'] ?? '';
  if (!is_string($nome) || !matchesCharset($nome, 'A-Z0-9', 2, 10)) fail(400, 'nome inválido');

  $resp = withLock(salaFile($codigo), function () use ($codigo, $nome) {
    $sala = readJson(salaFile($codigo));
    if ($sala === null) fail(404, 'essa sala não existe (ou já fechou)');
    $agora = nowMs();
    dropVanishedPlayers($sala, $agora, SUMIU_S);
    if (count($sala['jogadores']) >= MAX_JOGADORES) fail(429, 'a sala está cheia!');

    // nome repetido ganha número — dois PEDRO viram PEDRO e PEDRO2
    $nomes = array_column($sala['jogadores'], 'nome');
    $final = $nome;
    $n = 2;
    while (in_array($final, $nomes, true)) $final = substr($nome, 0, 8) . $n++;

    $token = newToken();
    $sala['jogadores'][$token] = ['nome' => $final, 'entrouMs' => $agora, 'vistoMs' => $agora, 'loteVisto' => -1] + posInicial();
    writeJson(salaFile($codigo), $sala);

    $foto = readJson(arquivoFoto($codigo));
    if ($foto === null) fail(500, 'a foto do mundo sumiu — cria outra sala?');
    return [
      'token' => $token,
      'nome' => $final,
      'foto' => $foto,
      'seq' => $sala['snapshotSeq'],
      'metaSeq' => $sala['snapshotMetaSeq'] ?? 0,
      'donoNome' => nomeDoDono($sala),
      'jogadores' => listaJogadores($sala, $token),
    ];
  });
  echo json_encode($resp, JSON_UNESCAPED_UNICODE);
  exit;
}

// sync/foto/sair exigem token de quem já está na sala
$token = $corpo['token'] ?? '';
if (!isToken($token)) fail(400, 'token inválido');

// ------------------------------------------------------------ sync
if ($acao === 'sync') {
  $desde = is_int($corpo['desde'] ?? null) ? $corpo['desde'] : 0;
  $desdeM = is_int($corpo['desdeM'] ?? null) ? $corpo['desdeM'] : 0;
  $loteN = is_int($corpo['lote'] ?? null) ? $corpo['lote'] : -1;
  $edicoes = $corpo['edicoes'] ?? [];
  $metasIn = $corpo['metas'] ?? [];
  // entregas de logout que o anfitrião JÁ resolveu (ids) — idempotente:
  // re-enviar não remove pendentes novos por engano (ao contrário de contar)
  $pendAck = is_array($corpo['pendentesAck'] ?? null) ? $corpo['pendentesAck'] : [];
  if (!is_array($edicoes) || count($edicoes) > MAX_EDICOES_POR_SYNC) fail(400, 'edições demais num sync só');
  if (!is_array($metasIn) || count($metasIn) > MAX_METAS_POR_SYNC) fail(400, 'metadata demais num sync só');

  $bichosIn = $corpo['bichos'] ?? null; // só o anfitrião escreve (validado no lock)
  $resp = withLock(salaFile($codigo), function () use ($codigo, $token, $desde, $desdeM, $loteN, $edicoes, $metasIn, $pendAck, $bichosIn, $corpo) {
    $sala = readJson(salaFile($codigo));
    if ($sala === null) fail(404, 'essa sala não existe (ou já fechou)');
    if (!isset($sala['jogadores'][$token])) fail(403, 'você não está nesta sala');
    $agora = nowMs();
    $j = $sala['jogadores'][$token];
    $loteVisto = $j['loteVisto'] ?? -1;
    $cheio = false;
    $sala['metasDiario'] = $sala['metasDiario'] ?? [];
    $sala['proxMetaSeq'] = $sala['proxMetaSeq'] ?? 1;
    $sala['snapshotMetaSeq'] = $sala['snapshotMetaSeq'] ?? 0;
    $sala['pendentes'] = $sala['pendentes'] ?? [];

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
          if (!is_array($e) || count($e) !== 4) fail(400, 'edição inválida');
          [$x, $y, $z, $b] = array_values($e);
          if (!is_int($x) || !is_int($y) || !is_int($z) || !is_int($b)) fail(400, 'edição inválida');
          if ($x < 0 || $x >= MAX_X || $y < 0 || $y >= MAX_Y || $z < 0 || $z >= MAX_Z) fail(400, 'edição fora do mundo');
          if ($b < 0 || $b > MAX_BLOCO) fail(400, 'bloco inválido');
          $sala['edicoes'][] = [$sala['proxSeq']++, $x, $y, $z, $b];
        }
        if ($loteN >= 0) $loteVisto = $loteN;
      }
    }

    // metadata (baú/placa): stream próprio, last-write-wins por chave.
    // Metadata é idempotente (objeto inteiro) → sem lote; re-envio é
    // seguro. Item INVÁLIDO é PULADO (não derruba o sync inteiro — um
    // fail(400) aqui travaria presença + edições da criança pra sempre)
    $metaCheio = false;
    if (count($metasIn) > 0) {
      if (count($sala['metasDiario']) + count($metasIn) > MAX_META_DIARIO) {
        // diário de metadata lotado: recusa o lote (o cliente segura pro
        // re-envio) e sinaliza — o anfitrião compacta e destrava a sala
        $metaCheio = true;
      } else {
        foreach ($metasIn as $mm) {
          if (!is_array($mm) || count($mm) !== 2) continue;
          [$k, $meta] = array_values($mm);
          if (!validarChave($k)) continue;
          if ($meta === null) {
            $sala['metasDiario'][] = [$sala['proxMetaSeq']++, $k, null];
          } else {
            $lm = metaLimpa($meta);
            if ($lm === false) continue;
            $sala['metasDiario'][] = [$sala['proxMetaSeq']++, $k, $lm];
          }
        }
      }
    }

    $anfitriao = activeHost($sala, $agora, ATIVO_S) === $token;
    // blackboard dos Winpups: SÓ o anfitrião escreve (os outros só leem)
    if ($anfitriao && $bichosIn !== null) {
      $sala['bichos'] = bichosLimpos($bichosIn);
    }
    // ack de entrega de logout: remove os pendentes resolvidos. Aceita de
    // QUEM RESERVOU (mesmo que tenha perdido o posto de anfitrião no meio)
    // — senão o depósito ficava feito mas o pendente vivo, e o novo
    // anfitrião depositava DE NOVO (item duplicado)
    if (count($pendAck) > 0) {
      $ids = array_filter($pendAck, 'is_int');
      $sala['pendentes'] = array_values(array_filter($sala['pendentes'], function ($p) use ($ids, $token, $anfitriao) {
        if (!in_array($p['id'] ?? -1, $ids, true)) return true; // não foi ackado
        return !($anfitriao || ($p['resPor'] ?? '') === $token); // remove se anfitrião ou reservador
      }));
    }

    // pendentes entregues SÓ ao anfitrião — e RESERVADOS por ele por um
    // tempo: se o anfitrião trocar no meio, o novo NÃO recebe o mesmo
    // pendente enquanto a reserva vale (evita depósito em dobro)
    $pendentes = [];
    if ($anfitriao) {
      foreach ($sala['pendentes'] as &$pp) {
        $resPor = $pp['resPor'] ?? '';
        if ($resPor !== '' && $resPor !== $token && $agora < ($pp['resAte'] ?? 0)) continue;
        $pp['resPor'] = $token;
        $pp['resAte'] = $agora + RESERVA_PENDENTE_MS;
        $pendentes[] = ['id' => $pp['id'], 'nome' => $pp['nome'], 'itens' => $pp['itens']];
      }
      unset($pp);
    }

    // presença + posição
    $sala['jogadores'][$token] = ['nome' => $j['nome'], 'entrouMs' => $j['entrouMs'], 'vistoMs' => $agora, 'loteVisto' => $loteVisto]
      + posLimpa($corpo['pos'] ?? null);
    dropVanishedPlayers($sala, $agora, SUMIU_S);
    writeJson(salaFile($codigo), $sala);

    $seqAtual = $sala['proxSeq'] - 1;
    $metaSeqAtual = $sala['proxMetaSeq'] - 1;

    // cliente ficou pra trás da compactação → manda o mundo inteiro de novo
    if ($desde < $sala['snapshotSeq'] || $desdeM < $sala['snapshotMetaSeq']) {
      $foto = readJson(arquivoFoto($codigo));
      if ($foto === null) fail(500, 'a foto do mundo sumiu — cria outra sala?');
      return [
        'reset' => true,
        'foto' => $foto,
        'seq' => $sala['snapshotSeq'],
        'metaSeq' => $sala['snapshotMetaSeq'],
        'jogadores' => listaJogadores($sala, $token),
        'anfitriao' => $anfitriao,
        'donoNome' => nomeDoDono($sala),
        'pendentes' => $pendentes,
        'bichos' => $sala['bichos'] ?? [],
        'cheio' => $cheio,
        'metaCheio' => $metaCheio,
        'diario' => count($sala['edicoes']),
        'metaDiario' => count($sala['metasDiario']),
      ];
    }

    $novas = [];
    foreach ($sala['edicoes'] as $e) {
      if ($e[0] > $desde) $novas[] = $e;
    }
    $metasNovas = [];
    foreach ($sala['metasDiario'] as $me) {
      if ($me[0] > $desdeM) $metasNovas[] = $me;
    }
    return [
      'seq' => $seqAtual,
      'metaSeq' => $metaSeqAtual,
      'edicoes' => $novas,
      'metasNovas' => $metasNovas,
      'jogadores' => listaJogadores($sala, $token),
      'anfitriao' => $anfitriao,
      'donoNome' => nomeDoDono($sala),
      'pendentes' => $pendentes,
      'bichos' => $sala['bichos'] ?? [],
      'cheio' => $cheio,
      'metaCheio' => $metaCheio,
      'diario' => count($sala['edicoes']),
      'metaDiario' => count($sala['metasDiario']),
    ];
  });
  echo json_encode($resp, JSON_UNESCAPED_UNICODE);
  exit;
}

// ------------------------------------------------------------ foto (compactação, só anfitrião)
if ($acao === 'foto') {
  $foto = validarFoto($corpo['foto'] ?? null);
  $ateSeq = is_int($corpo['ateSeq'] ?? null) ? $corpo['ateSeq'] : -1;
  $ateMetaSeq = is_int($corpo['ateMetaSeq'] ?? null) ? $corpo['ateMetaSeq'] : -1;

  withLock(salaFile($codigo), function () use ($codigo, $token, $foto, $ateSeq, $ateMetaSeq) {
    $sala = readJson(salaFile($codigo));
    if ($sala === null) fail(404, 'essa sala não existe (ou já fechou)');
    if (!isset($sala['jogadores'][$token])) fail(403, 'você não está nesta sala');
    $agora = nowMs();
    if (activeHost($sala, $agora, ATIVO_S) !== $token) fail(403, 'só o anfitrião manda foto');
    if ($ateSeq < $sala['snapshotSeq'] || $ateSeq > $sala['proxSeq'] - 1) fail(400, 'ateSeq inválido');
    $sala['proxMetaSeq'] = $sala['proxMetaSeq'] ?? 1;
    $sala['snapshotMetaSeq'] = $sala['snapshotMetaSeq'] ?? 0;
    $sala['metasDiario'] = $sala['metasDiario'] ?? [];
    if ($ateMetaSeq < $sala['snapshotMetaSeq'] || $ateMetaSeq > $sala['proxMetaSeq'] - 1) fail(400, 'ateMetaSeq inválido');

    // a foto já traz metas dobradas (o cliente serializou o mapa inteiro)
    writeJson(arquivoFoto($codigo), $foto);
    $sala['snapshotSeq'] = $ateSeq;
    $sala['snapshotMetaSeq'] = $ateMetaSeq;
    $sala['edicoes'] = array_values(array_filter($sala['edicoes'], fn($e) => $e[0] > $ateSeq));
    $sala['metasDiario'] = array_values(array_filter($sala['metasDiario'], fn($e) => $e[0] > $ateMetaSeq));
    writeJson(salaFile($codigo), $sala);
  });
  echo json_encode(['ok' => true]);
  exit;
}

// ------------------------------------------------------------ sair
if ($acao === 'sair') {
  // visitante saindo pode mandar o inventário: vira uma "entrega" que o
  // dono resolve (baú do visitante → baú do dono → inventário do dono)
  $inv = $corpo['inventario'] ?? null;
  $invLimpo = null;
  if (is_array($inv) && count($inv) <= 64) {
    $ok = true;
    foreach ($inv as $n) if (!is_int($n) || $n < 0 || $n > 999) { $ok = false; break; }
    if ($ok && array_sum($inv) > 0) $invLimpo = array_values($inv);
  }
  withLock(salaFile($codigo), function () use ($codigo, $token, $invLimpo) {
    $sala = readJson(salaFile($codigo));
    if ($sala === null) return;
    $saindo = $sala['jogadores'][$token] ?? null;
    unset($sala['jogadores'][$token]);
    // guarda a entrega só se o visitante NÃO for o dono e tiver itens
    if ($invLimpo !== null && $saindo !== null && $token !== $sala['dono']) {
      $sala['pendentes'] = $sala['pendentes'] ?? [];
      $sala['proxPendenteId'] = $sala['proxPendenteId'] ?? 1;
      if (count($sala['pendentes']) < MAX_PENDENTES) {
        $sala['pendentes'][] = ['id' => $sala['proxPendenteId']++, 'nome' => $saindo['nome'], 'itens' => $invLimpo];
      }
    }
    if (count($sala['jogadores']) === 0) {
      // sala vazia morre na hora (o TTL é só o plano B)
      @unlink(salaFile($codigo));
      @unlink(arquivoFoto($codigo));
      @unlink(salaFile($codigo) . '.lock');
    } else {
      writeJson(salaFile($codigo), $sala);
    }
  });
  echo json_encode(['ok' => true]);
  exit;
}

fail(400, 'ação desconhecida');
