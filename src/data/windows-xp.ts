// Windows XP — CONTEÚDO do simulador. O formato vem do motor
// (src/games/sim-os/tipos.ts) e as janelas de APP usam o HTML padrão
// compartilhado (feature nova no app aparece aqui automaticamente).
//
// PROVISÓRIO — os textos educativos abaixo são rascunho de era-2001;
// o professor edita depois. EDITE livremente.
import type { DadosSim } from '../games/sim-os/tipos';
import { HTML_BLOCO_DE_NOTAS } from '../games/sim-os/apps/bloco-de-notas';
import { HTML_EXPLORADOR } from '../games/sim-os/apps/explorador';
import { HTML_LIXEIRA } from '../games/sim-os/apps/lixeira';
import { HTML_NAVEGADOR } from '../games/sim-os/apps/navegador';
import { HTML_PLAYER } from '../games/sim-os/apps/player';

const janelas: DadosSim['janelas'] = [
  // ===== Apps (estrutura compartilhada do motor) =====
  {
    id: 'meus-documentos',
    titulo: 'Meus Documentos',
    icone: 'pasta',
    classe: 'janela--exp',
    cru: true,
    app: 'explorador',
    html: HTML_EXPLORADOR,
  },
  {
    id: 'lixeira',
    titulo: 'Lixeira',
    icone: 'lixeira',
    classe: 'janela--lixo',
    cru: true,
    app: 'lixeira',
    html: HTML_LIXEIRA,
  },
  {
    id: 'internet-explorer',
    titulo: 'Internet Explorer',
    icone: 'ie',
    classe: 'janela--ie',
    cru: true,
    app: 'navegador',
    html: HTML_NAVEGADOR,
  },
  {
    id: 'bloco-de-notas',
    titulo: 'Sem título — Bloco de Notas',
    icone: 'bloco',
    classe: 'janela--notas',
    cru: true,
    app: 'bloco-de-notas',
    html: HTML_BLOCO_DE_NOTAS,
  },
  {
    id: 'player',
    titulo: 'Reprodutor de Mídia',
    icone: 'player',
    classe: 'janela--player',
    cru: true,
    app: 'player',
    html: HTML_PLAYER,
  },
  // ===== Janelas educativas (PROVISÓRIO — professor edita) =====
  {
    id: 'meu-computador',
    titulo: 'Meu Computador',
    icone: 'computador',
    html: `
      <p>Em 2001 o computador já vinha com gravador de CD: dava pra gravar as
      suas músicas num disco prateado! O disquete ainda existia, mas os pen
      drives estavam chegando pra aposentar ele.</p>
      <p class="dica">💡 <b>Curiosidade:</b> um CD guardava 700 MB — quase 500
      disquetes dentro de um disco só!</p>`,
  },
  {
    id: 'programas',
    titulo: 'Programas',
    icone: 'programas',
    html: `
      <p>Os programas famosos do Windows XP: o <b>Paint</b>, o <b>MSN Messenger</b>
      (pra conversar com os amigos digitando) e os joguinhos <b>Pinball</b>,
      <b>Campo Minado</b> e <b>Paciência</b>.</p>
      <p class="dica">💡 <b>Curiosidade:</b> o MSN tinha "emoticons" que dançavam —
      os vovôs dos emojis de hoje!</p>`,
  },
  {
    id: 'documentos',
    titulo: 'Documentos',
    icone: 'pasta',
    html: `
      <p>Este menu mostrava os últimos arquivos que você tinha usado, pra abrir
      de novo rapidinho.</p>
      <p class="dica">💡 <b>Curiosidade:</b> o disco do XP tinha uns 40 GB —
      parecia GIGANTE na época!</p>`,
  },
  {
    id: 'configuracoes',
    titulo: 'Configurações',
    icone: 'config',
    html: `
      <p>O Windows XP foi o primeiro Windows colorido de fábrica: janelas azuis,
      botão Iniciar verde e um papel de parede de colina verdinha que ficou famoso
      no mundo inteiro.</p>
      <p class="dica">💡 <b>Curiosidade:</b> esse visual colorido tinha nome:
      tema <b>Luna</b>.</p>`,
  },
  {
    id: 'ajuda',
    titulo: 'Ajuda e suporte',
    icone: 'ajuda',
    html: `
      <p>A Ajuda do XP já tinha busca: você digitava a dúvida e ele procurava a
      resposta dentro do computador — a internet ainda era lenta demais pra
      perguntar tudo nela.</p>
      <p class="dica">💡 <b>Curiosidade:</b> em 2001 quase ninguém tinha banda
      larga no Brasil — a internet ainda fazia barulho pra conectar!</p>`,
  },
  {
    id: 'executar',
    titulo: 'Executar',
    icone: 'executar',
    html: `
      <p>A janelinha dos espertos continuava aqui: digitar <b>pinball</b> abria
      o jogo de fliperama mais famoso do mundo.</p>
      <p class="dica">💡 <b>Curiosidade:</b> programadores usam comandos assim
      até hoje — é mais rápido que caçar no menu.</p>`,
  },
  // ===== Visualizador do seed (PROVISÓRIO) =====
  {
    id: 'arq-trabalho',
    titulo: 'Trabalho de Informática.doc — WordPad',
    icone: 'doc',
    html: `
      <div class="folha folha--trabalho">
        <p class="folha__titulo">O QUE EU QUERO SER QUANDO CRESCER</p>
        <p class="folha__sub">Trabalho de Informática — 4ª série — 2001</p>
        <p>Quando eu crescer eu quero trabalhar com computadores, porque o moço
        da loja disse que computador é o futuro. Minha mãe falou que primeiro
        eu tenho que arrumar o meu quarto.</p>
        <p>Digitei este trabalho sozinho no computador NOVO da escola.</p>
      </div>
      <p class="dica">💡 <b>Curiosidade:</b> o moço da loja tinha razão!</p>`,
  },
];

