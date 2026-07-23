const API = '/class/api/overdrive-map.php';
const KEY_MAPA = 'overdrive.map';
const KEY_SENHA = 'overdrive.senha';

export async function fetchPublishedMapa(): Promise<unknown | null> {
  try {
    const r = await fetch(API, { cache: 'no-store' });
    if (!r.ok) return null;
    const j = await r.json();
    return j && j.mapa ? j.mapa : null;
  } catch {
    return null;
  }
}

export function loadLocalDraft(): unknown | null {
  try {
    const raw = localStorage.getItem(KEY_MAPA);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveLocalDraft(mapa: unknown): void {
  try {
    localStorage.setItem(KEY_MAPA, JSON.stringify(mapa));
  } catch { }
}

export function getSenha(): string {
  try {
    return localStorage.getItem(KEY_SENHA) ?? '';
  } catch {
    return '';
  }
}

export function setSenha(senha: string): void {
  try {
    localStorage.setItem(KEY_SENHA, senha);
  } catch { }
}

export async function publishMapa(mapa: unknown, senha: string): Promise<{ ok: boolean; erro?: string }> {
  try {
    const r = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senha, mapa }),
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.ok) return { ok: true };
    return { ok: false, erro: j.erro ?? `erro ${r.status}` };
  } catch (e) {
    return { ok: false, erro: 'sem conexão' };
  }
}
