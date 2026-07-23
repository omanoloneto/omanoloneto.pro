import type { Batalha, Combatente, Contexto, ResultadoBatalha } from './tipos';
import { GOLPES, TIPO_NOME, vantagem } from '../../data/wildmon';

type EstadoBatalha = 'entrada' | 'mensagem' | 'menu' | 'golpe' | 'troca' | 'fim';
type PassoMsg = { txt: string; aoMostrar?: () => void };

const ESPERA_MS = 850;
const ENTRADA_MS = 480;

export function criarBatalha(ctx: Contexto): Batalha {
  const $ = (s: string) => document.querySelector(s) as HTMLElement;
  const el = {
    raiz: $('[data-batalha]'),
    nomeIn: $('[data-bt-nome-in]'),
    barraIn: $('[data-bt-barra-in]'),
    nomeAl: $('[data-bt-nome-al]'),
    barraAl: $('[data-bt-barra-al]'),
    enAl: $('[data-bt-en-al]'),
    msg: $('[data-bt-msg]'),
    menu: $('[data-bt-menu]'),
    lista: $('[data-bt-lista]'),
  };
  const botoesMenu = Array.from(el.menu.querySelectorAll('button')) as HTMLButtonElement[];

  const esp = (id: string) => ctx.especies.find((e) => e.id === id)!;
  const nomeUp = (c: Combatente) => esp(c.especieId).nome.toUpperCase();
  const time = () => ctx.estado.time;

  let emBatalha = false;
  let estado: EstadoBatalha = 'entrada';
  let aoFimCb: ((r: ResultadoBatalha) => void) | null = null;
  let resultado: ResultadoBatalha = 'nada';

  let inimigo: Combatente = { especieId: 'fox', energia: 0 };
  let ativoIdx = 0;

  let fila: PassoMsg[] = [];
  let aposFila: EstadoBatalha = 'menu';
  let forcarTroca = false;
  let linhaAtual = '';
  let charsMostrados = 0;
  let ultimoCharMs = 0;
  let linhaCompleta = false;
  let completaEm = 0;

  let botoesAtivos: HTMLButtonElement[] = [];
  let acoesLista: Array<(() => void) | null> = [];
  let selIdx = 0;

  let entradaMs = 0;
  let energiaInMostrada = 0;
  let energiaAlMostrada = 0;
  let shakeInMs = 0;
  let shakeAlMs = 0;

  function ativo(): Combatente { return time()[ativoIdx]; }
  function maxEnergia(c: Combatente) { return esp(c.especieId).energiaMax; }

  function curarTime() {
    for (const c of time()) c.energia = maxEnergia(c);
  }

  function registrarAmigo(id: string) {
    if (!ctx.estado.colecao.includes(id)) ctx.estado.colecao.push(id);
    if (ctx.estado.time.length < ctx.cfg.timeMax && !ctx.estado.time.some((c) => c.especieId === id)) {
      ctx.estado.time.push({ especieId: id, energia: esp(id).energiaMax });
    }
  }

  function golpeContra(atk: Combatente, def: Combatente, golpeId: string) {
    const a = esp(atk.especieId);
    const d = esp(def.especieId);
    const mov = GOLPES[golpeId];
    const mult = vantagem(mov.tipo, d.tipo);
    const dano = Math.max(1, Math.round((mov.poder + a.ataque) * mult / ctx.cfg.divDano));
    return { mov, mult, dano, atkTipo: a.tipo, defTipo: d.tipo };
  }

  function feedbackHit(mult: number): string {
    if (mult === 2) return 'Foi super eficaz! 💥';
    if (mult === 0.5) return 'Não fez muito efeito…';
    return 'Acertou!';
  }

  function feedbackTeach(mult: number, atkTipo: string, defTipo: string): string {
    if (mult === 2) return TIPO_NOME[atkTipo as keyof typeof TIPO_NOME] + ' é forte contra ' + TIPO_NOME[defTipo as keyof typeof TIPO_NOME] + '!';
    if (mult === 0.5) return 'Tenta um bicho de outro tipo! 🤔';
    return '';
  }

  function anexarAtaqueInimigo(passos: PassoMsg[]) {
    const al = ativo();
    const e = golpeContra(inimigo, al, esp(inimigo.especieId).golpes[0]);
    passos.push({ txt: nomeUp(inimigo) + ' selvagem usou ' + e.mov.nome + '!' });
    passos.push({ txt: feedbackHit(e.mult), aoMostrar: () => { al.energia = Math.max(0, al.energia - e.dano); shakeAlMs = 260; } });
    const teach = feedbackTeach(e.mult, e.atkTipo, e.defTipo);
    if (teach) passos.push({ txt: teach });
    if (al.energia - e.dano <= 0) {
      passos.push({ txt: nomeUp(al) + ' está cansado…' });
      if (time().some((c, i) => i !== ativoIdx && c.energia > 0)) {
        aposFila = 'troca';
        forcarTroca = true;
      } else {
        passos.push({ txt: 'Todos os seus amigos estão cansados… hora de descansar! 😴' });
        aposFila = 'fim';
        resultado = 'nada';
      }
    } else {
      aposFila = 'menu';
    }
  }

  function executarGolpe(golpeId: string) {
    const al = ativo();
    const p = golpeContra(al, inimigo, golpeId);
    const passos: PassoMsg[] = [{ txt: nomeUp(al) + ' usou ' + p.mov.nome + '!' }];
    passos.push({ txt: feedbackHit(p.mult), aoMostrar: () => { inimigo.energia = Math.max(0, inimigo.energia - p.dano); shakeInMs = 260; } });
    const teach = feedbackTeach(p.mult, p.atkTipo, p.defTipo);
    if (teach) passos.push({ txt: teach });
    if (inimigo.energia - p.dano <= 0) {
      passos.push({ txt: nomeUp(inimigo) + ' selvagem ficou cansado!' });
      passos.push({ txt: nomeUp(inimigo) + ' virou seu amigo! 💚', aoMostrar: () => registrarAmigo(inimigo.especieId) });
      aposFila = 'fim';
      resultado = 'amigo';
    } else {
      anexarAtaqueInimigo(passos);
    }
    iniciarFila(passos);
  }

  function tentarAmigar() {
    const chance = 0.25 + 0.65 * (1 - inimigo.energia / maxEnergia(inimigo));
    const jaAmigo = ctx.estado.colecao.includes(inimigo.especieId);
    const passos: PassoMsg[] = [{ txt: 'Você ofereceu carinho pro ' + nomeUp(inimigo) + '… 💛' }];
    if (jaAmigo) {
      passos.push({ txt: 'Vocês já são amigos — mas foi divertido! 😄' });
      aposFila = 'fim';
      resultado = 'amigo';
    } else if (Math.random() < chance) {
      passos.push({ txt: nomeUp(inimigo) + ' topou ser seu amigo! 💚', aoMostrar: () => registrarAmigo(inimigo.especieId) });
      aposFila = 'fim';
      resultado = 'amigo';
    } else {
      passos.push({ txt: 'Quase! ' + nomeUp(inimigo) + ' ainda quer brincar.' });
      anexarAtaqueInimigo(passos);
    }
    iniciarFila(passos);
  }

  function fugir() {
    resultado = 'fugiu';
    aposFila = 'fim';
    iniciarFila([{ txt: 'Você acenou tchau! 👋' }]);
  }

  function trocarPara(idx: number, gastaTurno: boolean) {
    ativoIdx = idx;
    atualizarInfoAliado();
    const al = ativo();
    const passos: PassoMsg[] = [{ txt: 'Vai, ' + nomeUp(al) + '!' }];
    if (gastaTurno) {
      anexarAtaqueInimigo(passos);
    } else {
      aposFila = 'menu';
    }
    forcarTroca = false;
    iniciarFila(passos);
  }

  function iniciarFila(passos: PassoMsg[]) {
    fila = passos;
    estado = 'mensagem';
    el.menu.hidden = true;
    el.lista.hidden = true;
    comecarLinha();
  }

  function comecarLinha() {
    const p = fila[0];
    if (p.aoMostrar) p.aoMostrar();
    linhaAtual = p.txt;
    linhaCompleta = ctx.motionReduzido;
    charsMostrados = ctx.motionReduzido ? p.txt.length : 0;
    ultimoCharMs = 0;
    el.msg.textContent = ctx.motionReduzido ? p.txt : '';
    if (linhaCompleta) completaEm = performance.now();
  }

  function proximaLinha() {
    fila.shift();
    if (!fila.length) { entrarEstado(aposFila); return; }
    comecarLinha();
  }

  function entrarEstado(e: EstadoBatalha) {
    if (e === 'fim') { finalizar(); return; }
    if (e === 'troca') { mostrarTroca(forcarTroca); return; }
    mostrarMenu();
  }

  function realcar() {
    botoesAtivos.forEach((b, i) => b.classList.toggle('sel', i === selIdx));
    const alvo = botoesAtivos[selIdx];
    if (alvo) alvo.scrollIntoView({ block: 'nearest' });
  }

  function mostrarMenu() {
    estado = 'menu';
    el.msg.textContent = 'O que ' + nomeUp(ativo()) + ' vai fazer?';
    el.menu.hidden = false;
    el.lista.hidden = true;
    botoesAtivos = botoesMenu;
    selIdx = 0;
    realcar();
  }

  function botaoLista(rotulo: string, desativado: boolean): HTMLButtonElement {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = rotulo;
    if (desativado) b.classList.add('off');
    return b;
  }

  function montarLista(itens: Array<{ rotulo: string; desativado?: boolean; acao: (() => void) | null }>) {
    el.lista.innerHTML = '';
    botoesAtivos = [];
    acoesLista = [];
    itens.forEach((it, i) => {
      const b = botaoLista(it.rotulo, !!it.desativado);
      b.addEventListener('click', () => { if (estado === 'golpe' || estado === 'troca') { selIdx = i; ctx.audio.somConfirma(); confirmar(); } });
      el.lista.appendChild(b);
      botoesAtivos.push(b);
      acoesLista.push(it.desativado ? null : it.acao);
    });
    el.lista.hidden = false;
    el.menu.hidden = true;
    const primeiro = acoesLista.findIndex((a) => a !== null);
    selIdx = primeiro < 0 ? 0 : primeiro;
    realcar();
  }

  function mostrarGolpes() {
    estado = 'golpe';
    const golpes = esp(ativo().especieId).golpes;
    const itens = golpes.map((id) => {
      const mov = GOLPES[id];
      return { rotulo: mov.nome + ' · ' + TIPO_NOME[mov.tipo], acao: () => executarGolpe(id) };
    });
    itens.push({ rotulo: '◀ Voltar', acao: () => mostrarMenu() });
    montarLista(itens);
  }

  function mostrarTroca(forcado: boolean) {
    estado = 'troca';
    el.msg.textContent = forcado ? 'Escolhe outro amigo!' : 'Trocar por quem?';
    const itens = time().map((c, i) => {
      const cansado = c.energia <= 0;
      const ativoAqui = i === ativoIdx;
      return {
        rotulo: nomeUp(c) + ' · ' + TIPO_NOME[esp(c.especieId).tipo] + ' · ' + Math.ceil(c.energia) + '/' + maxEnergia(c),
        desativado: cansado || ativoAqui,
        acao: () => trocarPara(i, !forcado),
      };
    });
    if (!forcado) itens.push({ rotulo: '◀ Voltar', desativado: false, acao: () => mostrarMenu() });
    montarLista(itens);
  }

  function confirmar() {
    if (estado === 'menu') {
      const acao = botoesAtivos[selIdx].dataset.btAcao;
      if (acao === 'lutar') mostrarGolpes();
      else if (acao === 'trocar') mostrarTroca(false);
      else if (acao === 'amigar') tentarAmigar();
      else if (acao === 'fugir') fugir();
      return;
    }
    if (estado === 'golpe' || estado === 'troca') {
      const fn = acoesLista[selIdx];
      if (fn) fn();
      else ctx.audio.somBlip();
    }
  }

  function atualizarInfoInimigo() {
    const e = esp(inimigo.especieId);
    el.nomeIn.textContent = e.nome.toUpperCase() + ' · ' + TIPO_NOME[e.tipo];
    energiaInMostrada = inimigo.energia;
  }

  function atualizarInfoAliado() {
    const al = ativo();
    const e = esp(al.especieId);
    el.nomeAl.textContent = e.nome.toUpperCase() + ' · ' + TIPO_NOME[e.tipo];
    energiaAlMostrada = al.energia;
  }

  function finalizar() {
    emBatalha = false;
    curarTime();
    el.raiz.hidden = true;
    ctx.estado.fase = 'jogando';
    ctx.salvar.gravar();
    const cb = aoFimCb;
    aoFimCb = null;
    if (cb) cb(resultado);
  }

  botoesMenu.forEach((b, i) => {
    b.addEventListener('click', () => { if (emBatalha && estado === 'menu') { selIdx = i; ctx.audio.somConfirma(); confirmar(); } });
  });

  function passoBarra(mostrada: number, real: number, dt: number): number {
    if (ctx.motionReduzido) return real;
    const v = mostrada + (real - mostrada) * Math.min(1, 10 * dt);
    return Math.abs(v - real) < 0.05 ? real : v;
  }

  return {
    iniciar(especieId, aoFim) {
      aoFimCb = aoFim;
      resultado = 'nada';
      curarTime();
      ativoIdx = time().findIndex((c) => c.energia > 0);
      if (ativoIdx < 0) ativoIdx = 0;
      inimigo = { especieId, energia: esp(especieId).energiaMax };
      emBatalha = true;
      forcarTroca = false;
      entradaMs = ctx.motionReduzido ? 0 : ENTRADA_MS;
      shakeInMs = 0;
      shakeAlMs = 0;
      ctx.estado.fase = 'batalha';
      atualizarInfoInimigo();
      atualizarInfoAliado();
      el.menu.hidden = true;
      el.lista.hidden = true;
      el.msg.textContent = '';
      el.raiz.hidden = false;
      estado = 'entrada';
    },
    passo(dt) {
      if (!emBatalha) return;
      const agora = performance.now();
      if (shakeInMs > 0) shakeInMs -= dt * 1000;
      if (shakeAlMs > 0) shakeAlMs -= dt * 1000;
      energiaInMostrada = passoBarra(energiaInMostrada, inimigo.energia, dt);
      energiaAlMostrada = passoBarra(energiaAlMostrada, ativo().energia, dt);
      el.barraIn.style.width = (energiaInMostrada / maxEnergia(inimigo) * 100) + '%';
      el.barraAl.style.width = (energiaAlMostrada / maxEnergia(ativo()) * 100) + '%';
      el.enAl.textContent = Math.ceil(energiaAlMostrada) + '/' + maxEnergia(ativo());

      if (estado === 'entrada') {
        entradaMs -= dt * 1000;
        if (entradaMs <= 0) {
          const passos: PassoMsg[] = [
            { txt: 'Um ' + nomeUp(inimigo) + ' selvagem apareceu!' },
            { txt: 'Vai, ' + nomeUp(ativo()) + '!' },
          ];
          aposFila = 'menu';
          iniciarFila(passos);
        }
        return;
      }

      if (estado === 'mensagem') {
        if (!linhaCompleta) {
          if (agora - ultimoCharMs > ctx.cfg.dialogoMsPorLetra) {
            ultimoCharMs = agora;
            charsMostrados++;
            el.msg.textContent = linhaAtual.slice(0, charsMostrados);
            if (charsMostrados % 3 === 0) ctx.audio.somBlip();
            if (charsMostrados >= linhaAtual.length) { linhaCompleta = true; completaEm = agora; }
          }
        } else if (agora - completaEm > ESPERA_MS) {
          proximaLinha();
        }
      }
    },
    desenhar() {
      if (!emBatalha) return;
      const g = ctx.g;
      const W = ctx.cfg.viewW;
      const H = ctx.cfg.viewH;
      g.fillStyle = '#bfe6ff';
      g.fillRect(0, 0, W, 98);
      g.fillStyle = '#cfeeff';
      g.fillRect(0, 0, W, 42);
      g.fillStyle = '#8fc45a';
      g.fillRect(0, 98, W, H - 98);
      g.fillStyle = 'rgba(60, 120, 60, 0.30)';
      g.beginPath(); g.ellipse(176, 84, 40, 11, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(58, 138, 46, 13, 0, 0, Math.PI * 2); g.fill();

      const desliza = entradaMs > 0 ? entradaMs / ENTRADA_MS : 0;
      const spIn = ctx.sprites['batalha-' + inimigo.especieId] as HTMLCanvasElement;
      const spAl = ctx.sprites['batalha-' + ativo().especieId] as HTMLCanvasElement;
      const shIn = shakeInMs > 0 ? (Math.round(shakeInMs / 40) % 2 ? 2 : -2) : 0;
      const shAl = shakeAlMs > 0 ? (Math.round(shakeAlMs / 40) % 2 ? 2 : -2) : 0;
      if (spIn) g.drawImage(spIn, 152 + shIn + desliza * 90, 34, 48, 48);
      if (spAl) g.drawImage(spAl, 26 + shAl - desliza * 90, 78, 56, 56);
    },
    apertouA() {
      if (!emBatalha) return;
      if (estado === 'entrada') return;
      if (estado === 'mensagem') {
        if (!linhaCompleta) {
          charsMostrados = linhaAtual.length;
          el.msg.textContent = linhaAtual;
          linhaCompleta = true;
          completaEm = performance.now();
        } else {
          proximaLinha();
        }
        return;
      }
      ctx.audio.somConfirma();
      confirmar();
    },
    mover(dx, dy) {
      if (!emBatalha) return;
      if (estado !== 'menu' && estado !== 'golpe' && estado !== 'troca') return;
      const d = dx > 0 || dy > 0 ? 1 : dx < 0 || dy < 0 ? -1 : 0;
      if (!d || !botoesAtivos.length) return;
      selIdx = (selIdx + d + botoesAtivos.length) % botoesAtivos.length;
      ctx.audio.somBlip();
      realcar();
    },
    ativa: () => emBatalha,
  };
}
