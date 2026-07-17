<?php

declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

const DIR_SALAS = __DIR__ . '/ss-salas';
const MAX_SALAS = 20;
const MAX_JOGADORES = 12;
const SUMIU_S = 120;
const ATIVO_S = 12;
const TTL_S = 10800;
const CONTAGEM_MS = 3000;
const DURACAO_MS = 300000;
const RESPAWN_MS = 5000;
const DANO_MAX = 12;
const EVENTO_TTL_MS = 15000;
const MAX_EVENTOS_POR_SYNC = 16;
const CHARSET_CODIGO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function falha(int $code, string $msg): void {
  http_response_code($code);
  echo json_encode(['erro' => $msg], JSON_UNESCAPED_UNICODE);
  exit;
}

function agoraMs(): int {
  return (int) round(microtime(true) * 1000);
}

function arquivoSala(string $codigo): string {
  return DIR_SALAS . '/sala-' . $codigo . '.json';
}

function validarCodigo(string $codigo): bool {
  return preg_match('/^[A-Z2-9]{5}\z/', $codigo) === 1;
}

function validarNome(string $nome): bool {
  return preg_match('/^[A-Z0-9]{2,10}\z/', $nome) === 1;
}

function lerSala(string $codigo): ?array {
  $bruto = @file_get_contents(arquivoSala($codigo));
  if ($bruto === false) return null;
  $j = json_decode($bruto, true);
  return is_array($j) ? $j : null;
}

function escreverSala(string $codigo, array $sala): void {
  $arq = arquivoSala($codigo);
  $tmp = $arq . '.tmp' . getmypid();
  if (file_put_contents($tmp, json_encode($sala, JSON_UNESCAPED_UNICODE)) === false || !rename($tmp, $arq)) {
    @unlink($tmp);
    falha(500, 'não consegui gravar a sala');
  }
}

function comLock(string $codigo, callable $fn) {
  $lock = fopen(arquivoSala($codigo) . '.lock', 'c');
  if ($lock === false || !flock($lock, LOCK_EX)) falha(500, 'não consegui travar a sala');
  try { return $fn(); }
  finally { flock($lock, LOCK_UN); fclose($lock); }
}

function apagarSala(string $codigo): void {
  @unlink(arquivoSala($codigo));
  @unlink(arquivoSala($codigo) . '.lock');
}

function limparSalasVelhas(): void {
  $corte = time() - TTL_S;
  foreach (glob(DIR_SALAS . '/sala-*.json') ?: [] as $arq) {
    if (substr($arq, -5) !== '.json') continue;
    $m = @filemtime($arq);
    if ($m !== false && $m < $corte) {
      @unlink($arq);
      @unlink($arq . '.lock');
    }
  }
}

function expulsarSumidos(array &$sala, int $agora): void {
  $corte = $agora - SUMIU_S * 1000;
  foreach ($sala['jogadores'] as $token => $j) {
    if (($j['vistoMs'] ?? 0) < $corte) unset($sala['jogadores'][$token]);
  }
}

function faseDaSala(array $sala, int $agora): array {
  if ($sala['inicioMs'] === null) return ['fase' => 'lobby', 'restanteMs' => 0];
  $t = $agora - $sala['inicioMs'];
  if ($t < CONTAGEM_MS) return ['fase' => 'contagem', 'restanteMs' => CONTAGEM_MS - $t];
  if ($t < CONTAGEM_MS + DURACAO_MS) return ['fase' => 'jogando', 'restanteMs' => CONTAGEM_MS + DURACAO_MS - $t];
  return ['fase' => 'fim', 'restanteMs' => 0];
}

function tokenAnfitriao(array $sala, int $agora): string {
  $corte = $agora - ATIVO_S * 1000;
  $dono = $sala['dono'];
  if (isset($sala['jogadores'][$dono]) && ($sala['jogadores'][$dono]['vistoMs'] ?? 0) >= $corte) return $dono;
  $melhor = '';
  $melhorEntrou = PHP_INT_MAX;
  foreach ($sala['jogadores'] as $token => $j) {
    if (($j['vistoMs'] ?? 0) < $corte) continue;
    $entrou = $j['entrouMs'] ?? PHP_INT_MAX;
    if ($entrou < $melhorEntrou || ($entrou === $melhorEntrou && strcmp($token, $melhor) < 0)) {
      $melhor = $token;
      $melhorEntrou = $entrou;
    }
  }
  return $melhor !== '' ? $melhor : $dono;
}

