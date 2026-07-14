// MineBlocks — definições dos blocos e configuração do mundo.
// Editar aqui muda o jogo sem tocar na engine (src/games/mineblocks/).

export type RenderBloco = 'cubo' | 'cruz' | 'agua' | 'recorte';

export interface Bloco {
  id: number;
  nome: string; // pra anunciar() e balãozinho da hotbar
  // índices no atlas 4×4 (16 tiles de 16px): [topo, lado, base]
  tiles: [number, number, number];
  solido: boolean; // colide com o jogador
  render: RenderBloco;
}

export const blocos: Bloco[] = [
  { id: 0, nome: 'ar', tiles: [0, 0, 0], solido: false, render: 'cubo' },
  { id: 1, nome: 'grama', tiles: [0, 1, 2], solido: true, render: 'cubo' },
  { id: 2, nome: 'terra', tiles: [2, 2, 2], solido: true, render: 'cubo' },
  { id: 3, nome: 'pedra', tiles: [3, 3, 3], solido: true, render: 'cubo' },
  { id: 4, nome: 'areia', tiles: [4, 4, 4], solido: true, render: 'cubo' },
  { id: 5, nome: 'tronco', tiles: [6, 5, 6], solido: true, render: 'cubo' },
  { id: 6, nome: 'tábuas', tiles: [7, 7, 7], solido: true, render: 'cubo' },
  // folhas opacas de propósito (estilo "fast graphics"): cull entre vizinhas, zero blend
  { id: 7, nome: 'folhas', tiles: [8, 8, 8], solido: true, render: 'cubo' },
  { id: 8, nome: 'vidro', tiles: [9, 9, 9], solido: true, render: 'recorte' },
  { id: 9, nome: 'tijolos', tiles: [10, 10, 10], solido: true, render: 'cubo' },
  { id: 10, nome: 'pedregulho', tiles: [11, 11, 11], solido: true, render: 'cubo' },
  { id: 11, nome: 'flor amarela', tiles: [12, 12, 12], solido: false, render: 'cruz' },
  { id: 12, nome: 'flor vermelha', tiles: [13, 13, 13], solido: false, render: 'cruz' },
  // água só existe no mundo (não colocável no v1 — física de água espalhando é armadilha)
  { id: 13, nome: 'água', tiles: [14, 14, 14], solido: false, render: 'agua' },
  { id: 14, nome: 'rocha-mãe', tiles: [15, 15, 15], solido: true, render: 'cubo' },
];

// ordem dos 12 slots da hotbar (ids de blocos colocáveis)
export const hotbar = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export const config = {
  mundo: {
    SX: 96,
    SZ: 96,
    SY: 40,
    CHUNK: 16, // 6×6 chunks de coluna inteira
    nivelAgua: 10,
    tetoConstrucao: 37, // dá pra ficar em pé no bloco mais alto (37+1+1.8 ≤ 40)
  },
  geracao: {
    alturaBase: 12,
    amplitude: 6.5,
    escalaRuido: 0.035,
    // ilha: o terreno afunda do raio de início até a borda
    ilhaInicioR: 0.68, // fração da meia-largura onde começa a cair
    ilhaQueda: 11, // quantos blocos afunda até a borda
    arvores: 55, // tentativas (nem toda posição serve)
    flores: 150,
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
  salvar: {
    api: '/class/api/mundos.php',
    debounceMs: 20000, // auto-save 20s após o último bloco editado
    minEntreSavesMs: 5000,
    maxPayload: 700000,
  },
  camera: { fov: 75, sensibilidade: 0.0024, sensTouch: 0.0044 },
  somLigadoInicial: true,
};
