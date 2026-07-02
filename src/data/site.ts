// ============================================================
//  Dados do site — EDITE AQUI. Tudo que aparece na página puxa daqui.
// ============================================================

export const site = {
  nome: 'Manolo Neto',
  // Título curto usado no <title> e no header.
  titulo: 'Manolo Neto — faço jogos e ensino crianças a fazer os delas',
  // Frase de impacto do topo (hero).
  tagline: 'Faço jogos. E ensino crianças a fazer os delas.',
  // Parágrafo de apresentação do hero.
  descricao:
    'Desenvolvo a franquia VMonsters em três engines ao mesmo tempo — Unity, Godot e Flutter — e dou aula de tecnologia pra crianças. Quando a aula precisa de um jogo que não existe, eu faço o jogo.',
  // Usado em meta tags de SEO / compartilhamento.
  descricaoSEO:
    'Manolo Neto: desenvolvedor de jogos (franquia VMonsters — Unity, Godot, Flutter) e professor. Jogos educativos gratuitos para sala de aula em omanoloneto.pro/class.',
  email: 'mano.afonso93@gmail.com',
  localizacao: 'Brasil',
} as const;

export type SocialLink = {
  nome: string;
  url: string;
  // id do ícone (ver src/components/Icon.astro)
  icone: 'github' | 'linkedin' | 'instagram' | 'youtube' | 'email' | 'itchio';
};

export const socials: SocialLink[] = [
  { nome: 'GitHub', url: 'https://github.com/omanoloneto', icone: 'github' },
  { nome: 'Email', url: 'mailto:mano.afonso93@gmail.com', icone: 'email' },
  // Adicione quando tiver os perfis:
  // { nome: 'LinkedIn', url: 'https://linkedin.com/in/SEU-PERFIL', icone: 'linkedin' },
  // { nome: 'itch.io', url: 'https://SEU-USUARIO.itch.io', icone: 'itchio' },
  // { nome: 'YouTube', url: 'https://youtube.com/@SEU-CANAL', icone: 'youtube' },
];
