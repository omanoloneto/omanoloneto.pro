// MineBlocks — definições dos blocos e configuração do mundo.
// Editar aqui muda o jogo sem tocar na engine (src/games/mineblocks/).

export type RenderBloco = 'cubo' | 'cruz' | 'agua' | 'recorte' | 'porta';

export interface Bloco {
  id: number;
  nome: string; // pra anunciar() e balãozinho da hotbar
  // índices no atlas 4×4 (16 tiles de 16px): [topo, lado, base]
  tiles: [number, number, number];
  solido: boolean; // colide com o jogador
  render: RenderBloco;
  // sobrevivência: qual ITEM cai ao quebrar (estilo Minecraft:
  // pedra → pedregulho, grama → terra). Ausente = dropa ele mesmo;
  // 0 = não dropa nada.
  drop?: number;
  // drop de sorte: chance de cair um item EXTRA (folhas → muda de árvore)
  dropSorte?: { id: number; chance: number };
  // quanto tempo segurando pra quebrar (ms); ausente = não quebra (rocha-mãe, água)
  dureza?: number;
  durezaPicareta?: number;
  durezaFerro?: number;
  precisaPicareta?: boolean;
  ferramenta?: boolean;
}

export const blocos: Bloco[] = [
  { id: 0, nome: 'ar', tiles: [0, 0, 0], solido: false, render: 'cubo' },
  { id: 1, nome: 'grama', tiles: [0, 1, 2], solido: true, render: 'cubo', drop: 2, dureza: 550 },
  { id: 2, nome: 'terra', tiles: [2, 2, 2], solido: true, render: 'cubo', dureza: 500 },
  { id: 3, nome: 'pedra', tiles: [3, 3, 3], solido: true, render: 'cubo', drop: 10, dureza: 1300, durezaPicareta: 400, durezaFerro: 150 },
  { id: 4, nome: 'areia', tiles: [4, 4, 4], solido: true, render: 'cubo', dureza: 450 },
  { id: 5, nome: 'tronco', tiles: [6, 5, 6], solido: true, render: 'cubo', dureza: 800 },
  { id: 6, nome: 'tábuas', tiles: [7, 7, 7], solido: true, render: 'cubo', dureza: 800 },
  // folhas opacas de propósito (estilo "fast graphics"): cull entre vizinhas, zero blend.
  // Naturais (id 7): dropam folhas E às vezes uma muda; DECAEM sem tronco conectado.
  { id: 7, nome: 'folhas', tiles: [8, 8, 8], solido: true, render: 'cubo', dropSorte: { id: 15, chance: 0.3 }, dureza: 300 },
  { id: 8, nome: 'vidro', tiles: [9, 9, 9], solido: true, render: 'recorte', dureza: 350 },
  { id: 9, nome: 'tijolos', tiles: [10, 10, 10], solido: true, render: 'cubo', dureza: 1400, durezaPicareta: 450, durezaFerro: 200 },
  { id: 10, nome: 'pedregulho', tiles: [11, 11, 11], solido: true, render: 'cubo', dureza: 1100, durezaPicareta: 350, durezaFerro: 150 },
  { id: 11, nome: 'flor amarela', tiles: [12, 12, 12], solido: false, render: 'cruz', dureza: 350 },
  { id: 12, nome: 'flor vermelha', tiles: [13, 13, 13], solido: false, render: 'cruz', dureza: 350 },
  // água só existe no mundo (não colocável no v1 — física de água espalhando é armadilha)
  { id: 13, nome: 'água', tiles: [14, 14, 14], solido: false, render: 'agua' },
  { id: 14, nome: 'rocha-mãe', tiles: [15, 15, 15], solido: true, render: 'cubo' },
  // muda: cai das folhas, planta em grama/terra e vira árvore
  { id: 15, nome: 'muda de árvore', tiles: [16, 16, 16], solido: false, render: 'cruz', dureza: 350 },
  // folhas COLOCADAS pela criança: mesma cara, mas nunca decaem e devolvem
  // o item ao quebrar (sem sorte de muda — anti-farm infinita)
  { id: 16, nome: 'folhas', tiles: [8, 8, 8], solido: true, render: 'cubo', drop: 7, dureza: 300 },
  // baú: guarda itens, pertence a quem colocou (metadata por posição)
  { id: 17, nome: 'baú', tiles: [20, 21, 21], solido: true, render: 'cubo', dureza: 800 },
  // porta: painel fino de 2 blocos (as 2 metades compartilham o id; a
  // metade base/topo sai dos vizinhos verticais no render). Fechada =
  // sólida; aberta = atravessável (só no mundo, fora de `itens`; quebrar
  // qualquer estado/metade devolve 1 porta fechada)
  { id: 18, nome: 'porta', tiles: [22, 22, 22], solido: true, render: 'porta', dureza: 700 },
  { id: 19, nome: 'porta aberta', tiles: [23, 23, 23], solido: false, render: 'porta', drop: 18, dureza: 700 },
  // placa: mostra uma mensagem (texto na metadata); só o autor reescreve
  { id: 20, nome: 'placa', tiles: [24, 24, 24], solido: false, render: 'cruz', dureza: 300 },
  // lã: dropada pelo Winpup no chão (tufo não-sólido). NÃO entra em `itens`
  // (criança não coloca) — passar por cima coleta como recurso (materiais)
  { id: 21, nome: 'lã', tiles: [25, 25, 25], solido: false, render: 'cruz', drop: 21, dureza: 200 },
  { id: 22, nome: 'carvão', tiles: [26, 26, 26], solido: true, render: 'cubo', drop: 23, dureza: 600, durezaFerro: 250, precisaPicareta: true },
  { id: 23, nome: 'carvão', tiles: [27, 27, 27], solido: false, render: 'cruz' },
  { id: 24, nome: 'picareta de madeira', tiles: [28, 28, 28], solido: false, render: 'cruz', ferramenta: true },
  { id: 25, nome: 'minério de ferro', tiles: [29, 29, 29], solido: true, render: 'cubo', dureza: 900, durezaFerro: 350, precisaPicareta: true },
  { id: 26, nome: 'barra de ferro', tiles: [30, 30, 30], solido: false, render: 'cruz' },
  { id: 27, nome: 'fornalha', tiles: [3, 31, 3], solido: true, render: 'cubo', dureza: 1400, durezaPicareta: 450, durezaFerro: 200 },
  { id: 28, nome: 'picareta de ferro', tiles: [32, 32, 32], solido: false, render: 'cruz', ferramenta: true },
];

