<?php
// Persiste o mapa do Overdrive (editor 3D). GET devolve o mapa publicado;
// POST { senha, mapa } grava (com senha). Sem re-deploy: o POST grava o JSON
// que o GET serve. Chaves de dados em pt-BR (formato do mapa do jogo).
declare(strict_types=1);

require __DIR__ . '/rooms-lib.php';

const DIR_OVERDRIVE = __DIR__ . '/overdrive';
const ARQ_MAPA = DIR_OVERDRIVE . '/mapa.json';
const SENHA = 'saoleo2026';

sendJsonHeaders();
$metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($metodo === 'GET') {
  $dados = readJson(ARQ_MAPA);
  echo json_encode($dados ?? new stdClass(), JSON_UNESCAPED_UNICODE);
  exit;
}

if ($metodo !== 'POST') fail(405, 'método não permitido');

[$body] = readJsonBody();
if (($body['senha'] ?? '') !== SENHA) fail(403, 'senha incorreta');
$mapa = $body['mapa'] ?? null;
if (!is_array($mapa) || !isset($mapa['vias']) || !is_array($mapa['vias'])) fail(400, 'mapa inválido');

if (!is_dir(DIR_OVERDRIVE)) @mkdir(DIR_OVERDRIVE, 0755, true);
$salvoMs = nowMs();
withLock(ARQ_MAPA, function () use ($mapa, $salvoMs) {
  writeJson(ARQ_MAPA, ['mapa' => $mapa, 'salvoMs' => $salvoMs], 'não consegui gravar o mapa — tenta de novo?');
});
echo json_encode(['ok' => true, 'salvoMs' => $salvoMs], JSON_UNESCAPED_UNICODE);
