export function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function cleanPlayerName(raw: string, max: number): string {
  return stripDiacritics(raw).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, max);
}
