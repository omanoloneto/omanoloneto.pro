// Windows 98 — todo o CONTEÚDO do simulador (janelas, mini-web, arquivos,
// menu, sons, textos). O formato vem do motor: src/games/sim-os/tipos.ts.
// EDITE livremente — tom pra criança, curiosidades de 1998.
import type { DadosSim } from '../games/sim-os/tipos';

const janelas: DadosSim['janelas'] = [
  {
    id: 'meu-computador',
    titulo: 'Meu Computador',
    icone: 'computador',
    html: `
      <p>Aqui você via tudo o que morava dentro do computador: o disco rígido <b>(C:)</b>,
      o CD-ROM <b>(D:)</b> e o disquete <b>(A:)</b>.</p>
      <p>O disquete era um quadradinho de plástico que guardava só <b>1,44 MB</b> —
      pra guardar UMA foto de celular de hoje, você precisaria de mais de 20 disquetes!</p>
      <p class="dica">💡 <b>Curiosidade:</b> o botão de salvar dos programas até hoje é um
      desenho de disquete — agora você sabe de onde veio!</p>`,
  },
  {
    id: 'meus-documentos',
    titulo: 'Meus Documentos',
    icone: 'pasta',
    classe: 'janela--exp',
    cru: true,
    app: 'explorador',
    html: `
      <div class="exp">
        <div class="exp__tools" aria-hidden="true">
          <span class="ie__btn bisel-alto exp__btn--off">◀ Voltar</span>
          <span class="ie__btn bisel-alto exp__btn--off">▲ Acima</span>
        </div>
        <div class="exp__end">
          <span class="exp__rotulo">Endereço</span>
          <span class="bisel-campo exp__caminho">C:\\Meus Documentos</span>
        </div>
        <div class="exp__grade bisel-campo" data-arquivos role="group" aria-label="Arquivos da pasta"></div>
        <div class="exp__status bisel-baixo" data-arquivos-status></div>
      </div>`,
  },
  {
    id: 'lixeira',
    titulo: 'Lixeira',
    icone: 'lixeira',
    classe: 'janela--lixo',
    cru: true,
    app: 'lixeira',
    html: `
      <div class="lixo">
        <p class="lixo__intro">Apagou um arquivo sem querer? Ele não some na hora: vem parar
        aqui. Clique em <b>Restaurar</b> pra devolver ele pra Meus Documentos — como resgatar
        um brinquedo do lixo antes do caminhão passar.</p>
        <div class="lixo__lista bisel-campo" data-lixeira-lista role="group" aria-label="Arquivos na Lixeira"></div>
        <div class="lixo__acoes">
          <button type="button" class="bisel-alto" data-lixeira-esvaziar>Esvaziar Lixeira</button>
        </div>
        <p class="dica">💡 <b>Curiosidade:</b> pra apagar de verdade é preciso "esvaziar a
        Lixeira" — e o ícone dela muda de cheio pra vazio. Repare lá na área de trabalho!</p>
      </div>`,
  },
  // (o Internet Explorer traz o chrome do navegador no html e o comportamento
  //  no app 'navegador' — a mini-web vem do array `sites` abaixo)
  {
    id: 'internet-explorer',
    titulo: 'Internet Explorer',
    icone: 'ie',
    classe: 'janela--ie',
    cru: true,
    app: 'navegador',
    html: `
      <div class="ie">
        <div class="ie__tools" role="toolbar" aria-label="Botões de navegação">
          <button type="button" class="ie__btn bisel-alto" data-ie-voltar disabled><span aria-hidden="true">◀</span> Voltar</button>
          <button type="button" class="ie__btn bisel-alto" data-ie-avancar disabled>Avançar <span aria-hidden="true">▶</span></button>
          <button type="button" class="ie__btn bisel-alto" data-ie-atualizar disabled><span aria-hidden="true">⟳</span> Atualizar</button>
          <button type="button" class="ie__btn bisel-alto" data-ie-inicio><span aria-hidden="true">🏠</span> Início</button>
        </div>
        <div class="ie__endereco">
          <label for="ie-url">Endereço</label>
          <input id="ie-url" class="bisel-campo" type="text" data-ie-url inputmode="url"
            autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"
            placeholder="www.algumsite.com.br" />
          <button type="button" class="ie__btn bisel-alto" data-ie-ir>Ir</button>
        </div>
        <div class="ie__pagina bisel-campo" data-ie-pagina tabindex="0" aria-label="Página da internet"></div>
        <div class="ie__status bisel-baixo" role="status" data-ie-status>Pronto</div>
      </div>`,
  },
  {
    id: 'bloco-de-notas',
    titulo: 'Sem título — Bloco de Notas',
    icone: 'bloco',
    classe: 'janela--notas',
    cru: true,
    app: 'bloco-de-notas',
    html: `
      <div class="notas">
        <div class="notas__menu" role="toolbar" aria-label="Menu do Bloco de Notas">
          <button type="button" data-nota-novo>Novo</button>
          <button type="button" data-nota-salvar>Salvar</button>
          <button type="button" data-nota-baixar>Baixar</button>
        </div>
        <div class="notas__aviso bisel-baixo" data-nota-confirma hidden>
          <span data-nota-confirma-msg></span>
          <span class="notas__aviso-botoes">
            <button type="button" class="bisel-alto" data-nota-descartar>Descartar</button>
            <button type="button" class="bisel-alto" data-nota-voltar>Voltar</button>
          </span>
        </div>
        <div class="notas__aviso bisel-baixo" data-nota-salvarcomo hidden>
          <label for="nota-nome">Nome:</label>
          <input id="nota-nome" class="bisel-campo" type="text" data-nota-nome maxlength="44"
            autocomplete="off" placeholder="minha nota" />
          <span class="notas__aviso-botoes">
            <button type="button" class="bisel-alto" data-nota-confirmar>Salvar</button>
            <button type="button" class="bisel-alto" data-nota-cancelar>Cancelar</button>
          </span>
        </div>
        <textarea class="notas__texto bisel-campo" data-nota-texto spellcheck="false"
          aria-label="Texto da nota" placeholder="Escreva aqui a sua nota…"></textarea>
        <div class="notas__status bisel-baixo" data-nota-status></div>
      </div>`,
  },
  // (o Leia-me.txt agora é um ARQUIVO de verdade — veja arquivosSeed — e
  //  abre no Bloco de Notas como uma nota protegida)
  {
    id: 'programas',
    titulo: 'Programas',
    icone: 'programas',
    html: `
      <p>Aqui ficavam os programas do computador. Os mais famosos: o <b>Paint</b>
      (pra desenhar), o <b>Bloco de Notas</b> (pra escrever) e os joguinhos
      <b>Campo Minado</b> e <b>Paciência</b>.</p>
      <p class="dica">💡 <b>Curiosidade:</b> não existia loja de aplicativos — programa
      novo vinha num CD ou disquete comprado na loja!</p>`,
  },
  {
    id: 'documentos',
    titulo: 'Documentos',
    icone: 'pasta',
    html: `
      <p>Este menu mostrava os últimos arquivos que você tinha usado, pra abrir de novo
      rapidinho, sem precisar procurar.</p>
      <p class="dica">💡 <b>Curiosidade:</b> o computador inteiro guardava menos coisa
      que um celular de hoje — o disco tinha uns 4 GB, um celular atual tem 30 vezes mais!</p>`,
  },
  {
    id: 'configuracoes',
    titulo: 'Configurações',
    icone: 'config',
    html: `
      <p>Aqui dava pra deixar o computador com a sua cara: mudar as cores, o papel de
      parede e os sons. O mais divertido era o <b>protetor de tela</b>: se você parasse
      de mexer no mouse, apareciam canos coloridos ou estrelinhas voando.</p>
      <p class="dica">💡 <b>Curiosidade:</b> o protetor de tela existia pra proteger os
      monitores antigos, de tubo, que podiam ficar com a imagem "gravada" pra sempre.</p>`,
  },
  {
    id: 'ajuda',
    titulo: 'Ajuda',
    icone: 'ajuda',
    html: `
      <p>Não dava pra perguntar pra internet — a Ajuda era um livrão dentro do próprio
      Windows, explicando cada botão. As pessoas também liam manuais de papel!</p>
      <p class="dica">💡 <b>Curiosidade:</b> nos programas de escrever existia um clipe
      de papel animado, o <b>Clippy</b>, que ficava dando conselhos sem ninguém pedir.</p>`,
  },
  {
    id: 'executar',
    titulo: 'Executar',
    icone: 'executar',
    html: `
      <p>Esta janelinha era pros espertos: você digitava o nome secreto de um programa
      e ele abria na hora. Escrever <b>winmine</b> abria o Campo Minado!</p>
      <p class="dica">💡 <b>Curiosidade:</b> muita gente preferia digitar comandos porque
      era mais rápido que caçar no menu — os programadores fazem isso até hoje.</p>`,
  },
  // ===== Visualizadores dos arquivos de Meus Documentos =====
  {
    id: 'arq-carta',
    titulo: 'Carta pra vovó.doc — WordPad',
    icone: 'doc',
    html: `
      <div class="folha">
        <p>Querida vovó,</p>
        <p>Adivinha? Estou escrevendo esta carta no <b>computador novo</b> lá de casa!
        O papai deixou eu digitar sozinha. O teclado faz clique-clique e é muito legal.</p>
        <p>Desculpa se a senhora tentou ligar e deu ocupado: é que quando a gente entra
        na internet, o telefone fica preso. A mamãe já brigou duas vezes. 🙈</p>
        <p>Depois eu imprimo uma foto minha na impressora (ela é bem barulhenta) e mando
        junto com a carta de papel, tá?</p>
        <p>Um beijo enorme,<br /><b>da sua neta Aninha</b> ❤️</p>
      </div>
      <p class="dica">💡 <b>Curiosidade:</b> em 1998 quase ninguém tinha e-mail em casa —
      carta de papel, com selo e tudo, ainda era o jeito mais comum de mandar notícia.</p>`,
  },
  {
    id: 'arq-trabalho',
    titulo: 'Trabalho de Ciências.doc — WordPad',
    icone: 'doc',
    html: `
      <div class="folha folha--trabalho">
        <p class="folha__titulo">OS PLANETAS DO SISTEMA SOLAR</p>
        <p class="folha__sub">Trabalho de Ciências — 3ª série — 1998</p>
        <p>O Sistema Solar tem <b>NOVE</b> planetas: Mercúrio, Vênus, Terra, Marte,
        Júpiter, Saturno, Urano, Netuno e Plutão.</p>
        <p>O maior é Júpiter, que é tão grande que caberiam mais de mil Terras dentro
        dele. O mais quente é Vênus. E Plutão é o mais longe e o mais friozinho de todos.</p>
        <p>Fonte: enciclopédia em CD-ROM do computador da escola.</p>
      </div>
      <p class="dica">💡 <b>Curiosidade:</b> a criança acertou! Em 1998 o Plutão AINDA era
      planeta — ele só foi "rebaixado" pra planeta-anão em 2006. E sem internet, pesquisa
      era na enciclopédia: livros enormes ou um CD-ROM cheio de figuras.</p>`,
  },
  {
    id: 'arq-diario',
    titulo: 'diário secreto.txt — Bloco de Notas',
    icone: 'txt',
    html: `
      <div class="folha folha--txt">
        <p>========================<br />DIÁRIO SECRETO!!!<br />NÃO LEIA!!! (você leu, né)<br />========================</p>
        <p>terça-feira</p>
        <p>hoje o papai deixou eu jogar campo minado. perdi 11 vezes. o computador é
        muito esperto ou eu tenho muito azar.</p>
        <p>segredo nº 1: escondi 3 figurinhas repetidas dentro do estojo azul pra trocar
        no recreio.</p>
        <p>segredo nº 2: a musiquinha que toca quando o windows liga é a coisa mais
        bonita que eu já ouvi. não conta pra ninguém.</p>
      </div>
      <p class="dica">💡 <b>Curiosidade:</b> arquivo .txt é só texto puro, sem cor nem
      desenho — por isso abria rapidinho até nos computadores mais fraquinhos.</p>`,
  },
  {
    id: 'arq-desenho',
    titulo: 'desenho da família.bmp — Paint',
    icone: 'imagem',
    classe: 'janela--paint',
    html: `
      <div class="paint">
        <div class="paint__paleta" aria-hidden="true">
          <i style="background:#000"></i><i style="background:#c00"></i><i style="background:#f90"></i><i style="background:#fd0"></i><i style="background:#090"></i><i style="background:#09f"></i><i style="background:#00c"></i><i style="background:#909"></i>
        </div>
        <div class="paint__tela">
          <svg viewBox="0 0 300 190" aria-label="Desenho de criança: casa, sol, família e cachorro">
            <rect x="0" y="0" width="300" height="190" fill="#fff"></rect>
            <circle cx="262" cy="30" r="16" fill="#fd0" stroke="#f90" stroke-width="2"></circle>
            <g stroke="#f90" stroke-width="2.5" stroke-linecap="round">
              <path d="M262 6 V-2 M262 54 V62 M238 30 H230 M286 30 H294 M245 13 L239 7 M279 47 L285 53 M279 13 L285 7 M245 47 L239 53"></path>
            </g>
            <path d="M30 20 Q38 10 48 16 Q58 8 66 16 Q76 12 74 22 Q64 30 52 26 Q40 32 30 20 Z" fill="#cfe8ff" stroke="#9cc" stroke-width="2"></path>
            <rect x="95" y="85" width="70" height="55" fill="#fbb" stroke="#c00" stroke-width="3"></rect>
            <path d="M88 85 L130 52 L172 85 Z" fill="#c00" stroke="#900" stroke-width="3"></path>
            <rect x="118" y="105" width="20" height="35" fill="#963" stroke="#630" stroke-width="2.5"></rect>
            <rect x="102" y="93" width="14" height="12" fill="#cfe8ff" stroke="#00c" stroke-width="2"></rect>
            <g stroke="#000" stroke-width="2.5" stroke-linecap="round" fill="none">
              <circle cx="205" cy="95" r="10" fill="#ffe1c4"></circle>
              <path d="M205 105 V132 M205 112 L192 122 M205 112 L218 122 M205 132 L196 152 M205 132 L214 152"></path>
              <circle cx="235" cy="100" r="9" fill="#ffe1c4"></circle>
              <path d="M235 109 V132 M235 114 L224 123 M235 114 L246 123 M235 132 L227 150 M235 132 L243 150"></path>
              <circle cx="260" cy="108" r="7" fill="#ffe1c4"></circle>
              <path d="M260 115 V132 M260 119 L252 126 M260 119 L268 126 M260 132 L254 146 M260 132 L266 146"></path>
            </g>
            <path d="M205 90 Q200 84 202 88 M235 96 Q230 90 232 94" stroke="#963" stroke-width="4" stroke-linecap="round" fill="none"></path>
            <g stroke="#630" stroke-width="2.5" stroke-linecap="round" fill="#e8b06a">
              <ellipse cx="45" cy="145" rx="16" ry="9"></ellipse>
              <circle cx="63" cy="138" r="6"></circle>
              <path d="M32 150 L28 158 M42 152 L40 160 M50 152 L52 160 M58 148 L62 156 M30 142 Q22 138 26 132" fill="none"></path>
            </g>
            <path d="M0 165 Q10 158 20 165 Q30 158 40 165 Q50 158 60 165 Q70 158 80 165 Q90 158 100 165 Q110 158 120 165 Q130 158 140 165 Q150 158 160 165 Q170 158 180 165 Q190 158 200 165 Q210 158 220 165 Q230 158 240 165 Q250 158 260 165 Q270 158 280 165 Q290 158 300 165" stroke="#090" stroke-width="3" fill="none"></path>
            <text x="150" y="182" text-anchor="middle" font-family="Comic Sans MS, cursive" font-size="11" fill="#00c">mamãe  papai  eu  e o Rex</text>
          </svg>
        </div>
      </div>
      <p class="dica">💡 <b>Curiosidade:</b> desenhar no Paint com aquele mouse de bolinha
      era um desafio — e .bmp era um formato tão pesado que UM desenho podia lotar um
      disquete inteiro.</p>`,
  },
  {
    id: 'arq-musica',
    titulo: 'musiquinha.mid — Tocador de Mídia',
    icone: 'musica',
    app: 'tocador',
    html: `
      <div class="tocador">
        <div class="tocador__visor bisel-campo">
          <span class="tocador__nota" aria-hidden="true">♪</span>
          <span data-midi-status>Parado</span>
        </div>
        <div class="tocador__botoes">
          <button type="button" class="bisel-alto" data-midi-tocar>▶ Tocar</button>
          <button type="button" class="bisel-alto" data-midi-parar>⏹ Parar</button>
        </div>
      </div>
      <p>Arquivo <b>.mid</b> (MIDI) não guardava o som gravado — guardava a <b>partitura</b>,
      e o computador tocava as notas na hora, com aquele timbre de videogame.</p>
      <p class="dica">💡 <b>Curiosidade:</b> uma música inteira em MIDI pesava menos que
      um segundo de MP3 — por isso os sites de 1998 viviam com musiquinha de fundo
      (que ninguém sabia como desligar).</p>`,
  },
];

