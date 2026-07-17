<?php
// ============================================================
//  Ranking online dos jogos de /class/games.
//
//  GET  ranking.php?jogo=letras-espaciais
//       → JSON com o top 10 do jogo
//  POST ranking.php   body: {"jogo","nome","pontos","nivel"}
//       → valida, grava e devolve o top 10 atualizado
//
//  Dados ficam em ranking-<jogo>.json neste diretório (o .htaccess
//  bloqueia acesso direto). Pra zerar um ranking: suba um arquivo
//  com "[]" por FTP.
//
//  Pra adicionar um jogo novo: inclua a chave em JOGOS abaixo com
//  [pontuação máxima plausível, nível/fase máxima].
// ============================================================

declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

const JOGOS = [
  // jogo => [maxPontos, maxNivel] — teto de sanidade contra POST forjado
  'letras-espaciais' => [20000, 30],
  'caca-bandeiras' => [12000, 10],
  'entrega-turbo' => [60000, 20],
  // Trem de Palavras — modo Fácil (arcade endless). nivel = produtos entregues.
  'trem-de-palavras-facil' => [99999, 999],
  'sugar-splash' => [99999, 99],
  'sugar-splash-multi' => [99999, 99],
  'eco-hero' => [99999, 99],
];
const MAX_ENTRADAS = 10;

function falha(int $code, string $msg): void {
  http_response_code($code);
  echo json_encode(['erro' => $msg]);
  exit;
}

function arquivo(string $jogo): string {
  return __DIR__ . '/ranking-' . $jogo . '.json';
}

$metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($metodo === 'GET') {
  $jogo = $_GET['jogo'] ?? '';
  if (!isset(JOGOS[$jogo])) falha(400, 'jogo inválido');
  $f = arquivo($jogo);
  echo is_file($f) ? (file_get_contents($f) ?: '[]') : '[]';
  exit;
}

if ($metodo !== 'POST') falha(405, 'método não permitido');

$corpo = json_decode(file_get_contents('php://input') ?: '', true);
if (!is_array($corpo)) falha(400, 'JSON inválido');

$jogo = $corpo['jogo'] ?? '';
if (!isset(JOGOS[$jogo])) falha(400, 'jogo inválido');
[$maxPontos, $maxNivel] = JOGOS[$jogo];

$nome = $corpo['nome'] ?? '';
if (!is_string($nome) || !preg_match('/^[A-Z0-9]{2,6}$/', $nome)) falha(400, 'nome inválido');

$pontos = $corpo['pontos'] ?? null;
if (!is_int($pontos) || $pontos < 0 || $pontos > $maxPontos) falha(400, 'pontos inválidos');

$nivel = $corpo['nivel'] ?? null;
if (!is_int($nivel) || $nivel < 1 || $nivel > $maxNivel) falha(400, 'nível inválido');

// opcional: marca de modo difícil (🔥 no Caça-Bandeiras)
$dificil = ($corpo['dificil'] ?? false) === true;

$f = arquivo($jogo);
$fp = fopen($f, 'c+');
if ($fp === false || !flock($fp, LOCK_EX)) falha(500, 'não consegui gravar');

$lista = json_decode(stream_get_contents($fp) ?: '[]', true);
if (!is_array($lista)) $lista = [];

$entrada = ['nome' => $nome, 'pontos' => $pontos, 'nivel' => $nivel, 'data' => gmdate('Y-m-d')];
if ($dificil) $entrada['dificil'] = true;
$lista[] = $entrada;
usort($lista, fn($a, $b) => $b['pontos'] <=> $a['pontos']);
$lista = array_slice($lista, 0, MAX_ENTRADAS);

rewind($fp);
ftruncate($fp, 0);
fwrite($fp, json_encode($lista, JSON_UNESCAPED_UNICODE));
fflush($fp);
flock($fp, LOCK_UN);
fclose($fp);

echo json_encode($lista, JSON_UNESCAPED_UNICODE);
