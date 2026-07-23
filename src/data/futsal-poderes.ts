export type PoderTipo = 'superChute' | 'dribleTurbo' | 'defesaca';

export interface Poder {
  nome: string;
  tipo: PoderTipo;
  cor: string;
}

export interface Crianca {
  nome: string;
  numero: number;
  goleiro?: boolean;
  pele: string;
  cabelo: string;
  poder: Poder;
}

export interface TimeData {
  nome: string;
  cor: string;
  corDetalhe: string;
  criancas: Crianca[];
}

const pele = ['#f2c79a', '#d99b6c', '#a6683f', '#8a5a3b', '#eab38a'];
const cabelo = ['#2a2018', '#5a3a1a', '#111014', '#7a4a20', '#c9a24a'];

export const times: TimeData[] = [
  {
    nome: 'Cometas',
    cor: '#2f6fd0',
    corDetalhe: '#eaf2ff',
    criancas: [
      { nome: 'Pipoca', numero: 1, goleiro: true, pele: pele[0], cabelo: cabelo[4], poder: { nome: 'Muralha de Vidro', tipo: 'defesaca', cor: '#7fd6ff' } },
      { nome: 'Foguetinho', numero: 10, pele: pele[1], cabelo: cabelo[1], poder: { nome: 'Chute Cometa', tipo: 'superChute', cor: '#ff7a2f' } },
      { nome: 'Ventania', numero: 7, pele: pele[0], cabelo: cabelo[0], poder: { nome: 'Arranque Furacão', tipo: 'dribleTurbo', cor: '#5affc8' } },
      { nome: 'Trovão', numero: 9, pele: pele[2], cabelo: cabelo[2], poder: { nome: 'Bomba Trovão', tipo: 'superChute', cor: '#ffd23f' } },
      { nome: 'Estrelinha', numero: 8, pele: pele[4], cabelo: cabelo[3], poder: { nome: 'Pirueta Estrela', tipo: 'dribleTurbo', cor: '#ff5ea8' } },
    ],
  },
  {
    nome: 'Vulcões',
    cor: '#d23b3b',
    corDetalhe: '#ffecec',
    criancas: [
      { nome: 'Portão', numero: 1, goleiro: true, pele: pele[3], cabelo: cabelo[2], poder: { nome: 'Paredão de Lava', tipo: 'defesaca', cor: '#ff9a3f' } },
      { nome: 'Relâmpago', numero: 11, pele: pele[1], cabelo: cabelo[0], poder: { nome: 'Zigue-zague', tipo: 'dribleTurbo', cor: '#a0e0ff' } },
      { nome: 'Vulcão', numero: 9, pele: pele[2], cabelo: cabelo[2], poder: { nome: 'Chute Vulcânico', tipo: 'superChute', cor: '#ff5a2f' } },
      { nome: 'Gelo', numero: 4, pele: pele[0], cabelo: cabelo[4], poder: { nome: 'Deslize', tipo: 'dribleTurbo', cor: '#bfe8ff' } },
      { nome: 'Rocha', numero: 5, pele: pele[3], cabelo: cabelo[1], poder: { nome: 'Canhão de Pedra', tipo: 'superChute', cor: '#caa06a' } },
    ],
  },
];

export const config = {
  campo: { comprimento: 62, largura: 38, muroAltura: 3, golVao: 9, golAltura: 3.2, golFundo: 3 },
  jogador: { raio: 1.15, accel: 62, velMax: 15, velGoleiro: 12, atrito: 8, sprintMul: 1.5, alcanceBola: 2.0 },
  bola: { raio: 0.5, atrito: 1.05, quique: 0.72, gravidade: 26, quiqueChao: 0.55, passe: 20, chuteMin: 16, chuteMax: 34, cargaS: 0.9, lob: 0.28 },
  camera: { altura: 26, distancia: 34, lag: 5.5, tilt: 0.16, olhaFrente: 6, seguirZ: 0.55 },
  partida: { duracaoS: 150, avisoS: 15 },
  poder: { energiaMax: 100, recargaPorS: 14, ganhoAcao: 8, custo: 100, superChuteMul: 1.7, dribleMul: 2.1, dribleS: 1.2, defesacaAlcance: 2.4, defesacaS: 3 },
  ia: { reacao: 0.16, alcanceChute: 20, erro: 0.18, marcacao: 0.7 },
  cores: {
    ceu: '#bfe3ff',
    neblina: '#cfeaff',
    piso: '#3f9a52',
    pisoFaixa: '#37894a',
    linha: '#eef6ee',
    muro: '#dfe6ee',
    muroTopo: '#b9c2cc',
    rede: '#eef2f6',
    bola: '#f4f4f2',
    bolaDetalhe: '#20242c',
    sombra: 'rgba(0,0,0,0.22)',
  },
  ranking: { api: '/class/api/ranking.php', jogo: 'futsal-poderes', max: 10, nomeMin: 2, nomeMax: 6 },
  somLigadoInicial: true,
};
