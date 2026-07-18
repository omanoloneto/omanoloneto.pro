export function encodeRLE(data: Uint8Array): string {
  const bytes: number[] = [];
  let i = 0;
  while (i < data.length) {
    const id = data[i];
    let run = 1;
    while (i + run < data.length && data[i + run] === id && run < 65535) run++;
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

export function decodeRLE(b64: string, size: number, maxId: number): Uint8Array | null {
  try {
    const bin = atob(b64);
    const out = new Uint8Array(size);
    let pos = 0;
    for (let i = 0; i + 2 < bin.length; i += 3) {
      const run = bin.charCodeAt(i) | (bin.charCodeAt(i + 1) << 8);
      const id = bin.charCodeAt(i + 2);
      // id fora da tabela = save corrompido/versão futura: recusa inteiro
      // (deixar passar bricaria o mesher)
      if (id > maxId) return null;
      if (pos + run > size) return null;
      out.fill(id, pos, pos + run);
      pos += run;
    }
    return pos === size ? out : null;
  } catch {
    return null;
  }
}
