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
    'Sou programador e professor, e trabalho com desenvolvimento de jogos em geral. Hoje faço jogos educativos pras minhas aulas e toco a franquia VMonsters pela Red Studios.',
  // Usado em meta tags de SEO / compartilhamento.
  descricaoSEO:
    'Manolo Neto: programador e professor. Desenvolvimento de jogos em geral — jogos educativos gratuitos para sala de aula e a franquia VMonsters pela Red Studios.',
  // Link oficial da franquia VMonsters (Red Studios).
  vmonstersUrl: 'https://vmonsters.com/',
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
  // Troque SEU-PERFIL pelo handle real e descomente:
  { nome: 'LinkedIn', url: 'https://www.linkedin.com/in/omanoloneto/', icone: 'linkedin' },
  { nome: 'Instagram', url: 'https://instagram.com/omanoloneto', icone: 'instagram' },
  { nome: 'YouTube', url: 'https://www.youtube.com/@omanoloneto', icone: 'youtube' },
  //{ nome: 'Email', url: 'mailto:mano.afonso93@gmail.com', icone: 'email' },
];