// tipos de item coletáveis (grade do inventário/E); a hotbar agora é
// dinâmica: 9 slots vazios que enchem conforme a criança coleta
export const itens = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 17, 18, 20, 24, 27, 28];

// materiais = recursos SÓ-coletáveis (não colocáveis): o jogador junta e
// fabrica coisas depois. Aparecem numa seção própria do inventário.
export const materiais = [21, 23, 25, 26];

// craft simples da sobrevivência: toca na receita e transforma
// (sem mesa, sem grade — proporcional a criança de 6 anos)
export interface Receita {
  de: number; // id do material
  qtd: number; // quantos consome
  para: number; // id do resultado
  ganha: number; // quantos entrega
  de2?: number;
  qtd2?: number;
  fornalha?: boolean;
}
export const receitas: Receita[] = [
  { de: 5, qtd: 1, para: 6, ganha: 4 }, // 1 tronco → 4 tábuas
  { de: 10, qtd: 2, para: 9, ganha: 1 }, // 2 pedregulhos → 1 tijolos
  { de: 2, qtd: 1, para: 1, ganha: 1 }, // 1 terra → 1 grama (plantou, cresceu!)
  { de: 6, qtd: 2, para: 17, ganha: 1 }, // 2 tábuas → 1 baú
  { de: 6, qtd: 2, para: 18, ganha: 1 }, // 2 tábuas → 1 porta
  { de: 6, qtd: 1, para: 20, ganha: 1 }, // 1 tábua → 1 placa
  { de: 6, qtd: 3, para: 24, ganha: 1 },
  { de: 10, qtd: 8, para: 27, ganha: 1 },
  { de: 4, qtd: 1, para: 8, ganha: 1, fornalha: true }, // 1 areia → 1 vidro
  { de: 10, qtd: 1, para: 3, ganha: 1, fornalha: true }, // 1 pedregulho → 1 pedra
  { de: 25, qtd: 1, de2: 23, qtd2: 1, para: 26, ganha: 1, fornalha: true },
  { de: 26, qtd: 3, de2: 6, qtd2: 2, para: 28, ganha: 1, fornalha: true },
];

