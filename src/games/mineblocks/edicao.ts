// Quebrar e colocar blocos, do jeito Minecraft de verdade:
// - quebrar leva TEMPO (segurar golpeia; rachadura cresce no bloco)
// - quebrar rende o DROP no inventário; item novo entra na hotbar
// - colocar consome do slot selecionado da hotbar
// - folhas naturais sem tronco conectado DECAEM em cascata
// - muda plantada vira árvore com o tempo
// Regras de proteção: rocha-mãe não quebra; não coloca dentro do corpo
// (checagem exata — o pillar-up depende dela).
import * as THREE from 'three';
import { brotarArvore } from './geracao';
import type { Alvo, Contexto, Edicao } from './tipos';

const FOLHA_NATURAL = 7;
const FOLHA_COLOCADA = 16;
const TRONCO = 5;
const BAU = 17;
const PORTA_FECHADA = 18;
const PORTA_ABERTA = 19;
const PLACA = 20;
const PICKAXE = 24;
const IRON_PICKAXE = 28;
const SWORD_WOOD = 30;
const SWORD_IRON = 31;
const AXE_WOOD = 32;
const AXE_IRON = 33;
const MELEE = 3.2; // alcance do golpe de espada (blocos)
const CONE = 0.6; // cosseno do cone à frente pra mirar bicho/fantasma
const SWING_MS = 350; // intervalo entre golpes segurando a espada
const FORNALHA = 27;
const CAIXA = 34;
const PACOTE = 35;
const ehPorta = (id: number) => id === PORTA_FECHADA || id === PORTA_ABERTA;

