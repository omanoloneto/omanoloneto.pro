// Ateliê — paleta e configuração do paint.
// Editar aqui muda as cores/tamanhos sem tocar na página.

export interface Cor {
  hex: string;
  nome: string; // pro aria-label e pro anunciar()
}

// 16 cores kid-friendly, do arco-íris ao marrom-de-pintar-cachorro
export const paleta: Cor[] = [
  { hex: '#1c1c1e', nome: 'preto' },
  { hex: '#6d6d73', nome: 'cinza' },
  { hex: '#ffffff', nome: 'branco' },
  { hex: '#8b5a2b', nome: 'marrom' },
  { hex: '#e63946', nome: 'vermelho' },
  { hex: '#ff7b33', nome: 'laranja' },
  { hex: '#ffd23f', nome: 'amarelo' },
  { hex: '#f5e6b8', nome: 'areia' },
  { hex: '#7bc950', nome: 'verde claro' },
  { hex: '#2d8a3e', nome: 'verde escuro' },
  { hex: '#37c2ce', nome: 'azul piscina' },
  { hex: '#2469d4', nome: 'azul' },
  { hex: '#1b2a6b', nome: 'azul marinho' },
  { hex: '#9b6dd6', nome: 'roxo' },
  { hex: '#ff8ab5', nome: 'rosa' },
  { hex: '#d4a017', nome: 'dourado' },
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