export const config = {
  mundo: {
    SX: 384,
    SZ: 384,
    SY: 80,
    CHUNK: 16, // 24×24 chunks de coluna inteira
    nivelAgua: 50,
    tetoConstrucao: 77, // dá pra ficar em pé no bloco mais alto (77+1+1.8 ≤ 80)
  },
  geracao: {
    // superfície fica no alto (base 52 de 80): metade de baixo é subsolo
    // minerável — a "profundidade dobrada" pedida pelo Manolo
    alturaBase: 52,
    amplitude: 6.5,
    escalaRuido: 0.035,
    // ilha: o terreno afunda do raio de início até a borda
    ilhaInicioR: 0.68, // fração da meia-largura onde começa a cair
    ilhaQueda: 11, // quantos blocos afunda até a borda
    arvores: 880, // tentativas (nem toda posição serve)
    flores: 2400,
    dungeon: { salas: 7, carvaoPorSala: 10, ferroPorSala: 5 },
    // veios aleatórios no subsolo (fora da dungeon): carvão em qualquer
    // profundidade, ferro só na metade mais funda
    veins: {
      coal: { n: 1400, sizeMin: 3, sizeMax: 6, yMin: 2 },
      iron: { n: 700, sizeMin: 2, sizeMax: 5, yMin: 2, yMax: 34 },
    },
  },
  fisica: {
    gravidade: 25,
    pulo: 8.2, // ~1,25 bloco de altura
    andar: 4.3,
    coyoteMs: 100,
    // água: tudo mais lento e macio
    aguaFator: 0.55,
    aguaGravidade: 8,
    aguaAfundaMax: 3,
    aguaNado: 3.6, // segurar pulo nada pra cima
    aguaPuloBorda: 5.6, // impulso pra sair da água na beirada
    quedaTerminal: 20,
    subpassoMax: 0.45, // anti-tunneling
  },
  jogador: { largura: 0.6, altura: 1.8, olho: 1.62, alcance: 6 },
  // muda plantada vira árvore depois de um tempinho (em tempo de simulação)
  crescimento: { minMs: 20000, maxMs: 40000 },
  hotbarTamanho: 9,
  // Winpup (1º bicho): flutua, vagueia devagar e solta lã de dia
  bichos: {
    quantos: 8,
    altura: 1.4, // paira esse tanto acima do chão
    bobAmp: 0.18, // amplitude do balanço vertical
    bobHz: 0.5, // ciclos por segundo do bob
    passeio: 1.1, // velocidade do wander (blocos/s)
    trocaAlvoMin: 3000, // ms: repensa o destino a cada 3-7s
    trocaAlvoMax: 7000,
    raioPasseio: 10, // não se afasta muito do ponto de origem
    larguraDropMin: 22000, // ms entre lãs (de dia): 22-38s
    larguraDropMax: 38000,
    maxLaPerto: 5, // não dropa se já tem 5 tufos por perto (raio 6)
    woolDespawnMs: 60000, // lã não pega em 1 min some (não entulha o mapa)
  },
  kotsooh: {
    quantos: 3,
    velPasseio: 1.3,
    velCaca: 3.6,
    alturaVoo: 1.6,
    alcanceBatida: 1.2,
    empurrao: 7,
    pulinho: 4.5,
    cooldownBatidaMs: 2600,
    abrigoS: 1.5,
    desisteDist: 55,
    olharDistMax: 40,
    olharConeJogador: 0.978,
    olharConeFantasma: 0.42,
    encararS: 0.35,
    recuoS: 8,
    trocaAlvoMinMs: 4000,
    trocaAlvoMaxMs: 9000,
    passeioMin: 8,
    passeioMax: 20,
    uivoMinMs: 9000,
    uivoMaxMs: 16000,
  },
  // folhas órfãs: espera antes de cair (decay em cascata, estilo Minecraft)
  decay: { atrasoMinMs: 400, atrasoMaxMs: 2900, chanceMuda: 0.15, alcanceTronco: 6 },
  salvar: {
    api: '/class/api/mundos.php',
    debounceMs: 12000, // auto-save após o último bloco editado
    minEntreSavesMs: 5000,
    maxPayload: 4000000,
  },
  // multiplayer por sala (mb-salas.php): snapshot + diário de edições,
  // polling puro — funciona de qualquer casa, sem rede local
  sala: {
    api: '/class/api/mb-salas.php',
    pollMs: 1200,
    jitterMs: 200, // dessincroniza a turma (ninguém bate no servidor junto)
    nudgeMs: 250, // 1ª edição na fila apressa o próximo sync
    maxEdicoesPorSync: 200,
    maxMetasPorSync: 64, // teto do servidor (MAX_METAS_POR_SYNC) — não estourar
    // compactação: o anfitrião manda uma foto nova quando o diário engorda
    fotoACadaEdicoes: 400,
    fotoJournalMin: 200,
    fotoMetaMin: 300, // ou quando o diário de metadata (baú/placa) engorda
    fotoACadaMs: 90000,
    nomeMin: 2,
    nomeMax: 10,
  },
  codigo: { tam: 5, charset: 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' },
  camera: { fov: 75, sensibilidade: 0.0024, sensTouch: 0.0044 },
  somLigadoInicial: true,
};