// ============================================================
//  Mini-web do Internet Explorer — sites de mentirinha (1998).
//  '__erro__' é a página "não pode ser exibida". EDITE à vontade.
// ============================================================
const sites: DadosSim['sites'] = [
  {
    url: 'www.portaldaturminha.com.br',
    titulo: 'Portal da Turminha',
    html: `
  <div class="pg pg--home">
    <div class="pg-marquee" aria-hidden="true"><span>★ ★ ★ BEM-VINDO AO PORTAL DA TURMINHA!!! ★ ★ ★ O MELHOR SITE DO BRASIL (segundo a minha mãe) ★ ★ ★ VOLTE SEMPRE E CONTE PROS AMIGOS!!! ★ ★ ★</span></div>
    <h1>☆ Portal da Turminha ☆</h1>
    <p class="pg-centro">A página <b>mais legal</b> da internet, feita por mim mesmo no computador da família.<br />Atualizada sempre que o telefone deixa!</p>
    <p class="pg-centro">Você é o visitante número:<br /><span class="pg-odometro" data-visitas>004.318</span><br /><small>(uau!!! quase TUDO ISSO de gente!)</small></p>
    <hr class="pg-hr" />
    <h2>⭐ Meus sites favoritos ⭐</h2>
    <ul>
      <li>😂 <a href="#" data-vai="www.piadasdorecreio.com.br">Piadas do Recreio</a> — pra rir até a barriga doer!</li>
      <li>🦖 <a href="#" data-vai="www.dinomania.com.br">DinoMania</a> — TUDO sobre dinossauros (até os do Brasil)!</li>
      <li>💾 <a href="#" data-vai="www.baixatudo.com.br">Baixa Tudo!</a> — jogos grátis pra baixar. Um dia o download termina.</li>
    </ul>
    <div class="pg-obras">
      <span class="pg-obras__faixa"></span>
      <p>🚧 <b>EM CONSTRUÇÃO</b> 🚧<br />Em breve nesta página: minha coleção de figurinhas, fotos do meu cachorro Bidu<br />e uma página SECRETA. Aguardem!!!</p>
      <span class="pg-obras__faixa"></span>
    </div>
    <p class="pg-centro">✍️ <a href="#" data-vai="www.livroderecados.com.br">Assine o meu livro de recados!</a><br /><small>(se o link não funcionar, tenta de novo semana que vem)</small></p>
    <p class="pg-rodape">Este site fica melhor numa tela de 800×600.<br />Feito no Bloco de Notas, com muito carinho. © 1998</p>
  </div>`,
  },
  {
    url: 'www.piadasdorecreio.com.br',
    titulo: 'Piadas do Recreio',
    html: `
  <div class="pg pg--piadas">
    <h1>😂 Piadas do Recreio 😂</h1>
    <p class="pg-centro">As melhores piadas da escola, testadas e aprovadas na hora do lanche!<br /><b>PIADAS NOVAS TODA SEMANA</b> (quando eu lembrar)</p>
    <div class="pg-piada"><p><b>Por que o jacaré tirou o filho da escola?</b></p><p class="pg-resposta">Porque ele réptil de ano! 🐊</p></div>
    <div class="pg-piada"><p><b>O que o pato disse pra pata?</b></p><p class="pg-resposta">Vem quá! 🦆</p></div>
    <div class="pg-piada"><p><b>Qual é o animal mais antigo do mundo?</b></p><p class="pg-resposta">A zebra — porque ela ainda é em preto e branco! 🦓</p></div>
    <div class="pg-piada"><p><b>O que o tomate foi fazer no banco?</b></p><p class="pg-resposta">Tirar o extrato! 🍅</p></div>
    <div class="pg-piada"><p><b>Por que o computador foi parar no médico?</b></p><p class="pg-resposta">Porque pegou um vírus! 🤒💻</p></div>
    <p class="pg-dica">📬 Quer mandar a sua piada pra cá? Me manda um e-mail! Mas tenha paciência: aqui em casa a internet só conecta quando NINGUÉM precisa usar o telefone…</p>
    <p class="pg-nav">🏠 <a href="#" data-vai="www.portaldaturminha.com.br">Portal da Turminha</a> • 🦖 <a href="#" data-vai="www.dinomania.com.br">DinoMania</a> • 💾 <a href="#" data-vai="www.baixatudo.com.br">Baixa Tudo!</a></p>
    <p class="pg-rodape">Piadas do Recreio © 1998 — proibido contar sem dar risada.</p>
  </div>`,
  },
  {
    url: 'www.dinomania.com.br',
    titulo: 'DinoMania',
    html: `
  <div class="pg pg--dinos">
    <h1>🦖 DinoMania 🦕</h1>
    <p class="pg-centro">A página de dinossauros MAIS COMPLETA do Brasil inteiro!*<br /><small>*que eu conheço</small></p>
    <h2>Você sabia? (tudo verdade!)</h2>
    <ul>
      <li>O <b>Brasil tinha dinossauros!</b> O <b>estauricossauro</b> viveu no Rio Grande do Sul há uns 230 milhões de anos — é um dos dinossauros mais antigos já encontrados no MUNDO inteiro.</li>
      <li>O <b>tiranossauro rex</b> tinha dentes do tamanho de uma banana. 🍌</li>
      <li>As aves são parentes dos dinossauros. Isso mesmo: a <b>galinha</b> é tipo uma prima (bem) distante do T-rex. 🐔</li>
      <li>Ninguém sabe a cor de verdade dos dinossauros: os ossos viram fóssil, mas a pele quase nunca. Pode ser que o T-rex fosse cor-de-rosa. Ninguém pode provar que não.</li>
    </ul>
    <div class="pg-enquete">
      <p><b>📊 ENQUETE DA SEMANA:</b> qual é o dinossauro mais legal?</p>
      <label><input type="radio" name="dino" value="trex" /> Tiranossauro rex (o famoso)</label>
      <label><input type="radio" name="dino" value="brasileiro" /> Estauricossauro (o brasileiro!)</label>
      <label><input type="radio" name="dino" value="pescocudo" /> Braquiossauro (o pescoçudo)</label>
      <label><input type="radio" name="dino" value="galinha" /> A galinha (tecnicamente conta)</label>
      <p><button type="button" class="bisel-alto pg-baixar" data-votar>Votar!</button></p>
    </div>
    <p class="pg-nav">🏠 <a href="#" data-vai="www.portaldaturminha.com.br">Portal da Turminha</a> • 😂 <a href="#" data-vai="www.piadasdorecreio.com.br">Piadas do Recreio</a> • 💾 <a href="#" data-vai="www.baixatudo.com.br">Baixa Tudo!</a></p>
    <p class="pg-rodape">DinoMania © 1998 — todos os rugidos reservados.</p>
  </div>`,
  },
  {
    url: 'www.baixatudo.com.br',
    titulo: 'Baixa Tudo!',
    html: `
  <div class="pg pg--baixa">
    <h1>💾 BAIXA TUDO! 💾</h1>
    <p class="pg-centro">Jogos GRÁTIS pra baixar!<br /><b>Grátis, sim. Rápido… não.</b></p>
    <table class="pg-tabela">
      <thead>
        <tr><th>Jogo</th><th>Tamanho</th><th>Tempo pra baixar*</th><th>&nbsp;</th></tr>
      </thead>
      <tbody>
        <tr><td>🐍 Cobrinha Espacial</td><td>800 KB</td><td>4 minutos</td><td><button type="button" class="bisel-alto pg-baixar" data-baixar="Cobrinha Espacial">Baixar</button></td></tr>
        <tr><td>🏎️ Corrida Maluca 98</td><td>2,5 MB</td><td>12 minutos</td><td><button type="button" class="bisel-alto pg-baixar" data-baixar="Corrida Maluca 98">Baixar</button></td></tr>
        <tr><td>🧙 A Masmorra do Mago</td><td>34 MB</td><td>quase 3 HORAS</td><td><button type="button" class="bisel-alto pg-baixar" data-baixar="A Masmorra do Mago">Baixar</button></td></tr>
        <tr><td>⚽ Super Futebol Estrela</td><td>300 MB</td><td>17 HORAS 😱</td><td><button type="button" class="bisel-alto pg-baixar" data-baixar="Super Futebol Estrela">Baixar</button></td></tr>
      </tbody>
    </table>
    <p><small>*Tempo com modem de 56k e NINGUÉM usando o telefone de casa. Se alguém atender, o download cai e começa TUDO DE NOVO.</small></p>
    <p class="pg-dica">💡 <b>Verdade de 1998:</b> a internet discada usava a linha do telefone. Pra baixar um jogo grandão, o computador ficava a noite INTEIRA ligado — e a família inteira torcendo pra ninguém ligar lá pra casa.</p>
    <p class="pg-nav">🏠 <a href="#" data-vai="www.portaldaturminha.com.br">Portal da Turminha</a> • 😂 <a href="#" data-vai="www.piadasdorecreio.com.br">Piadas do Recreio</a> • 🦖 <a href="#" data-vai="www.dinomania.com.br">DinoMania</a></p>
    <p class="pg-rodape">Baixa Tudo! © 1998 — 100% grátis, 0% rápido.</p>
  </div>`,
  },
  {
    url: '__erro__',
    titulo: 'A página não pode ser exibida',
    html: `
  <div class="pg pg--erro">
    <h1>A página não pode ser exibida</h1>
    <p>A página que você está procurando não está disponível no momento. O site pode estar com problemas… ou talvez esse endereço <b>nem exista</b>.</p>
    <hr class="pg-hr" />
    <p><b>Tente o seguinte:</b></p>
    <ul>
      <li>Confira se você digitou o endereço certinho, letra por letra.</li>
      <li>Clique no botão <b>⟳ Atualizar</b> pra tentar de novo.</li>
      <li>Clique em <b>🏠 Início</b> pra voltar pra página inicial.</li>
    </ul>
    <p class="pg-erro__tec">Não é possível localizar o servidor ou erro de DNS<br />Internet Explorer (de mentirinha)<br />Endereço digitado: <b data-url-erro></b></p>
    <p class="pg-dica">💡 <b>Curiosidade:</b> em 1998 a internet era pequenininha — a maioria dos endereços que você inventasse não existia mesmo. Hoje existem mais de UM BILHÃO de sites!</p>
  </div>`,
  },
];

