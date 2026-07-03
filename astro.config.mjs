// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // Troque para o domínio final antes do deploy (usado em SEO/sitemap).
  site: 'https://omanoloneto.pro',
  // Saída estática em dist/ — pronto para subir via FTP.
  output: 'static',
  build: {
    // Gera /sobre/index.html em vez de /sobre.html — URLs limpas em qualquer host.
    format: 'directory',
  },
  integrations: [
    sitemap({
      // /class/app é o Controle de Aula — página pessoal, fora do sitemap
      filter: (page) => !page.includes('/class/app'),
    }),
  ],
  redirects: {
    // /class/games sem jogo específico → hub da sala de aula
    '/class/games': '/class',
  },
});