// ============================================================
//  Mini-web do IE — era 2001 (PROVISÓRIO — professor edita).
//  '__erro__' é a página "não pode ser exibida".
// ============================================================
const sites: DadosSim['sites'] = [
  {
    url: 'www.diariodaturminha.com.br',
    titulo: 'Diário da Turminha',
    html: `
  <div class="pg pg--diario">
    <h1>📓 Diário da Turminha 📓</h1>
    <p class="pg-centro">Meu diário na internet! Atualizado toda semana<br />(quando a internet conecta).</p>
    <div class="pg-post">
      <p><b>segunda-feira, 2001</b></p>
      <p>Hoje o meu pai trouxe um CD com 150 músicas que o amigo dele gravou.
      CENTO E CINQUENTA! No rádio do carro não toca, mas no computador toca.</p>
    </div>
    <div class="pg-post">
      <p><b>quarta-feira, 2001</b></p>
      <p>A escola ganhou computadores novos com Windows XP. As janelas são AZUIS
      e o botão Iniciar é VERDE. O futuro chegou.</p>
    </div>
    <p class="pg-nav">🎮 <a href="#" data-vai="www.jogagratis.com.br">Joga Grátis</a></p>
    <p class="pg-rodape">Diário da Turminha © 2001 — assine o meu livro de visitas!</p>
  </div>`,
  },
  {
    url: 'www.jogagratis.com.br',
    titulo: 'Joga Grátis',
    html: `
  <div class="pg pg--jogos">
    <h1>🎮 JOGA GRÁTIS 🎮</h1>
    <p class="pg-centro">Os melhores joguinhos da internet!<br /><b>Sem baixar nada!</b> (só esperar carregar…)</p>
    <ul>
      <li>🐤 Mira no Pato — carregando… 87%</li>
      <li>🏰 Defenda o Castelo — carregando… 42%</li>
      <li>🧩 Quebra-Cabeça Maluco — carregando… 13%</li>
    </ul>
    <p class="pg-dica">💡 <b>Verdade de 2001:</b> os joguinhos da internet demoravam
    TANTO pra carregar que a gente lanchava esperando. E se alguém usasse o telefone,
    começava tudo de novo.</p>
    <p class="pg-nav">📓 <a href="#" data-vai="www.diariodaturminha.com.br">Diário da Turminha</a></p>
    <p class="pg-rodape">Joga Grátis © 2001 — jogos 100% grátis, paciência não inclusa.</p>
  </div>`,
  },
  {
    url: '__erro__',
    titulo: 'A página não pode ser exibida',
    html: `
  <div class="pg pg--erro">
    <h1>A página não pode ser exibida</h1>
    <p>A página que você está procurando não está disponível no momento. O site
    pode estar com problemas… ou talvez esse endereço <b>nem exista</b>.</p>
    <hr class="pg-hr" />
    <p><b>Tente o seguinte:</b></p>
    <ul>
      <li>Confira se você digitou o endereço certinho.</li>
      <li>Clique no botão <b>⟳ Atualizar</b> pra tentar de novo.</li>
      <li>Clique em <b>🏠 Início</b> pra voltar pra página inicial.</li>
    </ul>
    <p class="pg-erro__tec">Não é possível localizar o servidor ou erro de DNS<br />Internet Explorer (de mentirinha)<br />Endereço digitado: <b data-url-erro></b></p>
  </div>`,
  },
];

