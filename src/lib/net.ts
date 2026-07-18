export interface ApiResult {
  ok: boolean;
  status: number;
  json: any;
}

export async function apiJson(url: string, body: unknown, timeoutMs = 6000): Promise<ApiResult> {
  const aborto = new AbortController();
  const timer = setTimeout(() => aborto.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: aborto.signal,
    });
    const json = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, json };
  } catch {
    return { ok: false, status: 0, json: {} };
  } finally {
    clearTimeout(timer);
  }
}

export interface Poller {
  start(): void;
  stop(): void;
  running(): boolean;
  inflight(): boolean;
  schedule(soonMs?: number, withJitter?: boolean): void;
}

export function createPoller(opts: {
  run: () => Promise<void> | void;
  cadenceMs: () => number;
  jitterMs: number;
}): Poller {
  let active = false;
  let busy = false;
  let timer = 0;

  async function tick() {
    if (!active || busy) return;
    busy = true;
    try {
      await opts.run();
    } finally {
      busy = false;
    }
  }

  return {
    start() {
      active = true;
    },
    stop() {
      active = false;
      clearTimeout(timer);
    },
    running: () => active,
    inflight: () => busy,
    schedule(soonMs?: number, withJitter = soonMs === undefined) {
      if (!active) return;
      clearTimeout(timer);
      const base = soonMs ?? opts.cadenceMs();
      const jitter = withJitter ? (Math.random() * 2 - 1) * opts.jitterMs : 0;
      timer = window.setTimeout(tick, base + jitter);
    },
  };
}

export interface GenerationGuard {
  bump(): void;
  capture(): number;
  stale(g: number): boolean;
}

export function createGenerationGuard(): GenerationGuard {
  let gen = 0;
  return {
    bump() {
      gen++;
    },
    capture: () => gen,
    stale: (g: number) => g !== gen,
  };
}

export async function beaconOrKeepalive(url: string, body: string): Promise<void> {
  if (navigator.sendBeacon && navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }))) {
    return;
  }
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {});
}
