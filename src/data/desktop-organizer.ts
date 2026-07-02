// ============================================================
//  Jogo "Organizador da Área de Trabalho".
//  Hardware × Software × (objetos que não são do computador).
//  Cada item vira um ícone arrastável; o `id` liga ao SVG #ico-<id>.
//  EDITE livremente: adicione itens, ajuste fases/quantidades.
// ============================================================

export type ItemTipo = 'hardware' | 'software' | 'objeto';

export type DesktopItem = {
  // id único e DOM-safe. minúsculo, sem espaços. Liga ao ícone #ico-<id>.
  id: string;
  // Rótulo exibido sob o ícone (PT-BR).
  label: string;
  // Categoria correta — para qual pasta deve ir.
  tipo: ItemTipo;
  // Explicação de uma frase, mostrada no toast ao acertar (linguagem infantil).
  explicacao: string;
};

// Cada fase define quais pastas aparecem e quantos itens de cada categoria.
export type Fase = {
  id: string;
  nome: string;
  categorias: ItemTipo[];
  quantidades: Partial<Record<ItemTipo, number>>;
};

export const config = {
  pontosPorAcerto: 10,
  // Sem penalidade no erro (público infantil).
  pontosPorErro: 0,
  // Embaralhar itens e posições.
  embaralhar: true,
  // Som começa ligado (com botão de mudo no jogo).
  somLigadoInicial: true,
} as const;

// Nome + dica de cada pasta (drop zone).
export const categoriasInfo: Record<ItemTipo, { label: string; hint: string }> = {
  hardware: { label: 'Hardware', hint: 'peças que dá pra pegar' },
  software: { label: 'Software', hint: 'programas e apps' },
  objeto: { label: 'Não é do PC', hint: 'não é do computador' },
};

// Fases progressivas. Dificuldade cresce; a 3ª introduz a pasta "Não é do PC".
export const fases: Fase[] = [
  {
    id: 'no-computador',
    nome: 'No computador',
    categorias: ['hardware', 'software'],
    quantidades: { hardware: 3, software: 3 },
  },
  {
    id: 'os-aplicativos',
    nome: 'Os aplicativos',
    categorias: ['hardware', 'software'],
    quantidades: { hardware: 3, software: 5 },
  },
  {
    id: 'em-casa',
    nome: 'Em casa',
    categorias: ['hardware', 'software', 'objeto'],
    quantidades: { hardware: 3, software: 3, objeto: 4 },
  },
];