export const dados: DadosSim = {
  chave: 'winxp',
  pastaIcones: '/class/sims/icons/xp/',
  janelas,
  sites,

  // PROVISÓRIO — professor edita os textos dos arquivos
  arquivosSeed: [
    {
      id: 'arq-leiame',
      icone: 'bloco',
      nome: 'Leia-me.txt',
      abrirCom: 'bloco-de-notas',
      texto: [
        'Olá, turma! Bem-vindos a 2001!',
        '',
        'Este é o Windows XP, o Windows colorido: janelas azuis, botão Iniciar verde e o famoso tema Luna. Explorem à vontade!',
        '',
        'Este arquivo está aberto no Bloco de Notas — podem apagar tudo e escrever o que quiserem. Pra guardar, cliquem em Salvar e deem um nome: a nota vai aparecer em Meus Documentos.',
        '',
        'Dica: dá pra arrastar as janelas pela barra azul e mudar o tamanho delas puxando pelo cantinho de baixo.',
      ].join('\n'),
    },
    { id: 'arq-trabalho', icone: 'doc', nome: 'Trabalho de Informática.doc', janela: 'arq-trabalho' },
  ],

  iconesDesktop: [
    { id: 'meu-computador', icone: 'computador', rotulo: 'Meu Computador' },
    { id: 'meus-documentos', icone: 'pasta', rotulo: 'Meus Documentos' },
    { id: 'lixeira', icone: 'lixeira', rotulo: 'Lixeira' },
    { id: 'internet-explorer', icone: 'ie', rotulo: 'Internet Explorer' },
    { abreArquivo: 'arq-leiame', icone: 'bloco', rotulo: 'Leia-me.txt' },
  ],

  menu: [
    {
      icone: 'programas',
      rotulo: 'Todos os programas',
      submenu: [
        { id: 'bloco-de-notas', icone: 'bloco', rotulo: 'Bloco de Notas' },
        { id: 'internet-explorer', icone: 'ie', rotulo: 'Internet Explorer' },
        { id: 'player', icone: 'player', rotulo: 'Reprodutor de Mídia' },
        { id: 'programas', icone: 'ajuda', rotulo: 'O que eram os programas?' },
      ],
    },
    { id: 'documentos', icone: 'pasta', rotulo: 'Documentos' },
    { id: 'configuracoes', icone: 'config', rotulo: 'Configurações' },
    { id: 'ajuda', icone: 'ajuda', rotulo: 'Ajuda e suporte' },
    { id: 'executar', icone: 'executar', rotulo: 'Executar…' },
  ],
  desligar: { icone: 'computador', rotulo: 'Desativar…' },

  navegador: { home: 'www.diariodaturminha.com.br' },

  sons: {
    // acorde de ligar suave, estilo XP: arpejo ascendente em seno
    ligar: { notas: [[440, 1.0], [554, 1.0], [659, 1.1], [880, 1.4]], passo: 0.12, tipo: 'sine', vol: 0.12 },
    // melodia calminha própria
    melodia: {
      notas: [
        [988, 0.25], [830, 0.25], [740, 0.3], [622, 0.45],
        [740, 0.3], [830, 0.25], [988, 0.6],
      ],
      tipo: 'sine',
      vol: 0.11,
    },
  },

  tempos: { boot: 3000, bootReduzido: 800, desligar: 1400, desligarReduzido: 300, navegacao: 400 },

  textos: {
    // sistema
    ligado: 'Computador ligado. Você está na área de trabalho do Windows XP. Use Tab pra passear pelos ícones e Enter pra abrir.',
    desligando: 'O Windows está sendo desativado.',
    desligado: 'Agora é seguro desligar o seu computador. Aperte o botão pra ligar de novo.',
    janelaAberta: 'Janela aberta: {titulo}',
    janelaFechada: 'Janela fechada.',
    // navegador
    pronto: 'Pronto',
    conectando: 'Conectando a {url}…',
    concluido: 'Concluído',
    erroPagina: 'A página não pode ser exibida.',
    paginaCarregada: 'Página carregada: {titulo}',
    digiteEndereco: 'Digite um endereço. Exemplo: www.jogagratis.com.br',
    baixando: 'Baixando {nome}… faltam 2 horas e 12 minutos ⏳',
    downloadCaiu: '☎️ Alguém pegou o telefone! Download cancelado. Tente de novo… ou aceite. 😅',
    votou: 'Voto computado! Obrigado por votar (de mentirinha). 🗳️',
    // tocador (não usado no XP, mas o formato pede as chaves)
    tocando: 'Tocando… ♪ ♫',
    parado: 'Parado',
    somDesligado: 'Som desligado! Liga no alto-falante 🔊',
    // reprodutor de mídia
    playerParado: 'Parado',
    playerTocando: 'Tocando: {nome}',
    playerPausado: 'Pausado',
    playerErro: 'Não consegui tocar {nome} 😢 Tenta outra!',
    playerFimDaLista: 'A lista acabou! Aperte ▶ pra ouvir de novo.',
    playerSemMusicas: 'Nenhuma música por aqui ainda…',
    playerPastaVazia: 'Não achei músicas nessa pasta 🤔 Procure uma pasta com arquivos .mp3!',
    playerPastaDeNovo: 'Hmm, não deu por aqui. Clica no botão de novo!',
    playerSemUpload: 'Nada foi enviado: a música toca só neste computador! 😉',
    playerLocais: '{n} música(s) do seu computador entraram na lista! 💻',
    playerFaixaLocal: 'música do seu computador',
    // Meus Documentos / Lixeira
    statusPasta: '{n} objeto(s) — clique num arquivo pra abrir!',
    excluirRotulo: 'Excluir {nome}',
    protegido: 'Este arquivo veio com o computador e não pode ser excluído.',
    foiPraLixeira: '{nome} foi pra Lixeira.',
    restaurar: 'Restaurar',
    restaurado: '{nome} voltou pra Meus Documentos.',
    lixeiraVazia: 'A Lixeira está vazia.',
    esvaziarConfirma: 'Tem certeza? Apagar é pra sempre!',
    lixeiraEsvaziada: 'A Lixeira foi esvaziada.',
    // Bloco de Notas
    semTitulo: 'Sem título',
    salvo: 'Salvo!',
    salvoComo: 'Salvo em Meus Documentos: {nome}',
    nomeInvalido: 'Dê um nome pra sua nota (letras e números).',
    naoSalvou: 'Você não salvou o texto. Descartar?',
  },
};