function placarDaSala(array $sala): array {
  $azul = 0;
  $vermelho = 0;
  foreach ($sala['jogadores'] as $j) {
    if (($j['team'] ?? 0) === 0) $azul += $j['kills'] ?? 0;
    else $vermelho += $j['kills'] ?? 0;
  }
  return ['azul' => $azul, 'vermelho' => $vermelho];
}

function timeBalanceado(array $sala): int {
  $azul = 0;
  $vermelho = 0;
  foreach ($sala['jogadores'] as $j) {
    if (($j['team'] ?? 0) === 0) $azul++;
    else $vermelho++;
  }
  if ($azul < $vermelho) return 0;
  if ($vermelho < $azul) return 1;
  return random_int(0, 1);
}

function nomeDisponivel(array $sala, string $nome): string {
  $nomes = array_column($sala['jogadores'], 'nome');
  $final = $nome;
  $n = 2;
  while (in_array($final, $nomes, true)) $final = substr($nome, 0, 8) . $n++;
  return $final;
}

function novoJogador(string $nome, int $team, int $agora): array {
  return [
    'nome' => $nome, 'team' => $team,
    'x' => $team === 0 ? -24.5 : 24.5, 'y' => 0.0, 'z' => 12.0, 'yaw' => 0.0,
    'atirando' => false, 'derretidoAteMs' => 0,
    'kills' => 0, 'mortes' => 0,
    'entrouMs' => $agora, 'vistoMs' => $agora,
  ];
}

function jogadoresPublicos(array $sala, string $excetoToken, int $agora): array {
  $fora = [];
  foreach ($sala['jogadores'] as $token => $j) {
    if ($token === $excetoToken) continue;
    $fora[] = [
      'nome' => $j['nome'], 'team' => $j['team'],
      'x' => $j['x'], 'y' => $j['y'], 'z' => $j['z'], 'yaw' => $j['yaw'],
      'atirando' => $j['atirando'] === true,
      'derretido' => ($j['derretidoAteMs'] ?? 0) > $agora,
      'kills' => $j['kills'] ?? 0, 'mortes' => $j['mortes'] ?? 0,
    ];
  }
  return $fora;
}

