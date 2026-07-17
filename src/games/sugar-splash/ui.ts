import * as THREE from 'three';
import type { Contexto, UI } from './tipos';

export function criarUI(ctx: Contexto): UI {
  const $ = (s: string) => document.querySelector(s) as HTMLElement;
  const els = {
    cena: $('[data-cena]'),
    toast: $('[data-toast]'),
    anuncio: $('[data-anuncio]'),
    introModal: $('[data-intro]'),
    pausaModal: $('[data-pausa]'),
    fimModal: $('[data-fim]'),
    entradaModal: $('[data-entrada]'),
    recordesModal: $('[data-recordes]'),
    banner: $('[data-banner]'),
    danoFlash: $('[data-dano-flash]'),
    hudPontos: $('[data-pontos]'),
    hudTempo: $('[data-tempo]'),
    hudPlacar: $('[data-placar]'),
    solidezFill: $('[data-solidez-fill]'),
    tanqueFill: $('[data-tanque-fill]'),
    respawnOverlay: $('[data-respawn]'),
    aguaTint: $('[data-agua-tint]'),
    erroIntro: $('[data-erro-intro]'),
    lobbyModal: $('[data-lobby]'),
    lobbyCodigo: $('[data-lobby-codigo]'),
    lobbyLista: $('[data-lobby-lista]'),
    lobbyComecar: $('[data-lobby-comecar]'),
    lobbyStatus: $('[data-lobby-status]'),
    lobbySair: $('[data-lobby-sair]'),
    fimTabela: $('[data-fim-tabela]'),
    controles: $('[data-controles]'),
    pauseBtn: $('[data-pause]'),
    muteBtn: $('[data-mute]'),
    muteIcon: $('[data-mute-icon]'),
  };

  let toastTimer = 0;
  let bannerTimer = 0;
  let pontosAntes = -1;
  let tempoAntes = -1;
  let placarAntes = '';
  let respawnAntes = -1;
  const vetorProj = new THREE.Vector3();

  return {
    els,
    anunciar(msg) {
      els.anuncio.textContent = '';
      requestAnimationFrame(() => { els.anuncio.textContent = msg; });
    },
    mostrarToast(html, tipo, ms) {
      els.toast.innerHTML = html;
      els.toast.className = 'toast ' + tipo;
      els.toast.hidden = false;
      requestAnimationFrame(() => els.toast.classList.add('show'));
      clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => {
        els.toast.classList.remove('show');
        setTimeout(() => { els.toast.hidden = true; }, 250);
      }, ms || 2400);
    },
    atualizarHud() {
      const e = ctx.estado;
      if (e.pontos !== pontosAntes) {
        pontosAntes = e.pontos;
        els.hudPontos.textContent = String(e.pontos);
      }
      const seg = Math.max(0, Math.ceil(e.tempoRestanteS));
      if (seg !== tempoAntes) {
        tempoAntes = seg;
        els.hudTempo.textContent = Math.floor(seg / 60) + ':' + String(seg % 60).padStart(2, '0');
      }
      const azul = e.modo === 'multi' ? e.placarAzul : e.team === 0 ? e.kills : e.mortes;
      const vermelho = e.modo === 'multi' ? e.placarVermelho : e.team === 0 ? e.mortes : e.kills;
      const placar = '🔵 ' + azul + ' × ' + vermelho + ' 🔴';
      if (placar !== placarAntes) {
        placarAntes = placar;
        els.hudPlacar.textContent = placar;
      }
      const sol = Math.max(0, e.solidez) / ctx.cfg.jogador.solidezMax;
      els.solidezFill.style.width = sol * 100 + '%';
      els.solidezFill.style.background = sol > 0.5 ? '#f5f2ea' : sol > 0.25 ? '#ffd23f' : '#ff5c39';
      els.tanqueFill.style.width = (e.tanque / ctx.cfg.bisnaga.tanqueMax) * 100 + '%';
    },
    mostrarPontos(texto, pos) {
      vetorProj.set(pos.x, pos.y + 1.6, pos.z).project(ctx.camera);
      if (vetorProj.z > 1 || vetorProj.z < -1) return;
      const el = document.createElement('span');
      el.className = 'pontos-voa';
      el.textContent = texto;
      el.style.left = ((vetorProj.x + 1) / 2) * 100 + '%';
      el.style.top = ((1 - (vetorProj.y + 1) / 2) * 100) + '%';
      els.cena.appendChild(el);
      setTimeout(() => el.remove(), 950);
    },
    mostrarRespawn(seg) {
      if (seg === respawnAntes && !els.respawnOverlay.hidden) return;
      respawnAntes = seg;
      els.respawnOverlay.textContent = '💧 Derreteu! Voltando em ' + seg + '…';
      els.respawnOverlay.hidden = false;
    },
    esconderRespawn() {
      respawnAntes = -1;
      els.respawnOverlay.hidden = true;
    },
    mostrarBanner(titulo, sub) {
      ($('[data-banner-titulo]')).textContent = titulo;
      ($('[data-banner-sub]')).textContent = sub || '';
      els.banner.hidden = false;
      els.banner.classList.remove('show');
      void els.banner.offsetWidth;
      els.banner.classList.add('show');
      clearTimeout(bannerTimer);
      bannerTimer = window.setTimeout(() => { els.banner.hidden = true; }, 2200);
    },
    flashDano() {
      els.danoFlash.classList.remove('show');
      void els.danoFlash.offsetWidth;
      els.danoFlash.classList.add('show');
    },
  };
}