export const itensDesktop: DesktopItem[] = [
  // ---------- HARDWARE (peças/aparelhos físicos do computador) ----------
  { id: 'monitor',    label: 'Monitor',         tipo: 'hardware', explicacao: 'O monitor é a tela onde você vê tudo — dá para tocar nele!' },
  { id: 'teclado',    label: 'Teclado',         tipo: 'hardware', explicacao: 'O teclado é físico: você aperta as teclas com os dedos.' },
  { id: 'mouse',      label: 'Mouse',           tipo: 'hardware', explicacao: 'O mouse é um objeto que você segura com a mão.' },
  { id: 'impressora', label: 'Impressora',      tipo: 'hardware', explicacao: 'A impressora é uma máquina de verdade que fica na mesa.' },
  { id: 'pendrive',   label: 'Pen drive',       tipo: 'hardware', explicacao: 'O pen drive é uma pecinha que você espeta no computador.' },
  { id: 'fone',       label: 'Fone de ouvido',  tipo: 'hardware', explicacao: 'O fone você coloca na cabeça — é uma coisa de verdade.' },
  { id: 'webcam',     label: 'Webcam',          tipo: 'hardware', explicacao: 'A webcam é um aparelho que você toca e aponta.' },
  { id: 'celular',    label: 'Celular',         tipo: 'hardware', explicacao: 'O celular é um aparelho que cabe na sua mão.' },
  { id: 'gabinete',   label: 'Gabinete',        tipo: 'hardware', explicacao: 'O gabinete é a caixa do computador, cheia de peças por dentro.' },
  { id: 'caixasom',   label: 'Caixa de som',    tipo: 'hardware', explicacao: 'A caixa de som é um objeto que solta o barulho.' },
  { id: 'calculadora',label: 'Calculadora',     tipo: 'hardware', explicacao: 'A calculadora de mão é um aparelho de verdade, com botões pra apertar.' },

  // ---------- SOFTWARE (programas/apps que não dá pra pegar) ----------
  { id: 'navegador',  label: 'Navegador',       tipo: 'software', explicacao: 'O navegador é um programa para abrir sites na internet.' },
  { id: 'jogo',       label: 'Jogo',            tipo: 'software', explicacao: 'O jogo é um programa: você joga, mas não pega na mão.' },
  { id: 'editor',     label: 'Editor de texto', tipo: 'software', explicacao: 'O editor de texto é um programa para escrever no computador.' },
  { id: 'desenho',    label: 'Desenho',         tipo: 'software', explicacao: 'É um programa para desenhar na tela com o mouse.' },
  { id: 'musica',     label: 'App de música',   tipo: 'software', explicacao: 'O app de música é um programa que toca suas canções.' },
  { id: 'antivirus',  label: 'Antivírus',       tipo: 'software', explicacao: 'O antivírus é um programa que protege o computador.' },
  { id: 'video',      label: 'App de vídeo',    tipo: 'software', explicacao: 'O app de vídeo é um programa para assistir filmes.' },
  { id: 'mensagens',  label: 'Mensagens',       tipo: 'software', explicacao: 'É um programa para mandar mensagens para os amigos.' },
  { id: 'fotos',      label: 'App de fotos',    tipo: 'software', explicacao: 'O app de fotos é um programa que guarda suas imagens.' },
  { id: 'email',      label: 'E-mail',          tipo: 'software', explicacao: 'É um programa para mandar cartinhas pela internet.' },
  { id: 'mapa',       label: 'Mapa',            tipo: 'software', explicacao: 'É um programa que mostra os caminhos na tela.' },
  { id: 'loja',       label: 'Loja',            tipo: 'software', explicacao: 'É um app para comprar coisas pela internet.' },
  { id: 'camera',     label: 'Câmera',          tipo: 'software', explicacao: 'É um app que tira e guarda fotos no computador.' },
  { id: 'calendario', label: 'Calendário',      tipo: 'software', explicacao: 'É um programa que marca os dias e os lembretes.' },
  { id: 'clima',      label: 'Tempo',           tipo: 'software', explicacao: 'É um app que mostra se vai chover ou fazer sol.' },

  // ---------- OBJETO (coisas do dia a dia, que não são do computador) ----------
  { id: 'sofa',       label: 'Sofá',            tipo: 'objeto',   explicacao: 'O sofá é um móvel da sala — não tem nada de computador.' },
  { id: 'tv',         label: 'Televisão',       tipo: 'objeto',   explicacao: 'A TV é da sala, serve pra assistir — não é o computador.' },
  { id: 'radio',      label: 'Rádio',           tipo: 'objeto',   explicacao: 'O rádio toca música, mas não é parte do computador.' },
  { id: 'geladeira',  label: 'Geladeira',       tipo: 'objeto',   explicacao: 'A geladeira fica na cozinha e gela a comida.' },
  { id: 'cadeira',    label: 'Cadeira',         tipo: 'objeto',   explicacao: 'A cadeira é um móvel pra você sentar.' },
  { id: 'mesa',       label: 'Mesa',            tipo: 'objeto',   explicacao: 'A mesa é um móvel — o computador fica em cima dela.' },
  { id: 'luminaria',  label: 'Luminária',       tipo: 'objeto',   explicacao: 'A luminária dá luz, mas não é do computador.' },
  { id: 'planta',     label: 'Planta',          tipo: 'objeto',   explicacao: 'A plantinha é um ser vivo, não é tecnologia.' },
  { id: 'livro',      label: 'Livro',           tipo: 'objeto',   explicacao: 'O livro é de papel — você lê com as mãos.' },
  { id: 'ventilador', label: 'Ventilador',      tipo: 'objeto',   explicacao: 'O ventilador faz vento pra refrescar.' },
];
