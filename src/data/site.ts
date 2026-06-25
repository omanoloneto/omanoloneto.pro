// ============================================================
//  Dados do site — EDITE AQUI. Tudo que aparece na página puxa daqui.
// ============================================================

export const site = {
  nome: 'Manolo Neto',
  // Título curto usado no <title> e no header.
  titulo: 'Manolo Neto — Desenvolvedor & Professor',
  // Frase de impacto do topo (hero).
  tagline: 'Desenvolvedor de jogos e software. Professor.',
  // Parágrafo de apresentação do hero.
  descricao:
    'Crio jogos e aplicações do conceito ao deploy — e ensino outras pessoas a fazerem o mesmo. Foco em Flutter, Godot e Unity, com obsessão por código limpo e experiências que funcionam.',
  // Usado em meta tags de SEO / compartilhamento.
  descricaoSEO:
    'Portfólio de Mano Neto — desenvolvedor de jogos e software (Flutter, Godot, Unity) e professor de programação.',
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
  { nome: 'LinkedIn', url: 'https://linkedin.com/in/', icone: 'linkedin' },
  { nome: 'Email', url: 'mailto:mano.afonso93@gmail.com', icone: 'email' },
  // Descomente / ajuste conforme seus perfis:
  // { nome: 'itch.io', url: 'https://itch.io/', icone: 'itchio' },
  // { nome: 'YouTube', url: 'https://youtube.com/', icone: 'youtube' },
];
