// ============================================================
//  Jogo "Trem de Palavras" — montar palavras com vagões-sílaba.
//  Público: crianças ~8 anos (2º/3º ano). Palavras comuns, sem acento,
//  divididas em sílabas simples. Cada palavra tem um emoji (a "carga"
//  que espera na estação). EDITE livremente.
// ============================================================

export type Palavra = {
  // palavra completa em MAIÚSCULAS (validação = junção das sílabas)
  palavra: string;
  // sílabas na ordem (viram vagões)
  silabas: string[];
  // figura da carga esperando na estação
  emoji: string;
};

export type Nivel = {
  id: string;
  nome: string;
  // 'guiado' = cargas com figura na estação; 'livre' = sem figuras, vale
  // qualquer palavra do dicionário (palavras + palavrasExtras).
  modo: 'guiado' | 'livre';
  // guiado: quantas cargas sortear. livre: meta de palavras válidas.
  palavras: number;
  // guiado: tamanhos (nº de sílabas) permitidos neste nível.
  tamanhos?: number[];
  // guiado: vagões extras que não servem (dificuldade).
  distratores?: number;
  // livre: tamanho aproximado do pátio de sílabas.
  silabasPatio?: number;
};

export const config = {
  // pontos = sílabas da palavra × este valor (palavra maior vale mais)
  pontosPorSilaba: 10,
  somLigadoInicial: true,
} as const;

// Rampa dupla: quantidade de palavras E tamanho crescem juntos.
// Último nível é livre: o aluno inventa as palavras, o jogo valida.
export const niveis: Nivel[] = [
  { id: 'nivel-1', nome: 'Primeira viagem', modo: 'guiado', palavras: 1, tamanhos: [2], distratores: 1 },
  { id: 'nivel-2', nome: 'Duas cargas', modo: 'guiado', palavras: 2, tamanhos: [2], distratores: 2 },
  { id: 'nivel-3', nome: 'Pegando ritmo', modo: 'guiado', palavras: 3, tamanhos: [2, 3], distratores: 2 },
  { id: 'nivel-4', nome: 'Palavras médias', modo: 'guiado', palavras: 4, tamanhos: [3], distratores: 3 },
  { id: 'nivel-5', nome: 'Trem comprido', modo: 'guiado', palavras: 5, tamanhos: [3, 4], distratores: 3 },
  { id: 'nivel-6', nome: 'Super maquinista', modo: 'guiado', palavras: 6, tamanhos: [2, 3, 4], distratores: 4 },
  { id: 'nivel-7', nome: 'Estação Livre', modo: 'livre', palavras: 5, silabasPatio: 14 },
];

// Sílabas que nunca formam as cargas — só pra dificultar.
export const distratores: string[] = [
  'ZU', 'XA', 'NHO', 'LHE', 'QUE', 'GRA', 'TRI', 'PLO', 'FRU', 'BLA', 'CRE', 'DRI',
];

