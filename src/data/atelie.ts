// Ateliê — paleta e configuração do paint.
// Editar aqui muda as cores/tamanhos sem tocar na página.

export interface Cor {
  hex: string;
  nome: string; // pro aria-label e pro anunciar()
}

// 24 cores kid-friendly em 3 fileiras de 8: neutros/pele, quentes, frios
export const paleta: Cor[] = [
  // fileira 1: neutros + tons de pele
  { hex: '#1c1c1e', nome: 'preto' },
  { hex: '#6d6d73', nome: 'cinza' },
  { hex: '#c9c9cf', nome: 'cinza claro' },
  { hex: '#ffffff', nome: 'branco' },
  { hex: '#8b5a2b', nome: 'marrom' },
  { hex: '#a5673f', nome: 'pele escura' },
  { hex: '#ffd9b3', nome: 'pele clara' },
  { hex: '#f5e6b8', nome: 'areia' },
  // fileira 2: quentes
  { hex: '#a31621', nome: 'vermelho escuro' },
  { hex: '#e63946', nome: 'vermelho' },
  { hex: '#ff7b33', nome: 'laranja' },
  { hex: '#ffb27a', nome: 'pêssego' },
  { hex: '#ffd23f', nome: 'amarelo' },
  { hex: '#d4a017', nome: 'dourado' },
  { hex: '#ff8ab5', nome: 'rosa' },
  { hex: '#cbb2f0', nome: 'lilás' },
  // fileira 3: frios
  { hex: '#c5e84a', nome: 'verde limão' },
  { hex: '#7bc950', nome: 'verde claro' },
  { hex: '#2d8a3e', nome: 'verde escuro' },
  { hex: '#37c2ce', nome: 'azul piscina' },
  { hex: '#9bd4ff', nome: 'azul céu' },
  { hex: '#2469d4', nome: 'azul' },
  { hex: '#1b2a6b', nome: 'azul marinho' },
  { hex: '#9b6dd6', nome: 'roxo' },
];

export interface Tamanho {
  nome: string;
  px: number;
}

export const tamanhos: Tamanho[] = [
  { nome: 'fino', px: 6 },
  { nome: 'médio', px: 14 },
  { nome: 'grosso', px: 28 },
];

export const config = {
  larguraLogica: 1152,
  alturaLogica: 768,
  undoMax: 20,
  toleranciaBalde: 48, // antialias do pincel: fill "come" a borda suave
  borrachaFator: 1.5, // borracha é mais gorda que o pincel do mesmo tamanho
};