export const dados: DadosSim = {
  chave: 'win98',
  // PNGs pixel-art opcionais cobrem os SVGs desenhados (padrão triplo do
  // motor); o que não tiver PNG aqui continua com o símbolo do sprite
  pastaIcones: '/class/sims/icons/98/',
  janelas,
  sites,

  // Arquivos que já vêm "de fábrica" em Meus Documentos (não podem ser
  // excluídos; cada um abre a própria janela-visualizadora acima — o
  // Leia-me abre no Bloco de Notas de verdade, editável mas protegido:
  // Salvar numa nota de fábrica cai no "salvar como" e vira cópia do aluno)
  arquivosSeed: [
    {
      id: 'arq-leiame',
      icone: 'bloco',
      nome: 'Leia-me.txt',
      abrirCom: 'bloco-de-notas',
      texto: [
        'Olá, turma! Bem-vindos a 1998!',
        '',
        'Este é o Windows 98, o sistema que os computadores usavam quando o professor Manolo era criança. Explorem à vontade: cliquem nos ícones da tela e no menu Iniciar.',
        '',
        'Este arquivo está aberto no Bloco de Notas — podem apagar tudo e escrever o que quiserem! Pra guardar, cliquem em Salvar e deem um nome: a nota vai aparecer na pasta Meus Documentos.',
        '',
        'Dica: dá pra arrastar as janelas segurando na barra azul e mudar o tamanho delas puxando pelo cantinho de baixo.',
        '',
        'Curiosidade: antigamente era preciso clicar DUAS vezes bem rapidinho pra abrir um ícone. Aqui deixamos um clique só — de nada. :)',
      ].join('\n'),
    },
    { id: 'arq-carta', icone: 'doc', nome: 'Carta pra vovó.doc', janela: 'arq-carta' },
    { id: 'arq-trabalho', icone: 'doc', nome: 'Trabalho de Ciências.doc', janela: 'arq-trabalho' },
    { id: 'arq-diario', icone: 'txt', nome: 'diário secreto.txt', janela: 'arq-diario' },
    { id: 'arq-desenho', icone: 'imagem', nome: 'desenho da família.bmp', janela: 'arq-desenho' },
    { id: 'arq-musica', icone: 'musica', nome: 'musiquinha.mid', janela: 'arq-musica' },
  ],

  // Ícones da área de trabalho (na ordem da coluna)
  iconesDesktop: [
    { id: 'meu-computador', icone: 'computador', rotulo: 'Meu Computador' },
    { id: 'meus-documentos', icone: 'pasta', rotulo: 'Meus Documentos' },
    { id: 'lixeira', icone: 'lixeira', rotulo: 'Lixeira' },
    { id: 'internet-explorer', icone: 'ie', rotulo: 'Internet Explorer' },
    { abreArquivo: 'arq-leiame', icone: 'bloco', rotulo: 'Leia-me.txt' },
  ],

  // Itens do menu Iniciar — Programas abre a cascata (como no Win98 real)
  menu: [
    {
      icone: 'programas',
      rotulo: 'Programas',
      submenu: [
        { id: 'bloco-de-notas', icone: 'bloco', rotulo: 'Bloco de Notas' },
        { id: 'internet-explorer', icone: 'ie', rotulo: 'Internet Explorer' },
        { id: 'programas', icone: 'ajuda', rotulo: 'O que eram os programas?' },
      ],
    },
    { id: 'documentos', icone: 'pasta', rotulo: 'Documentos' },
    { id: 'configuracoes', icone: 'config', rotulo: 'Configurações' },
    { id: 'ajuda', icone: 'ajuda', rotulo: 'Ajuda' },
    { id: 'executar', icone: 'executar', rotulo: 'Executar…' },
  ],
  desligar: { icone: 'computador', rotulo: 'Desligar…' },

  navegador: { home: 'www.portaldaturminha.com.br' },

  sons: {
    // acorde de ligar: notas sobrepostas, começando 0.09s uma após a outra
    ligar: { notas: [[392, 0.8], [523, 0.8], [659, 0.8]], passo: 0.09, tipo: 'triangle', vol: 0.15 },
    // melodia própria, alegre, timbre de computador antigo — sem música com direitos
    melodia: {
      notas: [
        [523, 0.2], [659, 0.2], [784, 0.2], [1047, 0.35],
        [784, 0.2], [880, 0.2], [1047, 0.5],
        [880, 0.2], [784, 0.2], [659, 0.2], [587, 0.35], [523, 0.65],
      ],
      tipo: 'triangle',
      vol: 0.13,
    },
  },

  tempos: { boot: 3000, bootReduzido: 800, desligar: 1400, desligarReduzido: 300, navegacao: 400 },

  textos: {
    // sistema
    ligado: 'Computador ligado. Você está na área de trabalho do Windows 98. Use Tab pra passear pelos ícones e Enter pra abrir.',
    desligando: 'O Windows está sendo desligado.',
    desligado: 'Agora é seguro desligar o seu computador. Aperte o botão pra ligar de novo.',
    janelaAberta: 'Janela aberta: {titulo}',
    janelaFechada: 'Janela fechada.',
    // navegador
    pronto: 'Pronto',
    conectando: 'Conectando a {url}…',
    concluido: 'Concluído',
    erroPagina: 'A página não pode ser exibida.',
    paginaCarregada: 'Página carregada: {titulo}',
    digiteEndereco: 'Digite um endereço. Exemplo: www.dinomania.com.br',
    baixando: 'Baixando {nome}… faltam 3 horas e 47 minutos ⏳',
    downloadCaiu: '☎️ Alguém pegou o telefone! Download cancelado. Tente de novo… ou aceite. 😅',
    votou: 'Voto computado! Obrigado por votar (de mentirinha). 🗳️',
    // tocador
    tocando: 'Tocando… ♪ ♫',
    parado: 'Parado',
    somDesligado: 'Som desligado! Liga no alto-falante 🔊',
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