export const palavras: Palavra[] = [
  // ---------------- 2 sílabas ----------------
  { palavra: 'BOLA',   silabas: ['BO', 'LA'], emoji: '⚽' },
  { palavra: 'CASA',   silabas: ['CA', 'SA'], emoji: '🏠' },
  { palavra: 'GATO',   silabas: ['GA', 'TO'], emoji: '🐱' },
  { palavra: 'SAPO',   silabas: ['SA', 'PO'], emoji: '🐸' },
  { palavra: 'PATO',   silabas: ['PA', 'TO'], emoji: '🦆' },
  { palavra: 'VACA',   silabas: ['VA', 'CA'], emoji: '🐮' },
  { palavra: 'RATO',   silabas: ['RA', 'TO'], emoji: '🐭' },
  { palavra: 'LOBO',   silabas: ['LO', 'BO'], emoji: '🐺' },
  { palavra: 'MALA',   silabas: ['MA', 'LA'], emoji: '🧳' },
  { palavra: 'PIPA',   silabas: ['PI', 'PA'], emoji: '🪁' },
  { palavra: 'SOPA',   silabas: ['SO', 'PA'], emoji: '🍲' },
  { palavra: 'SUCO',   silabas: ['SU', 'CO'], emoji: '🧃' },
  { palavra: 'BOLO',   silabas: ['BO', 'LO'], emoji: '🎂' },
  { palavra: 'VELA',   silabas: ['VE', 'LA'], emoji: '🕯️' },
  { palavra: 'MOTO',   silabas: ['MO', 'TO'], emoji: '🏍️' },
  { palavra: 'ROSA',   silabas: ['RO', 'SA'], emoji: '🌹' },
  { palavra: 'FOGO',   silabas: ['FO', 'GO'], emoji: '🔥' },
  { palavra: 'LUA',    silabas: ['LU', 'A'],  emoji: '🌙' },
  { palavra: 'UVA',    silabas: ['U', 'VA'],  emoji: '🍇' },
  { palavra: 'DADO',   silabas: ['DA', 'DO'], emoji: '🎲' },
  { palavra: 'URSO',   silabas: ['UR', 'SO'], emoji: '🐻' },
  { palavra: 'MILHO',  silabas: ['MI', 'LHO'], emoji: '🌽' },
  { palavra: 'CHAVE',  silabas: ['CHA', 'VE'], emoji: '🔑' },
  { palavra: 'PEIXE',  silabas: ['PEI', 'XE'], emoji: '🐟' },

  // ---------------- 3 sílabas ----------------
  { palavra: 'SAPATO',  silabas: ['SA', 'PA', 'TO'], emoji: '👟' },
  { palavra: 'BONECA',  silabas: ['BO', 'NE', 'CA'], emoji: '🪆' },
  { palavra: 'CAVALO',  silabas: ['CA', 'VA', 'LO'], emoji: '🐴' },
  { palavra: 'JANELA',  silabas: ['JA', 'NE', 'LA'], emoji: '🪟' },
  { palavra: 'PANELA',  silabas: ['PA', 'NE', 'LA'], emoji: '🍳' },
  { palavra: 'BANANA',  silabas: ['BA', 'NA', 'NA'], emoji: '🍌' },
  { palavra: 'MACACO',  silabas: ['MA', 'CA', 'CO'], emoji: '🐒' },
  { palavra: 'GIRAFA',  silabas: ['GI', 'RA', 'FA'], emoji: '🦒' },
  { palavra: 'TOMATE',  silabas: ['TO', 'MA', 'TE'], emoji: '🍅' },
  { palavra: 'BATATA',  silabas: ['BA', 'TA', 'TA'], emoji: '🥔' },
  { palavra: 'CANETA',  silabas: ['CA', 'NE', 'TA'], emoji: '🖊️' },
  { palavra: 'ESCOLA',  silabas: ['ES', 'CO', 'LA'], emoji: '🏫' },
  { palavra: 'ABELHA',  silabas: ['A', 'BE', 'LHA'], emoji: '🐝' },
  { palavra: 'CORUJA',  silabas: ['CO', 'RU', 'JA'], emoji: '🦉' },
  { palavra: 'CAMISA',  silabas: ['CA', 'MI', 'SA'], emoji: '👕' },
  { palavra: 'MOCHILA', silabas: ['MO', 'CHI', 'LA'], emoji: '🎒' },
  { palavra: 'LARANJA', silabas: ['LA', 'RAN', 'JA'], emoji: '🍊' },
  { palavra: 'SORVETE', silabas: ['SOR', 'VE', 'TE'], emoji: '🍦' },
  { palavra: 'FOGUETE', silabas: ['FO', 'GUE', 'TE'], emoji: '🚀' },
  { palavra: 'CENOURA', silabas: ['CE', 'NOU', 'RA'], emoji: '🥕' },
  { palavra: 'ESTRELA', silabas: ['ES', 'TRE', 'LA'], emoji: '⭐' },
  { palavra: 'SACOLA',  silabas: ['SA', 'CO', 'LA'], emoji: '🛍️' },
  { palavra: 'BALEIA',  silabas: ['BA', 'LEI', 'A'], emoji: '🐳' },

  // ---------------- 4 sílabas ----------------
  { palavra: 'BORBOLETA',  silabas: ['BOR', 'BO', 'LE', 'TA'], emoji: '🦋' },
  { palavra: 'BICICLETA',  silabas: ['BI', 'CI', 'CLE', 'TA'], emoji: '🚲' },
  { palavra: 'CHOCOLATE',  silabas: ['CHO', 'CO', 'LA', 'TE'], emoji: '🍫' },
  { palavra: 'TELEFONE',   silabas: ['TE', 'LE', 'FO', 'NE'], emoji: '📞' },
  { palavra: 'ELEFANTE',   silabas: ['E', 'LE', 'FAN', 'TE'], emoji: '🐘' },
  { palavra: 'TARTARUGA',  silabas: ['TAR', 'TA', 'RU', 'GA'], emoji: '🐢' },
  { palavra: 'ABACAXI',    silabas: ['A', 'BA', 'CA', 'XI'], emoji: '🍍' },
  { palavra: 'PIRULITO',   silabas: ['PI', 'RU', 'LI', 'TO'], emoji: '🍭' },
  { palavra: 'COMPUTADOR', silabas: ['COM', 'PU', 'TA', 'DOR'], emoji: '💻' },
  { palavra: 'DINOSSAURO', silabas: ['DI', 'NOS', 'SAU', 'RO'], emoji: '🦕' },
  { palavra: 'MELANCIA',   silabas: ['ME', 'LAN', 'CI', 'A'], emoji: '🍉' },
];

// ============================================================
//  Palavras extras — SÓ para o modo livre (dicionário + pátio).
//  Não viram carga (não precisam de emoji). Sem acento/ç.
// ============================================================
export type PalavraExtra = { palavra: string; silabas: string[] };

