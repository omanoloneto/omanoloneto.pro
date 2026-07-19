export function criarUi() {
  const q = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;
  const els = {
    intro: q('[data-intro]'),
    hud: q('[data-hud]'),
    pontos: q('[data-pontos]'),
    nivel: q('[data-nivel]'),
    objetivo: q('[data-objetivo]'),
    proxima: q('[data-proxima]'),
    proximaWrap: q('[data-proxima-wrap]'),
    mute: q('[data-mute]'),
    muteIcon: q('[data-mute-icon]'),
    falar: q('[data-falar]'),
    nivelDone: q('[data-nivel-done]'),
    nivelDoneTitulo: q('[data-nivel-done-titulo]'),
    win: q('[data-win]'),
    winTexto: q('[data-win-texto]'),
    resumoBons: q('[data-resumo-bons]'),
    resumoPraticar: q('[data-resumo-praticar]'),
    resumoWrap: q('[data-resumo]'),
    fail: q('[data-fail]'),
    failTexto: q('[data-fail-texto]'),
    toast: q('[data-toast]'),
    tela: q('[data-tela]') as unknown as HTMLCanvasElement,
    badges: Array.from(document.querySelectorAll('[data-dif-feitos]')) as HTMLElement[],
  };

  let toastTimer = 0;

  function mostrarModal(el: HTMLElement | null) {
    for (const m of [els.intro, els.nivelDone, els.win, els.fail]) {
      if (m) m.hidden = m !== el;
    }
  }

  function toast(texto: string, ms = 2200) {
    els.toast.textContent = texto;
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => els.toast.classList.remove('show'), ms);
  }

  function hud(pontos: number, nivelRotulo: string, objetivo: string) {
    els.pontos.textContent = String(pontos);
    els.nivel.textContent = nivelRotulo;
    els.objetivo.textContent = objetivo;
  }

  function proxima(letra: string | null) {
    els.proximaWrap.hidden = letra === null;
    if (letra !== null) els.proxima.textContent = letra;
  }

  function resumo(bons: string[], praticar: string[]) {
    const tem = bons.length || praticar.length;
    els.resumoWrap.hidden = !tem;
    els.resumoBons.textContent = bons.length ? bons.join('  ') : '—';
    els.resumoPraticar.textContent = praticar.length ? praticar.join('  ') : '—';
  }

  function badgesNiveis(done: boolean[], porDif: Record<string, number[]>) {
    for (const badge of els.badges) {
      const dif = badge.getAttribute('data-dif-feitos')!;
      const idxs = porDif[dif] || [];
      const feitos = idxs.filter((i) => done[i]).length;
      badge.textContent = feitos + '/' + idxs.length;
    }
  }

  return { els, mostrarModal, toast, hud, proxima, resumo, badgesNiveis };
}
