// ============================================================
//  Dados do jogo Golaço! — EDITE AQUI times, tempo e dificuldade.
// ============================================================

export const config = {
  // Canvas interno (o CSS redimensiona mantendo a proporção).
  largura: 960,
  altura: 528,
  // Margem do gramado até a linha do campo.
  margem: 40,
  // Boca do gol (altura da abertura) e profundidade da rede.
  bocaGol: 128,
  fundoGol: 26,

  // Física
  raioJogador: 12,
  raioBola: 7,
  velJogador: 2.7,
  velComBola: 2.25, // quem carrega a bola corre um pouco menos (dá jogo ao ataque e à defesa)
  atritoBola: 0.982,
  forcaChute: 9.4,
  distDominio: 17,  // perto assim, o jogador "cola" a bola no pé
  distRoubo: 15,    // perto assim de quem tem a bola, dá pra desarmar

  // Partida
  minutosPorTempo: 2, // minutos reais de cada tempo (2 tempos)

  // Times (nomes curtos aparecem no placar)
  timeJogador: { nome: 'Felinos FC', curto: 'FEL', emoji: '😼', cor: '#2f6fd0', corClara: '#7fa8e8' },
  timeCpu: { nome: 'Robôs FC', curto: 'ROB', emoji: '🤖', cor: '#d04a3a', corClara: '#e89a90' },

  // Dificuldade dos robôs por modo (reacaoCpu = chance de chute POR QUADRO,
  // então valores pequenos: 0.02 ≈ chuta em ~1s quando na zona de chute)
  // velGoleiro baixo de propósito: chute rápido no canto oposto ao goleiro
  // entra — deslocar o goleiro e chutar no outro canto é A jogada do jogo.
  modos: {
    amistoso: { velCpu: 1.9, reacaoCpu: 0.02, chuteCpu: 6.8, velGoleiro: 2.0 },
    decisao: { velCpu: 2.45, reacaoCpu: 0.05, chuteCpu: 8.2, velGoleiro: 2.3 },
  },
} as const;

// Frases do narrador — aparecem no toast em momentos da partida.
export const narrador = {
  gol: ['GOOOOOL! ⚽🎉', 'GOLAÇO! Que pintura! 🖼️', 'É GOL! A torcida foi ao delírio! 📣'],
  golSofrido: ['Golpe duro… os Robôs marcaram. 🤖', 'Gol deles. Bora virar! 💪', 'Opa! Vacilou, levou. 🤖⚽'],
  intervalo: 'Intervalo! Água, laranja e tática. 🍊',
  fimVitoria: '🏆 VITÓRIA DOS FELINOS!',
  fimDerrota: '😿 Dessa vez os Robôs levaram…',
  fimEmpate: '🤝 Empate! Ninguém perdeu, ninguém ganhou.',
};
