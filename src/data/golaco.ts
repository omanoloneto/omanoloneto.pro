// ============================================================
//  Dados do jogo Golaço! (estilo Winning Eleven de PS2)
//  EDITE AQUI times, formação, tempo e dificuldade.
// ============================================================

export const config = {
  // Canvas (tela) e mundo (campo em "unidades de mundo")
  canvasL: 960,
  canvasA: 540,
  campoL: 2200,
  campoA: 1300,
  margem: 60,
  bocaGol: 200,
  fundoGol: 34,

  // Câmera de TV: janela visível (unidades de mundo) e achatamento vertical
  camJanela: 1100,
  camSquash: 0.62,

  // Física
  raioJogador: 13,
  raioBola: 8,
  velJogador: 3.1,
  velComBola: 2.6,  // quem carrega corre um pouco menos
  atritoBola: 0.985,
  forcaChute: 11,
  // passe rasteiro: força = base + distância × fator (chega "na medida":
  // com atrito 0.985 a bola percorre ~(v−vDominio)/0.015 unidades)
  forcaPasseBase: 4.0,
  forcaPassePorDist: 0.016,
  forcaPasseMax: 12.5,
  // bola mais rápida que isso ninguém de linha domina (passes chegam a ~5,
  // chutes saem a 10+ e só o goleiro para)
  velDominio: 5.5,
  distDominio: 20,
  distRoubo: 17,
  alturaDominio: 24, // bola mais alta que isso, jogador de linha não alcança

  // Partida
  minutosPorTempo: 2,

  // Formação 4-3-3 — [profundidade 0..1 a partir do próprio gol, altura -1..1]
  formacao: [
    [0.16, -0.55], [0.13, -0.18], [0.13, 0.18], [0.16, 0.55],   // defesa
    [0.37, -0.42], [0.33, 0], [0.37, 0.42],                     // meio
    [0.6, -0.52], [0.63, 0], [0.6, 0.52],                       // ataque
  ],

  timeJogador: { nome: 'Felinos FC', curto: 'FEL', emoji: '😼', cor: '#2f6fd0', corClara: '#e8c53a', pele: '#f2c9a0' },
  timeCpu: { nome: 'Robôs FC', curto: 'ROB', emoji: '🤖', cor: '#d04a3a', corClara: '#3ac48f', pele: '#cfd6dd' },

  // Dificuldade dos robôs por modo (reacao/passe = chance POR QUADRO)
  // velGoleiro baixo de propósito: deslocar o goleiro e chutar na trave
  // oposta é A jogada do jogo — e chutar de perto é quase gol.
  modos: {
    amistoso: { velCpu: 2.3, reacaoCpu: 0.02, chuteCpu: 8.5, velGoleiro: 2.4, passeCpu: 0.025 },
    decisao: { velCpu: 2.95, reacaoCpu: 0.05, chuteCpu: 10.2, velGoleiro: 2.8, passeCpu: 0.05 },
  },
} as const;

// Frases do narrador — aparecem no toast em momentos da partida.
export const narrador = {
  gol: ['GOOOOOL! ⚽🎉', 'GOLAÇO! Que pintura! 🖼️', 'É GOL! A torcida foi ao delírio! 📣'],
  golSofrido: ['Golpe duro… os Robôs marcaram. 🤖', 'Gol deles. Bora virar! 💪', 'Opa! Vacilou, levou. 🤖⚽'],
  defesa: ['UUUH! Que defesa! 🧤', 'O goleiro pegou! 🧤'],
  intervalo: 'Intervalo! Água, laranja e tática. 🍊',
  fimVitoria: '🏆 VITÓRIA DOS FELINOS!',
  fimDerrota: '😿 Dessa vez os Robôs levaram…',
  fimEmpate: '🤝 Empate! Ninguém perdeu, ninguém ganhou.',
};
