// Persistência NO SERVIDOR (mundos.php): nada fica salvo no Chromebook.
// O mundo vive num arquivo do host, protegido por senha — a criança
// carrega de qualquer máquina com nome + senha.
// RLE (run Uint16 + id Uint8) → base64; auto-save com debounce.
//
// Escrita protegida contra "amigo apagou meu castelo": todo save leva o
// salvoEm que o cliente conhece (base); se o servidor tem um save MAIS
// NOVO (outra aba/outro colega), devolve conflito — o auto-save para e
// só o save manual, com confirmação da criança, passa por cima.
import type { Contexto, Salvar } from './tipos';

export function codificarRLE(dados: Uint8Array): string {
  const bytes: number[] = [];
  let i = 0;
  while (i < dados.length) {
    const id = dados[i];
    let run = 1;
    while (i + run < dados.length && dados[i + run] === id && run < 65535) run++;
    bytes.push(run & 0xff, run >> 8, id);
    i += run;
  }
  // btoa em pedaços (String.fromCharCode estoura a pilha com array grande)
  let bin = '';
  for (let j = 0; j < bytes.length; j += 8192) {
    bin += String.fromCharCode(...bytes.slice(j, j + 8192));
  }
  return btoa(bin);
}

export function decodificarRLE(b64: string, tamanho: number, maxId: number): Uint8Array | null {
  try {
    const bin = atob(b64);
    const saida = new Uint8Array(tamanho);
    let pos = 0;
    for (let i = 0; i + 2 < bin.length; i += 3) {
      const run = bin.charCodeAt(i) | (bin.charCodeAt(i + 1) << 8);
      const id = bin.charCodeAt(i + 2);
      // id fora da tabela = save corrompido/versão futura: recusa inteiro
      // (deixar passar bricaria o mesher)
      if (id > maxId) return null;
      if (pos + run > tamanho) return null;
      saida.fill(id, pos, pos + run);
      pos += run;
    }
    return pos === tamanho ? saida : null;
  } catch {
    return null;
  }
}