export function criarEdicao(ctx: Contexto): Edicao {
  const { mundo, jogador, porId, cfg } = ctx;
  const meia = cfg.jogador.largura / 2;
  let avisoTimer = 0;
  // relógio de simulação compartilhado: mudas + decay congelam na pausa
  let tempoMs = 0;
  const mudas: Array<{ x: number; y: number; z: number; quandoMs: number }> = [];

  // ----- golpe (quebra com tempo) -----
  let progresso = 0; // ms acumulados no alvo atual
  let alvoGolpe: Alvo | null = null;
  let estaGolpeando = false;
  let ultimoToc = 0;
  let meleeCdMs = SWING_MS; // pronto: o 1º golpe sai na hora

  // mesh de rachadura: cubo levinho por cima do bloco golpeado,
  // trocando o tile (17→19) conforme o progresso
  const matRachadura = new THREE.MeshBasicMaterial({
    map: ctx.textura.atlas,
    alphaTest: 0.4,
    transparent: true,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    side: THREE.DoubleSide,
  });
  const geoRachadura = new THREE.BoxGeometry(1.001, 1.001, 1.001);
  const rachadura = new THREE.Mesh(geoRachadura, matRachadura);
  rachadura.frustumCulled = false;
  rachadura.visible = false;
  ctx.scene.add(rachadura);
  let tileRachadura = -1;

  function aplicarTileRachadura(tile: number) {
    if (tile === tileRachadura) return;
    tileRachadura = tile;
    const [u0, v0, u1, v1] = ctx.textura.uv(tile);
    const uv = geoRachadura.attributes.uv as THREE.BufferAttribute;
    // BoxGeometry: 6 faces × 4 verts com uv padrão (0..1); remapeia pro tile
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, uv.getX(i) > 0.5 ? u1 : u0, uv.getY(i) > 0.5 ? v1 : v0);
    }
    uv.needsUpdate = true;
  }
  // uv original do Box é 0/1 → o remapeio acima só funciona partindo do
  // padrão; guarda uma cópia pra reprocessar a cada troca de tile
  const uvOriginal = (geoRachadura.attributes.uv as THREE.BufferAttribute).array.slice();
  function trocarTile(tile: number) {
    if (tile === tileRachadura) return;
    (geoRachadura.attributes.uv as THREE.BufferAttribute).array.set(uvOriginal);
    tileRachadura = -1;
    aplicarTileRachadura(tile);
  }

  function esconderRachadura() {
    rachadura.visible = false;
    progresso = 0;
    alvoGolpe = null;
  }

  function avisar(msg: string): boolean {
    const agora = performance.now();
    if (agora - avisoTimer < 1200) return false;
    avisoTimer = agora;
    ctx.ui.mostrarToast(msg, 'info', 1600);
    return true;
  }

  function intersectaJogador(cx: number, cy: number, cz: number): boolean {
    return (
      jogador.x + meia > cx && jogador.x - meia < cx + 1 &&
      jogador.y + cfg.jogador.altura > cy && jogador.y < cy + 1 &&
      jogador.z + meia > cz && jogador.z - meia < cz + 1
    );
  }

  // ----- inventário / hotbar dinâmica -----
  function registrarItemNaHotbar(item: number): boolean {
    // materiais (lã etc.) não são colocáveis → nunca viram atalho da hotbar
    // (true = "nada a fazer", sem aviso de hotbar cheia)
    if (!ctx.itens.includes(item)) return true;
    const slots = ctx.estado.hotbarSlots;
    if (slots.includes(item)) return true;
    const vazio = slots.indexOf(0);
    if (vazio >= 0) { slots[vazio] = item; return true; }
    return false; // hotbar cheia: item fica só no inventário (E)
  }

  // ----- dono/permissão (baú e placa) -----
  function meuNome(): string {
    return ctx.sync.emSala() ? ctx.sync.meuNomeNaSala() : '';
  }
  // dono do baú/autor da placa × quem sou eu agora
  function podeUsar(dono: string): boolean {
    if (dono === '*') return true;
    if (!ctx.sync.emSala()) return true; // solo: tudo é seu
    if (ctx.sync.emVisita()) return dono === ctx.sync.meuNomeNaSala();
    return dono === '' || dono === ctx.sync.meuNomeNaSala(); // dono do mundo
  }

  // deposita item(ns) direto no inventário (transferência de logout, baú
  // quebrado): sem drop, sem som repetido
  function ganharItemPublico(id: number, n = 1) {
    if (id <= 0 || id >= ctx.blocos.length || n <= 0) return;
    const inv = ctx.estado.inventario;
    inv[id] = Math.min(999, (inv[id] || 0) + n);
    registrarItemNaHotbar(id);
    ctx.ui.atualizarContagens();
  }

  function ganharItem(idQuebrado: number) {
    const inv = ctx.estado.inventario;
    const def = porId(idQuebrado);
    const item = def.drop ?? idQuebrado;
    if (item !== 0) {
      inv[item] = Math.min(999, (inv[item] || 0) + 1);
      if (!registrarItemNaHotbar(item)) {
        avisar('🎒 Hotbar cheia! O item foi pro inventário — aperte E pra ver.');
      }
      ctx.ui.atualizarContagens();
      ctx.ui.anunciar('Pegou ' + porId(item).nome + '! Você tem ' + inv[item] + '.');
    }
    // drop de sorte: das folhas naturais às vezes cai uma muda
    if (def.dropSorte && Math.random() < def.dropSorte.chance) {
      const s = def.dropSorte.id;
      inv[s] = Math.min(999, (inv[s] || 0) + 1);
      registrarItemNaHotbar(s);
      ctx.ui.atualizarContagens();
      ctx.ui.mostrarToast('🌱 Caiu uma ' + porId(s).nome + '! Plante em grama ou terra.', 'ok', 2200);
      ctx.audio.somSalvo();
    }
  }

  // baú/placa quebrado limpa a metadata; baú despeja o conteúdo no dono
  function limparMetaAoQuebrar(x: number, y: number, z: number) {
    const m = ctx.metas.obter(x, y, z);
    if (!m) return;
    if (m.tipo === 'bau') {
      for (let id = 0; id < m.itens.length; id++) ganharItemPublico(id, m.itens[id] | 0);
    }
    ctx.metas.remover(x, y, z);
  }

  // ----- quebrar (comum ao golpe e ao backdoor instantâneo) -----
  function removerBloco(a: Alvo): boolean {
    limparMetaAoQuebrar(a.x, a.y, a.z); // ANTES do definir(0) — usa o id ainda
    // porta ocupa 2 blocos: quebrar qualquer metade some com as duas e
    // devolve 1 porta só (drop → 18)
    if (ehPorta(a.id)) {
      const oy = ehPorta(mundo.obter(a.x, a.y + 1, a.z)) ? a.y + 1
        : ehPorta(mundo.obter(a.x, a.y - 1, a.z)) ? a.y - 1 : null;
      mundo.definir(a.x, a.y, a.z, 0);
      if (oy !== null) mundo.definir(a.x, oy, a.z, 0);
      ganharItem(a.id);
      ctx.audio.somQuebrar(a.id);
      ctx.salvar.agendar();
      ctx.fluxo.aoPrimeiroInput();
      return true;
    }
    mundo.definir(a.x, a.y, a.z, 0);
    ganharItem(a.id);
    // flor/muda em cima perdeu o chão? cai junto (e vai pro bolso)
    const acima = mundo.obter(a.x, a.y + 1, a.z);
    if (acima !== 0 && porId(acima).render === 'cruz') {
      mundo.definir(a.x, a.y + 1, a.z, 0);
      ganharItem(acima);
      ctx.metas.remover(a.x, a.y + 1, a.z); // placa derrubada não deixa meta órfã
    }
    // tronco/folha removida: folhas vizinhas podem ter ficado órfãs
    if (a.id === TRONCO || a.id === FOLHA_NATURAL || a.id === FOLHA_COLOCADA) {
      enfileirarVizinhas(a.x, a.y, a.z);
    }
    ctx.audio.somQuebrar(a.id);
    ctx.salvar.agendar();
    ctx.fluxo.aoPrimeiroInput();
    return true;
  }

  function heldItem(): number {
    return ctx.estado.hotbarSlots[ctx.estado.sel] || 0;
  }

  function holdingPickaxe(): boolean {
    const h = heldItem();
    return h === PICKAXE || h === IRON_PICKAXE;
  }

  function holdingSword(): boolean {
    const h = heldItem();
    return h === SWORD_WOOD || h === SWORD_IRON;
  }

  function holdingAxe(): boolean {
    const h = heldItem();
    return h === AXE_WOOD || h === AXE_IRON;
  }

  function danoEspada(): number {
    return heldItem() === SWORD_IRON ? 3 : 1; // ferro mata o Kotsooh num golpe
  }

  // ----- caixa de correio: casa = contorno 2D fechado COM porta (sem teto) -----
  const { SX, SZ } = cfg.mundo;
  const chave2 = (x: number, z: number) => x + z * SX;
  const NEI4 = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;

  // desce da altura da caixa até o nível LOGO ACIMA do chão — é ali que ficam
  // a base das paredes e da porta, então o contorno é testado nesse nível
  // (a caixa pode estar pregada bem alto numa parede de vários blocos).
  function nivelDoChao(x: number, yTopo: number, z: number): number {
    for (let y = yTopo; y > 1 && y > yTopo - 16; y--) {
      const abaixo = mundo.obter(x, y - 1, z);
      if (abaixo !== 0 && porId(abaixo).solido) return y;
    }
    return yTopo;
  }
  // BFS 2D no nível do contorno (chão+1): anda pelas celas passáveis; parede
  // (sólido) e porta barram (viram `casca`). fechada=false se vazar; hasPorta
  // = tocou porta. yHint = altura da caixa; o nível real é derivado do chão.
  function casaDe(x0: number, yHint: number, z0: number): { fechada: boolean; hasPorta: boolean; dentro: Set<number>; casca: Set<number> } {
    const CAP = 1500;
    const RAIO = 24;
    const y0 = nivelDoChao(x0, yHint, z0);
    const dentro = new Set<number>();
    const casca = new Set<number>();
    const primeiro = mundo.obter(x0, y0, z0);
    if ((primeiro !== 0 && porId(primeiro).solido) || ehPorta(primeiro)) return { fechada: false, hasPorta: false, dentro, casca };
    let hasPorta = false;
    const visto = new Set<number>([chave2(x0, z0)]);
    let borda: Array<[number, number]> = [[x0, z0]];
    let contados = 1;
    while (borda.length) {
      const prox: Array<[number, number]> = [];
      for (const [x, z] of borda) {
        dentro.add(chave2(x, z));
        for (const [dx, dz] of NEI4) {
          const nx = x + dx;
          const nz = z + dz;
          const id = mundo.obter(nx, y0, nz);
          if (ehPorta(id)) { casca.add(chave2(nx, nz)); hasPorta = true; continue; }
          if (id !== 0 && porId(id).solido) { casca.add(chave2(nx, nz)); continue; }
          if (Math.abs(nx - x0) > RAIO || Math.abs(nz - z0) > RAIO) return { fechada: false, hasPorta, dentro, casca };
          const k = chave2(nx, nz);
          if (visto.has(k)) continue;
          visto.add(k);
          if (++contados > CAP) return { fechada: false, hasPorta, dentro, casca };
          prox.push([nx, nz]);
        }
      }
      borda = prox;
    }
    return { fechada: true, hasPorta, dentro, casca };
  }
  function temAlgumaCaixa(): boolean {
    for (const m of ctx.metas.todos().values()) if (m.tipo === 'caixa') return true;
    return false;
  }
  // colunas (x,z) protegidas por uma caixa; memo por caixa (o flood roda por
  // caixa, não por alvo). ok = contorno fechado E com porta.
  const casaMemo = new Map<number, { ms: number; ok: boolean; colunas: Set<number> }>();
  function casaDaCaixa(caixaKey: number): { ok: boolean; colunas: Set<number> } {
    const agora = performance.now();
    const cache = casaMemo.get(caixaKey);
    if (cache && agora - cache.ms < 500) return cache;
    const cx = caixaKey % SX;
    const cz = Math.floor(caixaKey / SX) % SZ;
    const cy = Math.floor(caixaKey / (SX * SZ));
    const r = casaDe(cx, cy, cz);
    const colunas = new Set<number>([...r.dentro, ...r.casca]);
    const res = { ms: agora, ok: r.fechada && r.hasPorta, colunas };
    casaMemo.set(caixaKey, res);
    return res;
  }
  // memo curto: podeQuebrar roda todo frame enquanto segura o golpe
  let protMemoK = -1;
  let protMemoMs = -1e9;
  let protMemoDono: string | null = null;
  function donoQueProtege(a: Alvo): string | null {
    if (!temAlgumaCaixa()) return null;
    const k = ctx.metas.chaveDe(a.x, a.y, a.z);
    const agora = performance.now();
    if (k === protMemoK && agora - protMemoMs < 200) return protMemoDono;
    const col = chave2(a.x, a.z);
    let dono: string | null = null;
    for (const [ck, m] of ctx.metas.todos()) {
      if (m.tipo !== 'caixa') continue;
      const casa = casaDaCaixa(ck);
      if (casa.ok && casa.colunas.has(col)) { dono = m.dono; break; }
    }
    protMemoK = k;
    protMemoMs = agora;
    protMemoDono = dono;
    return dono;
  }

  function podeQuebrar(a: Alvo): boolean {
    if (a.id === 14 || porId(a.id).dureza === undefined) {
      avisar('🪨 Essa rocha do fundo não quebra!');
      return false;
    }
    if (porId(a.id).precisaPicareta && !holdingPickaxe()) {
      avisar('⛏ ' + porId(a.id).nome + ' é duro demais pra mão! Segure uma picareta.');
      return false;
    }
    // baú é protegido: só o dono quebra (senão qualquer um roubava o conteúdo)
    if (a.id === BAU) {
      const m = ctx.metas.obter(a.x, a.y, a.z);
      if (m && m.tipo === 'bau' && !podeUsar(m.dono)) {
        avisar('🔒 Esse baú é do(a) ' + (m.dono || 'dono') + '! Só ele(a) pode quebrar.');
        return false;
      }
    }
    // a própria caixa de correio: só o dono a quebra (e assim tira a proteção)
    if (a.id === CAIXA) {
      const m = ctx.metas.obter(a.x, a.y, a.z);
      if (m && m.tipo === 'caixa' && !podeUsar(m.dono)) {
        avisar('🔒 Essa caixa é do(a) ' + (m.dono || 'dono') + '!');
        return false;
      }
      return true;
    }
    // casa com caixa de correio: só o dono quebra os blocos de dentro
    const protetor = donoQueProtege(a);
    if (protetor !== null && !podeUsar(protetor)) {
      avisar('🔒 Essa casa é do(a) ' + protetor + '! Só ele(a) mexe aqui.');
      return false;
    }
    return true;
  }

  // backdoor de teste/depuração: quebra na hora, sem golpe
  function quebrar(alvoForcado?: Alvo): boolean {
    if (ctx.estado.fase !== 'jogando') return false;
    const a = alvoForcado || ctx.mira.alvo();
    if (!a) return false;
    if (!podeQuebrar(a)) return false;
    return removerBloco(a);
  }

  // gameplay real: segurar golpeia até quebrar
  // espada: em vez de minerar, golpeia o fantasma/bicho mais perto à frente
  function golpearComEspada(dt: number) {
    esconderRachadura();
    meleeCdMs += dt * 1000;
    if (meleeCdMs < SWING_MS) return;
    meleeCdMs = 0;
    const ex = jogador.x;
    const ey = jogador.y + cfg.jogador.olho;
    const ez = jogador.z;
    const fx = -Math.sin(jogador.yaw) * Math.cos(jogador.pitch);
    const fy = Math.sin(jogador.pitch);
    const fz = -Math.cos(jogador.yaw) * Math.cos(jogador.pitch);
    const g = ctx.kotsooh.atingir(ex, ey, ez, fx, fy, fz, MELEE, CONE, danoEspada());
    if (g.acertou) {
      ctx.ui.flashSusto();
      if (g.evaporou) {
        ctx.audio.somFantasma();
        ctx.ui.mostrarToast('👻 Puff! O Kotsooh evaporou!', 'ok', 1800);
      } else {
        ctx.audio.somSusto();
      }
      ctx.fluxo.aoPrimeiroInput();
      return;
    }
    if (ctx.mob.assustar(ex, ey, ez, fx, fy, fz, MELEE, CONE)) {
      ctx.audio.somSalvo();
      ctx.ui.mostrarToast('🐾 O Winpup fugiu assustado!', 'info', 1500);
      ctx.fluxo.aoPrimeiroInput();
      return;
    }
    ctx.audio.somPulo(); // golpe no ar
  }

  function golpear(dt: number) {
    if (ctx.estado.fase !== 'jogando') { esconderRachadura(); return; }
    estaGolpeando = true;
    if (holdingSword()) { golpearComEspada(dt); return; }
    const a = ctx.mira.alvo();
    if (!a || !podeQuebrar(a)) { esconderRachadura(); return; }
    // mudou de alvo: progresso zera (Minecraft moderno) e o 1º toc só
    // vem depois de segurar de verdade (flick de olhar não faz croc)
    if (!alvoGolpe || alvoGolpe.x !== a.x || alvoGolpe.y !== a.y || alvoGolpe.z !== a.z) {
      alvoGolpe = a;
      progresso = 0;
      ultimoToc = tempoMs;
    }
    progresso += dt * 1000;
    const defAlvo = porId(a.id);
    const tool = heldItem();
    let dureza = tool === IRON_PICKAXE && defAlvo.durezaFerro !== undefined ? defAlvo.durezaFerro
      : holdingPickaxe() && defAlvo.durezaPicareta !== undefined ? defAlvo.durezaPicareta
        : defAlvo.dureza!;
    if (defAlvo.madeira && holdingAxe()) dureza /= tool === AXE_IRON ? 3.5 : 2;
    if (progresso >= dureza) {
      removerBloco(a); // o som cheio vem daqui — sem toc empilhado
      esconderRachadura();
      return;
    }
    // toc-toc enquanto bate
    if (tempoMs - ultimoToc > 240) {
      ultimoToc = tempoMs;
      ctx.audio.somQuebrar(a.id);
    }
    const frac = progresso / dureza;
    trocarTile(frac < 0.34 ? 17 : frac < 0.67 ? 18 : 19);
    rachadura.position.set(a.x + 0.5, a.y + 0.5, a.z + 0.5);
    // flick de <90ms não pisca rachadura; cruz (flor/muda) não ganha
    // cubo de riscos flutuando em volta
    rachadura.visible = progresso > 90 && porId(a.id).render !== 'cruz';
  }

  function soltarGolpe() {
    estaGolpeando = false;
    meleeCdMs = SWING_MS; // solta e re-arma: o próximo golpe sai na hora
    esconderRachadura();
  }

  // ----- colocar -----
  function colocar(alvoForcado?: Alvo): boolean {
    if (ctx.estado.fase !== 'jogando') return false;
    const a = alvoForcado || ctx.mira.alvo();
    if (!a) return false;
    const id = ctx.estado.hotbarSlots[ctx.estado.sel];
    if (!id) {
      if (avisar('🎒 Esse espaço da hotbar está vazio! Escolha um item no inventário (E).')) ctx.audio.somErro();
      return false;
    }
    const def = porId(id);
    if (def.ferramenta) {
      if (avisar('🛠 ' + def.nome + ' é ferramenta! Segure e bata pra usar — não dá pra colocar no chão.')) ctx.audio.somErro();
      return false;
    }
    if (id === CAIXA) return colocarCaixa(a);
    if ((ctx.estado.inventario[id] || 0) <= 0) {
      if (avisar('🎒 Você não tem ' + def.nome + '! Quebre blocos pra ganhar.')) ctx.audio.somErro();
      return false;
    }
    // flor mirada é SUBSTITUÍDA no lugar; bloco normal vai na face
    const alvoDireto = porId(a.id).render === 'cruz';
    const cx = alvoDireto ? a.x : a.x + a.nx;
    const cy = alvoDireto ? a.y : a.y + a.ny;
    const cz = alvoDireto ? a.z : a.z + a.nz;
    const { SX, SZ, tetoConstrucao } = ctx.cfg.mundo;
    if (cx < 0 || cx >= SX || cz < 0 || cz >= SZ || cy < 1 || cy > tetoConstrucao) return false;
    const ocupante = mundo.obter(cx, cy, cz);
    if (ocupante !== 0 && porId(ocupante).render === 'cubo') return false;
    if (ocupante !== 0 && porId(ocupante).render === 'recorte') return false;
    if (ocupante !== 0 && porId(ocupante).render === 'porta') return false; // não sobrescreve porta
    if (def.solido && intersectaJogador(cx, cy, cz)) return false;
    if (def.render === 'cruz' && !porId(mundo.obter(cx, cy - 1, cz)).solido) {
      avisar('🌼 Isso precisa de um chão pra plantar!');
      return false;
    }
    // muda só pega em grama ou terra
    if (id === 15) {
      const solo = mundo.obter(cx, cy - 1, cz);
      if (solo !== 1 && solo !== 2) {
        avisar('🌱 A muda só pega em grama ou terra!');
        return false;
      }
    }
    // placa: pede a mensagem ANTES de colocar (fluxo assíncrono próprio)
    if (id === PLACA) {
      colocarPlaca(cx, cy, cz);
      return false; // sem repeat: a colocação de verdade vem no callback
    }
    // colocar em cima de flor/placa/muda devolve o item pro bolso e limpa
    // a metadata dela (senão a placa deixa a mensagem órfã na célula)
    if (ocupante !== 0 && porId(ocupante).render === 'cruz') {
      ganharItem(ocupante);
      ctx.metas.remover(cx, cy, cz);
    }
    // porta ocupa 2 blocos: exige o topo livre e escreve a metade de cima
    // (a base cai no fluxo comum abaixo — consome 1 item só)
    if (id === PORTA_FECHADA) {
      if (cy + 1 > ctx.cfg.mundo.tetoConstrucao || mundo.obter(cx, cy + 1, cz) !== 0) {
        avisar('🚪 Precisa de 2 blocos de altura livre pra porta!');
        return false;
      }
      mundo.definir(cx, cy + 1, cz, PORTA_FECHADA);
    }
    // o item "folhas" colocado vira FOLHA COLOCADA (nunca decai)
    const idFinal = id === FOLHA_NATURAL ? FOLHA_COLOCADA : id;
    mundo.definir(cx, cy, cz, idFinal);
    ctx.estado.inventario[id]--;
    if (id === 15) {
      const C = ctx.cfg.crescimento;
      mudas.push({ x: cx, y: cy, z: cz, quandoMs: tempoMs + C.minMs + Math.random() * (C.maxMs - C.minMs) });
    }
    // baú nasce vazio e com dono (só ele abre depois)
    if (idFinal === BAU) ctx.metas.definir(cx, cy, cz, { tipo: 'bau', dono: meuNome(), itens: [] });
    ctx.ui.atualizarContagens();
    ctx.audio.somColocar();
    ctx.salvar.agendar();
    ctx.fluxo.aoPrimeiroInput();
    return true;
  }

  // placa: abre o form de texto; confirmar coloca o bloco + grava a mensagem
  function colocarPlaca(cx: number, cy: number, cz: number) {
    ctx.ui.pedirTextoPlaca((texto) => {
      if (texto === null) return; // cancelou: nada colocado, item intacto
      // revalida no confirm (o mundo pode ter mudado enquanto digitava)
      if ((ctx.estado.inventario[PLACA] || 0) <= 0) return;
      if (mundo.obter(cx, cy, cz) !== 0) return;
      if (!porId(mundo.obter(cx, cy - 1, cz)).solido) {
        avisar('🌼 A placa precisa de um chão embaixo!');
        return;
      }
      mundo.definir(cx, cy, cz, PLACA);
      ctx.estado.inventario[PLACA]--;
      ctx.metas.definir(cx, cy, cz, { tipo: 'placa', autor: meuNome(), texto });
      ctx.ui.atualizarContagens();
      ctx.audio.somColocar();
      ctx.salvar.agendar();
      ctx.fluxo.aoPrimeiroInput();
    });
  }

  // ----- interagir (clique direito/tap): baú/porta/placa OU colocar -----
  // alvoForcado é backdoor de teste (Playwright interage numa célula exata).
  // Retorna true SÓ se colocou um bloco — o input só repete (segurar)
  // quando colocou, senão segurar o direito numa placa/porta ficaria
  // abrindo/fechando ou substituindo o bloco por baixo
  function interagir(alvoForcado?: Alvo): boolean {
    if (ctx.estado.fase !== 'jogando') return false;
    const a = alvoForcado || ctx.mira.alvo();
    if (!a) return colocar();
    if (a.id === BAU) { abrirBau(a); return false; }
    if (a.id === FORNALHA) { ctx.fluxo.soltarInputs(); ctx.ui.abrirFornalha(); ctx.fluxo.aoPrimeiroInput(); return false; }
    if (a.id === CAIXA) { lerCaixa(a); return false; }
    if (a.id === PORTA_FECHADA) { alternarPorta(a, PORTA_ABERTA); return false; }
    if (a.id === PORTA_ABERTA) { alternarPorta(a, PORTA_FECHADA); return false; }
    if (a.id === PLACA) { lerPlaca(a); return false; }
    return colocar();
  }

  function abrirBau(a: Alvo) {
    const m = ctx.metas.obter(a.x, a.y, a.z);
    if (!m || m.tipo !== 'bau') return;
    // baú liberado (publico) qualquer um abre; senão só o dono
    if (!m.publico && !podeUsar(m.dono)) {
      avisar('🔒 Esse baú é do(a) ' + (m.dono || 'dono') + '! Só ele(a) pode abrir.');
      ctx.audio.somErro();
      return;
    }
    ctx.fluxo.soltarInputs();
    const souDono = ctx.sync.emSala() && m.dono !== '*' && podeUsar(m.dono);
    const titulo = m.dono === '*' ? '💎 Baú do tesouro!' : (m.publico ? '🔓 ' : '') + (m.dono ? 'Baú de ' + m.dono : 'Seu baú');
    ctx.ui.abrirBau(ctx.metas.chaveDe(a.x, a.y, a.z), titulo, souDono);
    ctx.fluxo.aoPrimeiroInput();
  }

  function alternarPorta(a: Alvo, novo: number) {
    // porta = 2 metades: abre/fecha as duas juntas (qualquer um; o sync leva)
    const oy = ehPorta(mundo.obter(a.x, a.y + 1, a.z)) ? a.y + 1
      : ehPorta(mundo.obter(a.x, a.y - 1, a.z)) ? a.y - 1 : null;
    mundo.definir(a.x, a.y, a.z, novo);
    if (oy !== null) mundo.definir(a.x, oy, a.z, novo);
    ctx.audio.somUI();
    ctx.fluxo.aoPrimeiroInput();
    ctx.salvar.agendar();
  }

  function lerPlaca(a: Alvo) {
    const m = ctx.metas.obter(a.x, a.y, a.z);
    if (!m || m.tipo !== 'placa') return;
    ctx.ui.mostrarPlaca(m.texto, m.autor);
    ctx.fluxo.aoPrimeiroInput();
  }

  function lerCaixa(a: Alvo) {
    const m = ctx.metas.obter(a.x, a.y, a.z);
    if (!m || m.tipo !== 'caixa') return;
    ctx.ui.mostrarToast('🏠 Casa de <b>' + (m.dono || 'ninguém') + '</b> — só o dono mexe nos blocos daqui.', 'info', 2800);
    ctx.fluxo.aoPrimeiroInput();
  }

  // caixa de correio: pregada numa parede de casa FECHADA, marca o dono
  function colocarCaixa(a: Alvo): boolean {
    if (!(a.ny === 0 && (a.nx !== 0 || a.nz !== 0))) {
      if (avisar('📮 Pregue a caixa de correio numa PAREDE (do lado, não no chão)!')) ctx.audio.somErro();
      return false;
    }
    const mx = a.x + a.nx;
    const my = a.y;
    const mz = a.z + a.nz;
    if (mundo.obter(mx, my, mz) !== 0) { avisar('📮 Não tem espaço vazio nessa parede!'); return false; }
    if (intersectaJogador(mx, my, mz)) return false;
    if ((ctx.estado.inventario[CAIXA] || 0) <= 0) {
      if (avisar('📮 Você não tem caixa de correio! Fabrique com 4 tábuas.')) ctx.audio.somErro();
      return false;
    }
    const r = casaDe(mx, my, mz);
    if (!r.fechada) {
      if (avisar('🏠 Faça um contorno fechado de paredes ao redor (não precisa de teto)!')) ctx.audio.somErro();
      return false;
    }
    if (!r.hasPorta) {
      if (avisar('🚪 A casa precisa de uma porta pra ter dono!')) ctx.audio.somErro();
      return false;
    }
    const colunas = new Set<number>([...r.dentro, ...r.casca]);
    for (const [ck, m] of ctx.metas.todos()) {
      if (m.tipo === 'caixa' && colunas.has(chave2(ck % SX, Math.floor(ck / SX) % SZ))) {
        if (avisar('📮 Essa casa já tem uma caixa de correio!')) ctx.audio.somErro();
        return false;
      }
    }
    mundo.definir(mx, my, mz, CAIXA);
    ctx.estado.inventario[CAIXA]--;
    ctx.metas.definir(mx, my, mz, { tipo: 'caixa', dono: meuNome() });
    ctx.ui.atualizarContagens();
    ctx.audio.somColocar();
    ctx.ui.mostrarToast('📮 Caixa pregada! Agora só você quebra os blocos dessa casa.', 'ok', 2600);
    ctx.salvar.agendar();
    ctx.fluxo.aoPrimeiroInput();
    return false;
  }

  // tecla Q: larga 1 do item selecionado como um "pacote" no chão à frente
  function soltarItemSelecionado() {
    if (ctx.estado.fase !== 'jogando') return;
    const id = heldItem();
    if (!id || (ctx.estado.inventario[id] || 0) <= 0) return;
    const fx = -Math.sin(jogador.yaw);
    const fz = -Math.cos(jogador.yaw);
    const tx = Math.floor(jogador.x + fx * 1.2);
    const tz = Math.floor(jogador.z + fz * 1.2);
    const ty = mundo.chaoMaisAlto(tx, tz) + 1;
    if (mundo.obter(tx, ty, tz) !== 0) {
      if (avisar('🎁 Sem espaço pra largar aqui — vire pra um lugar aberto!')) ctx.audio.somErro();
      return;
    }
    ctx.estado.inventario[id]--;
    mundo.definir(tx, ty, tz, PACOTE);
    ctx.metas.definir(tx, ty, tz, { tipo: 'drop', item: id, n: 1 });
    ctx.ui.atualizarContagens();
    ctx.audio.somColocar();
    ctx.salvar.agendar();
    ctx.fluxo.aoPrimeiroInput();
  }

  // ----- leaf decay: folhas naturais sem tronco conectado caem -----
  const paraChecar: Array<[number, number, number]> = [];
  const decaindo: Array<{ x: number; y: number; z: number; quandoMs: number }> = [];
  const naFila = new Set<number>();
  const agendadas = new Set<number>();
  const chave = (x: number, y: number, z: number) =>
    x + z * cfg.mundo.SX + y * cfg.mundo.SX * cfg.mundo.SZ;
  let mudaDecayToastMs = -Infinity;

  function enfileirarVizinhas(x: number, y: number, z: number) {
    for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] as const) {
      const nx = x + dx;
      const ny = y + dy;
      const nz = z + dz;
      if (mundo.obter(nx, ny, nz) !== FOLHA_NATURAL) continue;
      const k = chave(nx, ny, nz);
      if (naFila.has(k)) continue;
      naFila.add(k);
      paraChecar.push([nx, ny, nz]);
    }
  }

  // BFS andando só por folhas naturais (6-conectado, raio ≤ alcance)
  // procurando um tronco encostado em qualquer folha do caminho
  function temTroncoConectado(x0: number, y0: number, z0: number): boolean {
    const alcance = ctx.cfg.decay.alcanceTronco;
    const visitado = new Set<number>([chave(x0, y0, z0)]);
    let borda: Array<[number, number, number]> = [[x0, y0, z0]];
    for (let dist = 0; dist <= alcance; dist++) {
      const proxima: Array<[number, number, number]> = [];
      for (const [x, y, z] of borda) {
        for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] as const) {
          const nx = x + dx;
          const ny = y + dy;
          const nz = z + dz;
          const id = mundo.obter(nx, ny, nz);
          if (id === TRONCO) return true;
          if (id !== FOLHA_NATURAL) continue;
          const k = chave(nx, ny, nz);
          if (visitado.has(k)) continue;
          visitado.add(k);
          proxima.push([nx, ny, nz]);
        }
      }
      borda = proxima;
      if (!borda.length) break;
    }
    return false;
  }

  function processarDecay(agoraMs: number, tudo: boolean) {
    const D = ctx.cfg.decay;
    // checagens (com orçamento por frame)
    let orcamento = tudo ? Infinity : 30;
    while (paraChecar.length && orcamento-- > 0) {
      const [x, y, z] = paraChecar.shift()!;
      const k = chave(x, y, z);
      naFila.delete(k);
      if (agendadas.has(k)) continue; // já tem queda marcada
      if (mundo.obter(x, y, z) !== FOLHA_NATURAL) continue;
      if (temTroncoConectado(x, y, z)) continue;
      // atraso em lotes de 300ms: quedas agrupadas = menos remesh de chunk
      const atraso = D.atrasoMinMs + Math.random() * (D.atrasoMaxMs - D.atrasoMinMs);
      agendadas.add(k);
      decaindo.push({ x, y, z, quandoMs: tudo ? agoraMs : agoraMs + Math.round(atraso / 300) * 300 });
    }
    // quedas agendadas
    for (let i = decaindo.length - 1; i >= 0; i--) {
      const d = decaindo[i];
      if (!tudo && agoraMs < d.quandoMs) continue;
      decaindo.splice(i, 1);
      agendadas.delete(chave(d.x, d.y, d.z));
      if (mundo.obter(d.x, d.y, d.z) !== FOLHA_NATURAL) continue;
      // re-checa: a criança pode ter recolocado um tronco
      if (temTroncoConectado(d.x, d.y, d.z)) continue;
      mundo.definir(d.x, d.y, d.z, 0);
      enfileirarVizinhas(d.x, d.y, d.z); // cascata
      if (Math.random() < D.chanceMuda) {
        const inv = ctx.estado.inventario;
        inv[15] = Math.min(999, (inv[15] || 0) + 1);
        registrarItemNaHotbar(15);
        ctx.ui.atualizarContagens();
        if (tempoMs - mudaDecayToastMs > 4000) {
          mudaDecayToastMs = tempoMs;
          ctx.ui.mostrarToast('🌱 Caiu uma muda da árvore!', 'ok', 2000);
        }
      }
      ctx.salvar.agendar();
    }
  }

  // ----- relógios (mudas + decay), em tempo de simulação -----
  // simular=false (visitante que não é anfitrião): o tempoMs SEGUE
  // andando (o toc-toc do golpe depende dele), mas mudas/decay não
  // rodam — Math.random em duas máquinas divergiria o mundo
  function passo(dt: number, simular = true) {
    tempoMs += dt * 1000;
    if (!simular) return;
    for (let i = mudas.length - 1; i >= 0; i--) {
      const m = mudas[i];
      if (tempoMs < m.quandoMs) continue;
      mudas.splice(i, 1);
      if (mundo.obter(m.x, m.y, m.z) !== 15) continue; // quebraram a muda
      crescer(m.x, m.y, m.z);
    }
    if (paraChecar.length || decaindo.length) processarDecay(tempoMs, false);
  }

  function crescer(x: number, y: number, z: number) {
    mundo.definir(x, y, z, 0);
    brotarArvore(ctx, x, y - 1, z, Math.random);
    ctx.audio.somSalvo();
    ctx.salvar.agendar();
    const d = Math.hypot(x - jogador.x, z - jogador.z);
    if (d < 24) ctx.ui.mostrarToast('🌳 Sua muda virou uma árvore!', 'ok', 2400);
    ctx.ui.anunciar('Uma muda cresceu e virou árvore!');
  }

  function iniciarMudas() {
    mudas.length = 0;
    paraChecar.length = 0;
    decaindo.length = 0;
    naFila.clear();
    agendadas.clear();
    tempoMs = 0;
    const { SX, SZ, SY } = ctx.cfg.mundo;
    const C = ctx.cfg.crescimento;
    for (let y = 0; y < SY; y++) {
      for (let z = 0; z < SZ; z++) {
        for (let x = 0; x < SX; x++) {
          const id = mundo.obter(x, y, z);
          if (id === 15) {
            mudas.push({ x, y, z, quandoMs: C.minMs + Math.random() * (C.maxMs - C.minMs) });
          } else if (id === FOLHA_NATURAL) {
            // re-arma o decay pós-load: cascata interrompida por um save
            // não congela folhas órfãs no ar (checagem é barata, 30/frame)
            const k = chave(x, y, z);
            naFila.add(k);
            paraChecar.push([x, y, z]);
          }
        }
      }
    }
  }

  // edição vinda da REDE (só o anfitrião chama): os sistemas automáticos
  // precisam reagir ao que os visitantes fazem — sem inventário, sem som
  function aoEdicaoRemota(x: number, y: number, z: number, id: number) {
    if (id === 0) {
      // abriu um buraco: pode ter deixado folhas órfãs (árvore cortada)
      enfileirarVizinhas(x, y, z);
    } else if (id === 15) {
      // visitante plantou muda — entra no relógio do anfitrião
      const C = ctx.cfg.crescimento;
      mudas.push({ x, y, z, quandoMs: tempoMs + C.minMs + Math.random() * (C.maxMs - C.minMs) });
    }
  }

  return {
    quebrar,
    colocar,
    golpear,
    soltarGolpe,
    golpeando: () => estaGolpeando,
    passo,
    iniciarMudas,
    registrarItemNaHotbar,
    ganharItemPublico,
    interagir,
    podeUsar,
    soltarItemSelecionado,
    aoEdicaoRemota,
    crescerMudasAgora() {
      for (const m of mudas) m.quandoMs = tempoMs;
      passo(0);
    },
    decairAgora() {
      // teste: roda checagens+quedas até secar (cascata completa)
      let guarda = 0;
      while ((paraChecar.length || decaindo.length) && guarda++ < 200) {
        processarDecay(tempoMs, true);
      }
    },
  };
}
