// ============================================================
//  Dados do site 
// ============================================================

export const site = {
  nome: 'Manolo Neto',
  titulo: 'Manolo Neto',
  tagline: 'Faço jogos. E ensino crianças a fazer os delas.',
  descricao:
    'Sou programador e professor, e trabalho com desenvolvimento de jogos em geral. Hoje faço jogos educativos pras minhas aulas e toco a franquia V-Monsters pela Red Studios.',
  descricaoSEO:
    'Manolo Neto: programador e professor. Desenvolvimento de jogos em geral — jogos educativos gratuitos para sala de aula e a franquia V-Monsters pela Red Studios.',
  vmonstersUrl: 'https://vmonsters.com/',
  email: 'mano.afonso93@gmail.com',
  localizacao: 'Brasil',
} as const;

export type SocialLink = {
  nome: string;
  url: string;
  icone: 'github' | 'linkedin' | 'instagram' | 'youtube' | 'email' | 'itchio';
};

export const socials: SocialLink[] = [
  { nome: 'GitHub', url: 'https://github.com/omanoloneto', icone: 'github' },
  { nome: 'LinkedIn', url: 'https://www.linkedin.com/in/omanoloneto/', icone: 'linkedin' },
  { nome: 'Instagram', url: 'https://instagram.com/omanoloneto', icone: 'instagram' },
  { nome: 'YouTube', url: 'https://www.youtube.com/@omanoloneto', icone: 'youtube' },
];
