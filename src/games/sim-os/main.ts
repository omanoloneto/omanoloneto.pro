// Ponto de entrada do motor: monta o Contexto, liga os subsistemas na
// ordem certa, faz a delegação global e cuida do ciclo ligar/desligar.
// A página escolhe os apps: iniciarSim({ apps: { navegador: criarNavegador, ... } })
import type { Contexto, CriadorDeApp, DadosSim, Estado } from './tipos';
import { criarUI } from './ui';
import { criarAudio } from './audio';
import { criarArquivos } from './arquivos';
import { criarJanelas } from './janelas';
import { criarMenu } from './menu';

export interface OpcoesSim {
  apps?: Record<string, CriadorDeApp>;
}

export function iniciarSim(opcoes: OpcoesSim = {}) {
  const raiz = document.querySelector<HTMLElement>('[data-sim]');
  const fonte = document.querySelector('[data-dados]');
  if (!raiz || !fonte) return;
  const dados = JSON.parse(fonte.textContent || '{}') as DadosSim;

  const estado: Estado = {
    tela: 'boot',
    mudo: false,
    menuAberto: false,
    semMov: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    bootTimer: 0,
    desligarTimer: 0,
  };

  const ctx = { dados, raiz, estado, apps: {} } as Contexto;
  ctx.ui = criarUI(ctx);
  ctx.audio = criarAudio(ctx);
  ctx.arquivos = criarArquivos(ctx);
  ctx.janelas = criarJanelas(ctx);

  // ícones do desktop (antes dos apps: a lixeira assina pra trocar o ícone)
  dados.iconesDesktop.forEach((i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'icone';
    btn.dataset.abre = i.id;
    const nome = document.createElement('span');
    nome.className = 'icone__nome';
    nome.textContent = i.rotulo;
    btn.append(ctx.ui.icone(i.icone, 'icone__img'), nome);
    ctx.ui.els.icones.appendChild(btn);
  });

  for (const [nome, criar] of Object.entries(opcoes.apps || {})) {
    ctx.apps[nome] = criar(ctx);
  }

  const menu = criarMenu(ctx, { aoDesligar: desligar });

  // delegação global: qualquer [data-abre] abre a janela correspondente
  // (ícones do desktop, itens do menu, arquivos-seed do explorador)
  document.addEventListener('click', (e) => {
    const btn = (e.target as Element).closest<HTMLElement>('[data-abre]');
    if (!btn) return;
    menu.alternar(false);
    ctx.janelas.abrir(btn.dataset.abre!, btn);
  });

  // Esc: fecha o menu primeiro; depois a janela ativa (em cadeia)
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (estado.tela !== 'desktop') return; // boot/desligado: Esc não mexe em janela
    if (estado.menuAberto) {
      menu.alternar(false);
      ctx.ui.els.iniciar.focus();
      return;
    }
    const id = ctx.janelas.ativa();
    if (id) ctx.janelas.fechar(id);
  });

  // cinto e suspensório: se algo ainda rolar a área (navegador antigo), volta pro zero
  ctx.ui.els.area.addEventListener('scroll', () => {
    ctx.ui.els.area.scrollLeft = 0;
    ctx.ui.els.area.scrollTop = 0;
  });

  function ligar() {
    clearTimeout(estado.bootTimer);
    clearTimeout(estado.desligarTimer);
    ctx.janelas.fecharTodas();
    menu.alternar(false);
    ctx.audio.pararTrecho();
    Object.values(ctx.apps).forEach((app) => app.aoReligar && app.aoReligar());
    ctx.ui.trocarTela('boot');
    estado.bootTimer = window.setTimeout(
      entrarNoDesktop,
      estado.semMov ? dados.tempos.bootReduzido : dados.tempos.boot
    );
  }

  function entrarNoDesktop() {
    ctx.ui.trocarTela('desktop');
    ctx.audio.tocarTrecho(dados.sons.ligar);
    ctx.ui.anunciar(dados.textos.ligado);
    const primeiro = ctx.ui.els.icones.querySelector<HTMLElement>('button');
    if (primeiro) primeiro.focus({ preventScroll: true });
  }

  function desligar() {
    menu.alternar(false);
    // desligou = apps morrem na hora: melodia para, navegação pendente é
    // cancelada, notepad esquece o que não foi salvo
    ctx.audio.pararTrecho();
    Object.values(ctx.apps).forEach((app) => app.aoReligar && app.aoReligar());
    ctx.ui.trocarTela('desligado');
    const { aguarde, msgFinal, religar } = ctx.ui.els;
    aguarde.hidden = false;
    msgFinal.hidden = true;
    religar.hidden = true;
    ctx.ui.anunciar(dados.textos.desligando);
    estado.desligarTimer = window.setTimeout(() => {
      aguarde.hidden = true;
      msgFinal.hidden = false;
      religar.hidden = false;
      religar.focus();
      ctx.ui.anunciar(dados.textos.desligado);
    }, estado.semMov ? dados.tempos.desligarReduzido : dados.tempos.desligar);
  }

  ctx.ui.els.religar.addEventListener('click', ligar);

  document.body.classList.add('is-game');
  ctx.audio.bindMute();
  ctx.ui.iniciarRelogio();
  ligar();

  // handle de teste (padrão __mc do mineblocks)
  (window as any).__sim = { ctx, menu, ligar };
}
