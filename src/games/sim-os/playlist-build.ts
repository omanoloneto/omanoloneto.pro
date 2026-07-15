// Playlist do player montada NO BUILD: escaneia uma pasta de public/ e gera
// a playlist + os arquivos-seed de música do VFS. Usado pelo frontmatter das
// páginas dos sims (o mesmo scan serve pra todos — pasta compartilhada).
// ATENÇÃO: usa node:fs — SÓ pode ser importado em frontmatter .astro (build),
// NUNCA em código que vai pro navegador.
import fs from 'node:fs';
import type { ArquivoSeed, Faixa } from './tipos';

const EXT_MUSICA = /\.(mp3|ogg|wav|m4a)$/i;

function slugFaixa(nome: string): string {
  return (
    nome
      .replace(EXT_MUSICA, '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'faixa'
  );
}

export function montarPlaylist(
  pastaAbs: string,
  urlBase: string
): { playlist: Faixa[]; seedsMusica: ArquivoSeed[] } {
  const nomes = fs.existsSync(pastaAbs)
    ? fs
        .readdirSync(pastaAbs)
        .filter((n) => EXT_MUSICA.test(n) && !n.startsWith('.'))
        .sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true, sensitivity: 'base' }))
    : [];

  // nome CRU na URL (encodeURIComponent): os bytes têm que casar com o FTP
  const playlist: Faixa[] = nomes.map((n) => ({
    nome: n,
    url: urlBase + encodeURIComponent(n),
  }));

  const idsVistos = new Map<string, number>();
  const seedsMusica: ArquivoSeed[] = playlist.map((f) => {
    let id = 'mus-' + slugFaixa(f.nome);
    const n = (idsVistos.get(id) || 0) + 1;
    idsVistos.set(id, n);
    if (n > 1) id += '-' + n;
    return { id, nome: f.nome, icone: 'musica', abrirCom: 'player', url: f.url };
  });

  return { playlist, seedsMusica };
}