function respostaSync(array $sala, string $token, int $agora, int $desde): array {
  $fase = faseDaSala($sala, $agora);
  $eventos = [];
  foreach ($sala['eventos'] as $ev) {
    if ($ev[0] > $desde) $eventos[] = $ev;
  }
  return [
    'fase' => $fase['fase'],
    'restanteMs' => $fase['restanteMs'],
    'souHost' => tokenAnfitriao($sala, $agora) === $token,
    'jogadores' => jogadoresPublicos($sala, $token, $agora),
    'eventos' => $eventos,
    'placar' => placarDaSala($sala),
  ];
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') falha(405, 'método não permitido');

$corpo = json_decode(file_get_contents('php://input') ?: '', true);
if (!is_array($corpo)) falha(400, 'JSON inválido');

$acao = $corpo['acao'] ?? '';

if (!is_dir(DIR_SALAS)) @mkdir(DIR_SALAS, 0755, true);

if ($acao === 'criar') {
  $nome = $corpo['nome'] ?? '';
  if (!is_string($nome) || !validarNome($nome)) falha(400, 'nome inválido');
  limparSalasVelhas();
  if (count(glob(DIR_SALAS . '/sala-*.json') ?: []) >= MAX_SALAS) falha(429, 'muitas salas abertas — tenta de novo daqui a pouco');

  $codigo = '';
  $claim = false;
  for ($i = 0; $i < 8 && $claim === false; $i++) {
    $codigo = '';
    for ($k = 0; $k < 5; $k++) $codigo .= CHARSET_CODIGO[random_int(0, strlen(CHARSET_CODIGO) - 1)];
    $claim = @fopen(arquivoSala($codigo), 'x');
  }
  if ($claim === false) falha(500, 'não consegui criar a sala');
  fclose($claim);

  $agora = agoraMs();
  $token = bin2hex(random_bytes(8));
  $team = random_int(0, 1);
  $sala = [
    'codigo' => $codigo,
    'criadoMs' => $agora,
    'dono' => $token,
    'inicioMs' => null,
    'proxSeq' => 1,
    'eventos' => [],
    'jogadores' => [$token => novoJogador($nome, $team, $agora)],
  ];
  comLock($codigo, function () use ($codigo, $sala) {
    escreverSala($codigo, $sala);
  });
  echo json_encode(['codigo' => $codigo, 'token' => $token, 'nome' => $nome, 'team' => $team]);
  exit;
}

$codigo = $corpo['codigo'] ?? '';
if (!is_string($codigo)) falha(400, 'código inválido');
$codigo = strtoupper($codigo);
if (!validarCodigo($codigo)) falha(400, 'código inválido');
if (!file_exists(arquivoSala($codigo))) falha(404, 'sala não encontrada — confere o código!');

if ($acao === 'entrar') {
  $nome = $corpo['nome'] ?? '';
  if (!is_string($nome) || !validarNome($nome)) falha(400, 'nome inválido');
  $resp = comLock($codigo, function () use ($codigo, $nome) {
    $sala = lerSala($codigo);
    if ($sala === null) falha(404, 'sala não encontrada');
    $agora = agoraMs();
    expulsarSumidos($sala, $agora);
    $fase = faseDaSala($sala, $agora);
    if ($fase['fase'] === 'fim') falha(410, 'essa partida já acabou — cria uma sala nova!');
    if (count($sala['jogadores']) >= MAX_JOGADORES) falha(429, 'a sala está cheia!');
    $final = nomeDisponivel($sala, $nome);
    $token = bin2hex(random_bytes(8));
    $team = timeBalanceado($sala);
    $sala['jogadores'][$token] = novoJogador($final, $team, $agora);
    escreverSala($codigo, $sala);
    return ['token' => $token, 'nome' => $final, 'team' => $team, 'fase' => $fase['fase'], 'codigo' => $codigo];
  });
  echo json_encode($resp, JSON_UNESCAPED_UNICODE);
  exit;
}

$token = $corpo['token'] ?? '';
if (!is_string($token) || !preg_match('/^[a-f0-9]{16}\z/', $token)) falha(400, 'token inválido');

if ($acao === 'comecar') {
  comLock($codigo, function () use ($codigo, $token) {
    $sala = lerSala($codigo);
    if ($sala === null) falha(404, 'sala não encontrada');
    $agora = agoraMs();
    expulsarSumidos($sala, $agora);
    if (!isset($sala['jogadores'][$token])) falha(403, 'você não está nessa sala');
    if ($sala['inicioMs'] !== null) falha(409, 'a partida já começou');
    if (tokenAnfitriao($sala, $agora) !== $token) falha(403, 'só quem criou a sala pode começar');
    $sala['inicioMs'] = $agora;
    escreverSala($codigo, $sala);
  });
  echo json_encode(['ok' => true]);
  exit;
}

if ($acao === 'reabrir') {
  comLock($codigo, function () use ($codigo, $token) {
    $sala = lerSala($codigo);
    if ($sala === null) falha(404, 'sala não encontrada');
    $agora = agoraMs();
    expulsarSumidos($sala, $agora);
    if (!isset($sala['jogadores'][$token])) falha(403, 'você não está nessa sala');
    if (faseDaSala($sala, $agora)['fase'] !== 'fim') falha(409, 'a partida ainda não acabou');
    if (tokenAnfitriao($sala, $agora) !== $token) falha(403, 'só quem criou a sala pode recomeçar');
    $sala['inicioMs'] = null;
    $sala['eventos'] = [];
    foreach ($sala['jogadores'] as $tk => $j) {
      $sala['jogadores'][$tk]['kills'] = 0;
      $sala['jogadores'][$tk]['mortes'] = 0;
      $sala['jogadores'][$tk]['derretidoAteMs'] = 0;
      $sala['jogadores'][$tk]['atirando'] = false;
    }
    escreverSala($codigo, $sala);
  });
  echo json_encode(['ok' => true]);
  exit;
}

if ($acao === 'sync') {
  $desde = is_numeric($corpo['desde'] ?? null) ? (int) $corpo['desde'] : 0;
  $pos = is_array($corpo['pos'] ?? null) ? $corpo['pos'] : [];
  $eventosIn = is_array($corpo['eventos'] ?? null) ? array_slice($corpo['eventos'], 0, MAX_EVENTOS_POR_SYNC) : [];

  $resp = comLock($codigo, function () use ($codigo, $token, $desde, $pos, $eventosIn) {
    $sala = lerSala($codigo);
    if ($sala === null) falha(404, 'sala não encontrada');
    $agora = agoraMs();
    expulsarSumidos($sala, $agora);
    if (!isset($sala['jogadores'][$token])) falha(403, 'você saiu da sala — entra de novo');
    $eu = &$sala['jogadores'][$token];
    $eu['x'] = is_numeric($pos['x'] ?? null) ? max(-28.0, min(28.0, (float) $pos['x'])) : $eu['x'];
    $eu['y'] = is_numeric($pos['y'] ?? null) ? max(-2.0, min(6.0, (float) $pos['y'])) : $eu['y'];
    $eu['z'] = is_numeric($pos['z'] ?? null) ? max(-16.0, min(16.0, (float) $pos['z'])) : $eu['z'];
    $eu['yaw'] = is_numeric($pos['yaw'] ?? null) && is_finite((float) $pos['yaw']) ? (float) $pos['yaw'] : $eu['yaw'];
    $eu['atirando'] = ($pos['atirando'] ?? false) === true;
    $eu['vistoMs'] = $agora;

    $fase = faseDaSala($sala, $agora);
    if ($fase['fase'] === 'jogando') {
      foreach ($eventosIn as $ev) {
        if (!is_array($ev) || !is_string($ev[0] ?? null)) continue;
        if ($ev[0] === 'hit') {
          $alvoNome = is_string($ev[1] ?? null) ? $ev[1] : '';
          $dano = is_numeric($ev[2] ?? null) ? max(1, min(DANO_MAX, (int) $ev[2])) : 0;
          if ($dano < 1) continue;
          $alvoOk = false;
          foreach ($sala['jogadores'] as $j) {
            if ($j['nome'] === $alvoNome && ($j['derretidoAteMs'] ?? 0) <= $agora && $j['team'] !== $eu['team']) {
              $alvoOk = true;
              break;
            }
          }
          if (!$alvoOk) continue;
          $sala['eventos'][] = [$sala['proxSeq']++, $agora, 'hit', $alvoNome, $dano, $eu['nome']];
        } elseif ($ev[0] === 'morri') {
          if (($eu['derretidoAteMs'] ?? 0) > $agora) continue;
          $autorNome = is_string($ev[1] ?? null) ? $ev[1] : '';
          $eu['mortes'] = ($eu['mortes'] ?? 0) + 1;
          $eu['derretidoAteMs'] = $agora + RESPAWN_MS;
          foreach ($sala['jogadores'] as $tk => $j) {
            if ($j['nome'] === $autorNome && $j['team'] !== $eu['team']) {
              $sala['jogadores'][$tk]['kills'] = ($j['kills'] ?? 0) + 1;
              break;
            }
          }
          $sala['eventos'][] = [$sala['proxSeq']++, $agora, 'morreu', $eu['nome'], $autorNome];
        }
      }
    }
    unset($eu);

    $corte = $agora - EVENTO_TTL_MS;
    $sala['eventos'] = array_values(array_filter($sala['eventos'], fn($ev) => $ev[1] >= $corte));

    escreverSala($codigo, $sala);
    return respostaSync($sala, $token, $agora, $desde);
  });
  echo json_encode($resp, JSON_UNESCAPED_UNICODE);
  exit;
}

if ($acao === 'sair') {
  comLock($codigo, function () use ($codigo, $token) {
    $sala = lerSala($codigo);
    if ($sala === null) return;
    unset($sala['jogadores'][$token]);
    if (count($sala['jogadores']) === 0) {
      apagarSala($codigo);
    } else {
      escreverSala($codigo, $sala);
    }
  });
  echo json_encode(['ok' => true]);
  exit;
}

falha(400, 'ação desconhecida');
