// ============================================================
//  Projetos do portfólio — EDITE / ADICIONE livremente.
// ============================================================

export type Projeto = {
  titulo: string;
  resumo: string;
  // Tecnologias / tags exibidas como chips.
  tags: string[];
  // Link principal (repo, página, loja). Opcional.
  url?: string;
  // Texto do botão de link.
  urlLabel?: string;
  // Destaca o card (ocupa largura maior na grid).
  destaque?: boolean;
  // Status visível: 'Em produção' | 'Em desenvolvimento' | 'Concluído'
  status?: string;
};

export const projetos: Projeto[] = [
  {
    titulo: 'VMonsters: World Button Clash',
    resumo:
      'Jogo mobile de futebol de botão com temática VMonsters, para Android e iOS. Física de botão, progressão de monstros e integração Firebase.',
    tags: ['Unity', 'C#', 'Android', 'iOS', 'Firebase'],
    status: 'Em desenvolvimento',
    destaque: true,
    urlLabel: 'Ver projeto',
  },
  {
    titulo: 'VMonsters: Digital Farm',
    resumo:
      'Cozy island life game em Godot 4.6. O jogador naufraga numa ilha e constrói uma fazenda enquanto faz amizade com VMonsters — criaturas companheiras que ajudam no trabalho e na exploração.',
    tags: ['Godot 4.6', 'GDScript', 'Game Design'],
    status: 'Em desenvolvimento',
    destaque: true,
    urlLabel: 'Ver projeto',
  },
  {
    titulo: 'VMonsters: Collect Monsters',
    resumo:
      'App/jogo de coleção de monstros em Flutter com backend Firebase (Firestore, regras de segurança). Multiplataforma.',
    tags: ['Flutter', 'Dart', 'Firebase'],
    status: 'Em desenvolvimento',
    urlLabel: 'Ver projeto',
  },
  {
    titulo: 'VMonsters: Night Shift',
    resumo:
      'Jogo em Godot ambientado no universo VMonsters, com mecânica de turno noturno e atmosfera de tensão.',
    tags: ['Godot', 'GDScript'],
    status: 'Em desenvolvimento',
    urlLabel: 'Ver projeto',
  },
];