export const palavrasExtras: PalavraExtra[] = [
  { palavra: 'BOCA',    silabas: ['BO', 'CA'] },
  { palavra: 'BOTA',    silabas: ['BO', 'TA'] },
  { palavra: 'CAMA',    silabas: ['CA', 'MA'] },
  { palavra: 'CANO',    silabas: ['CA', 'NO'] },
  { palavra: 'CAPA',    silabas: ['CA', 'PA'] },
  { palavra: 'COLA',    silabas: ['CO', 'LA'] },
  { palavra: 'COPO',    silabas: ['CO', 'PO'] },
  { palavra: 'CORDA',   silabas: ['COR', 'DA'] },
  { palavra: 'DEDO',    silabas: ['DE', 'DO'] },
  { palavra: 'DENTE',   silabas: ['DEN', 'TE'] },
  { palavra: 'DOCE',    silabas: ['DO', 'CE'] },
  { palavra: 'FADA',    silabas: ['FA', 'DA'] },
  { palavra: 'FITA',    silabas: ['FI', 'TA'] },
  { palavra: 'FOLHA',   silabas: ['FO', 'LHA'] },
  { palavra: 'GALO',    silabas: ['GA', 'LO'] },
  { palavra: 'GELO',    silabas: ['GE', 'LO'] },
  { palavra: 'LATA',    silabas: ['LA', 'TA'] },
  { palavra: 'LEITE',   silabas: ['LEI', 'TE'] },
  { palavra: 'LIVRO',   silabas: ['LI', 'VRO'] },
  { palavra: 'LUVA',    silabas: ['LU', 'VA'] },
  { palavra: 'MAPA',    silabas: ['MA', 'PA'] },
  { palavra: 'MATO',    silabas: ['MA', 'TO'] },
  { palavra: 'MEDO',    silabas: ['ME', 'DO'] },
  { palavra: 'MOLA',    silabas: ['MO', 'LA'] },
  { palavra: 'MURO',    silabas: ['MU', 'RO'] },
  { palavra: 'NOME',    silabas: ['NO', 'ME'] },
  { palavra: 'PANO',    silabas: ['PA', 'NO'] },
  { palavra: 'PAPEL',   silabas: ['PA', 'PEL'] },
  { palavra: 'PASTA',   silabas: ['PAS', 'TA'] },
  { palavra: 'PATA',    silabas: ['PA', 'TA'] },
  { palavra: 'PEDRA',   silabas: ['PE', 'DRA'] },
  { palavra: 'PENA',    silabas: ['PE', 'NA'] },
  { palavra: 'PENTE',   silabas: ['PEN', 'TE'] },
  { palavra: 'PORTA',   silabas: ['POR', 'TA'] },
  { palavra: 'POTE',    silabas: ['PO', 'TE'] },
  { palavra: 'RODA',    silabas: ['RO', 'DA'] },
  { palavra: 'ROUPA',   silabas: ['ROU', 'PA'] },
  { palavra: 'SALA',    silabas: ['SA', 'LA'] },
  { palavra: 'SELO',    silabas: ['SE', 'LO'] },
  { palavra: 'SINO',    silabas: ['SI', 'NO'] },
  { palavra: 'TAMPA',   silabas: ['TAM', 'PA'] },
  { palavra: 'TATU',    silabas: ['TA', 'TU'] },
  { palavra: 'TERRA',   silabas: ['TER', 'RA'] },
  { palavra: 'TINTA',   silabas: ['TIN', 'TA'] },
  { palavra: 'VASO',    silabas: ['VA', 'SO'] },
  { palavra: 'VENTO',   silabas: ['VEN', 'TO'] },
  { palavra: 'VILA',    silabas: ['VI', 'LA'] },
  { palavra: 'ZEBRA',   silabas: ['ZE', 'BRA'] },
  { palavra: 'MENINO',  silabas: ['ME', 'NI', 'NO'] },
  { palavra: 'MENINA',  silabas: ['ME', 'NI', 'NA'] },
  { palavra: 'MOEDA',   silabas: ['MO', 'E', 'DA'] },
  { palavra: 'NAVIO',   silabas: ['NA', 'VI', 'O'] },
  { palavra: 'NINHO',   silabas: ['NI', 'NHO'] },
  { palavra: 'PIANO',   silabas: ['PI', 'A', 'NO'] },
  { palavra: 'PIPOCA',  silabas: ['PI', 'PO', 'CA'] },
  { palavra: 'PAREDE',  silabas: ['PA', 'RE', 'DE'] },
  { palavra: 'TIJOLO',  silabas: ['TI', 'JO', 'LO'] },
  { palavra: 'GALINHA', silabas: ['GA', 'LI', 'NHA'] },
  { palavra: 'FORMIGA', silabas: ['FOR', 'MI', 'GA'] },
  { palavra: 'PIRATA',  silabas: ['PI', 'RA', 'TA'] },
  { palavra: 'PETECA',  silabas: ['PE', 'TE', 'CA'] },
  { palavra: 'CANECA',  silabas: ['CA', 'NE', 'CA'] },
  { palavra: 'COELHO',  silabas: ['CO', 'E', 'LHO'] },
  { palavra: 'OVELHA',  silabas: ['O', 'VE', 'LHA'] },
  { palavra: 'CIDADE',  silabas: ['CI', 'DA', 'DE'] },
];