export function criarSalvar(ctx: Contexto): Salvar {
  const S = ctx.cfg.salvar;
  // nome/senha SÓ em memória — nada persiste no PC (pedido do professor)
  let nome = '';
  let senha = '';
  let baseSalvoEm = 0; // versão do servidor que este cliente conhece
  let conflito = false; // outro save mais novo existe: auto-save pausado
  let sujoDesdeUltimoSave = false;
  let salvandoAgora = false;
  let debounce = 0;
  let ultimoSaveMs = -Infinity; // nunca salvou: o 1º auto-save passa na hora

  function payloadAtual(): string {
    const p = ctx.jogador;
    return JSON.stringify({
      v: 1,
      seed: ctx.estado.seed,
      jogador: { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), yaw: +p.yaw.toFixed(3), pitch: +p.pitch.toFixed(3) },
      sel: ctx.estado.sel,
      blocos: codificarRLE(ctx.mundo.dados),
    });
  }

  async function api(corpo: Record<string, unknown>): Promise<{ ok: boolean; status: number; json: any }> {
    try {
      const r = await fetch(S.api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      });
      const json = await r.json().catch(() => ({}));
      return { ok: r.ok, status: r.status, json };
    } catch {
      return { ok: false, status: 0, json: {} };
    }
  }

  async function enviarSave(payload: string, force: boolean) {
    return api({ acao: 'salvar', nome, senha, payload, base: baseSalvoEm, force });
  }

  async function salvarAgora(motivo: 'auto' | 'manual' | 'flush' = 'manual'): Promise<boolean> {
    if (!nome || salvandoAgora) return false;
    const agora = performance.now();
    if (motivo === 'auto' && agora - ultimoSaveMs < S.minEntreSavesMs) {
      agendar(); // cedo demais: tenta de novo depois
      return false;
    }
    // conflito pendente: só o save MANUAL (com confirmação) resolve
    if (conflito && motivo !== 'manual') return false;
    const payload = payloadAtual();
    if (payload.length > S.maxPayload) {
      ctx.ui.mostrarToast('😅 O mundo ficou grande demais pra salvar!', 'err', 3000);
      return false;
    }
    clearTimeout(debounce);
    // flush no fechar da aba: melhor esforço, NUNCA passa por cima de
    // save alheio (sem force) e só marca limpo se o beacon foi aceito
    if (motivo === 'flush') {
      const corpo = JSON.stringify({ acao: 'salvar', nome, senha, payload, base: baseSalvoEm, force: false });
      if (navigator.sendBeacon && corpo.length < 60000) {
        if (navigator.sendBeacon(S.api, new Blob([corpo], { type: 'application/json' }))) {
          sujoDesdeUltimoSave = false;
        }
      } else {
        // >64KB o keepalive rejeita (limite da spec) — tenta mesmo assim,
        // mas NÃO marca limpo: se a página sobreviver, o retry continua
        fetch(S.api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: corpo, keepalive: true }).catch(() => {});
      }
      return true;
    }
    salvandoAgora = true;
    ctx.ui.mostrarSalvando('salvando');
    let r = await enviarSave(payload, false);
    // outro save mais novo no servidor (amigo/outra aba)
    if (r.status === 409 && r.json.erro === 'conflito') {
      if (motivo === 'manual') {
        const porCima = window.confirm(
          'Opa! Outra pessoa salvou este mundo agorinha (vocês estão jogando juntos?).\n\n' +
          'OK = salvar o MEU jogo por cima do dela\nCancelar = deixar o save dela quieto'
        );
        if (porCima) {
          r = await enviarSave(payload, true);
        } else {
          conflito = true;
          salvandoAgora = false;
          ctx.ui.mostrarSalvando('nada');
          return false;
        }
      } else {
        conflito = true;
        salvandoAgora = false;
        ctx.ui.mostrarSalvando('nada');
        ctx.ui.mostrarToast('⚠️ Outra pessoa está salvando este mundo também! Salve pelo menu de pausa pra escolher o que fazer.', 'err', 4000);
        return false;
      }
    }
    salvandoAgora = false;
    if (r.ok) {
      conflito = false;
      baseSalvoEm = r.json.salvoEm || baseSalvoEm;
      ultimoSaveMs = performance.now();
      sujoDesdeUltimoSave = false;
      ctx.ui.mostrarSalvando('salvo');
      if (motivo === 'manual') {
        ctx.audio.somSalvo();
        ctx.ui.anunciar('Mundo salvo!');
      }
      return true;
    }
    ctx.ui.mostrarSalvando('erro');
    if (r.status !== 429) {
      ctx.ui.mostrarToast('📡 Não consegui salvar agora — vou tentar de novo!', 'err', 2600);
    }
    agendar(); // re-tenta no próximo ciclo
    return false;
  }

  function agendar() {
    sujoDesdeUltimoSave = true;
    clearTimeout(debounce);
    debounce = window.setTimeout(() => salvarAgora('auto'), S.debounceMs);
  }

  return {
    async criarMundo(n, s) {
      const r = await api({ acao: 'criar', nome: n, senha: s });
      if (!r.ok) return r.json.erro || 'Não deu pra falar com o servidor. Tenta de novo?';
      nome = n;
      senha = s;
      baseSalvoEm = 0;
      conflito = false;
      sujoDesdeUltimoSave = true; // mundo recém-gerado ainda não foi salvo
      return null;
    },
    // devolve null = carregou; '__NOVO__' = mundo existe mas nunca foi
    // salvo (criança criou e fechou a aba): gera de novo com a mesma
    // credencial em vez de deixar o nome morto; outra string = erro
    async carregarMundo(n, s) {
      const r = await api({ acao: 'carregar', nome: n, senha: s });
      if (!r.ok) return r.json.erro || 'Não deu pra falar com o servidor. Tenta de novo?';
      const p = r.json.payload;
      if (!p || typeof p.blocos !== 'string') {
        nome = n;
        senha = s;
        baseSalvoEm = r.json.salvoEm || 0;
        conflito = false;
        sujoDesdeUltimoSave = true;
        return '__NOVO__';
      }
      const blocos = decodificarRLE(p.blocos, ctx.mundo.dados.length, ctx.blocos.length - 1);
      if (!blocos) return 'Esse mundo está vazio ou quebrado. 😢';
      nome = n;
      senha = s;
      baseSalvoEm = r.json.salvoEm || 0;
      conflito = false;
      ctx.mundo.dados.set(blocos);
      ctx.estado.seed = p.seed >>> 0;
      ctx.estado.sel = Math.max(0, Math.min(ctx.hotbar.length - 1, p.sel | 0));
      const j = p.jogador || {};
      ctx.jogador.x = typeof j.x === 'number' ? j.x : ctx.cfg.mundo.SX / 2;
      ctx.jogador.y = typeof j.y === 'number' ? j.y : ctx.cfg.mundo.SY;
      ctx.jogador.z = typeof j.z === 'number' ? j.z : ctx.cfg.mundo.SZ / 2;
      ctx.jogador.yaw = typeof j.yaw === 'number' ? j.yaw : 0;
      ctx.jogador.pitch = typeof j.pitch === 'number' ? j.pitch : 0;
      sujoDesdeUltimoSave = false;
      return null;
    },
    salvarAgora,
    agendar,
    temMundo: () => nome !== '',
    nomeMundo: () => nome,
    sujo: () => sujoDesdeUltimoSave,
  };
}
