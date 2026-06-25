<div align="center">

# omanoloneto.pro

**Portfólio pessoal de [Manolo Neto](https://omanoloneto.pro) — desenvolvedor de jogos & software, e professor.**

[![Site](https://img.shields.io/badge/site-omanoloneto.pro-34d399?style=flat-square)](https://omanoloneto.pro)
[![Astro](https://img.shields.io/badge/Astro-7-BC52EE?style=flat-square&logo=astro&logoColor=white)](https://astro.build)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)

<a href="https://omanoloneto.pro"><img src="docs/screenshot.png" alt="Captura do site omanoloneto.pro" width="720" /></a>

</div>

---

## ✨ Sobre

Site de página única (single-page) com foco em performance e SEO. Construído com **Astro** —
HTML estático, **zero JavaScript por padrão** — então carrega rápido e funciona em qualquer
hospedagem que sirva arquivos estáticos.

### Funcionalidades

- 🎮 **Portfólio** — jogos da franquia VMonsters (Unity, Godot, Flutter)
- 🌑 **Tema dark** com design tokens próprios (sem framework de CSS)
- 📱 **Responsivo** — menu mobile, layout fluido
- ✨ **Animações** de revelar ao rolar (respeita `prefers-reduced-motion`)
- 🔍 **SEO** — Open Graph, canonical, `sitemap.xml`, `robots.txt`, favicon
- ♿ **Acessível** — skip-link, foco visível, HTML semântico
- 🚀 **Deploy via FTP** em um comando

---

## 🛠️ Stack

| Camada | Tecnologia |
|--------|------------|
| Framework | [Astro 7](https://astro.build) (static output) |
| Linguagem | TypeScript (strict) |
| Estilo | CSS puro + design tokens (`:root`) |
| SEO | `@astrojs/sitemap` |
| Fontes | Inter + JetBrains Mono |
| Deploy | FTP (`curl`) |

---

## 🚀 Começando

Pré-requisito: [Node.js](https://nodejs.org) 18+.

```bash
git clone https://github.com/omanoloneto/omanoloneto.pro.git
cd omanoloneto.pro
npm install
npm run dev          # http://localhost:4321
```

### Scripts

| Comando | O que faz |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento (hot reload) |
| `npm run build` | Gera o site estático em `dist/` |
| `npm run preview` | Serve o `dist/` localmente (igual produção) |
| `./deploy.sh` | Build + upload via FTP |

---

## 📁 Estrutura

```
src/
├─ data/
│  ├─ site.ts          # nome, bio, email, redes sociais
│  └─ projects.ts      # projetos do portfólio
├─ components/         # Header, Hero, About, Projects, Skills, Teaching, Contact, Footer, Icon
├─ layouts/
│  └─ Layout.astro     # <head>, SEO, fontes, script de reveal
├─ pages/
│  └─ index.astro      # monta a home
└─ styles/
   └─ global.css       # design tokens, reset, utilitários
public/                # favicon, robots.txt (copiados como estão)
```

### Onde editar o conteúdo

| O quê | Arquivo |
|-------|---------|
| Nome, bio, email, redes | [`src/data/site.ts`](src/data/site.ts) |
| Projetos | [`src/data/projects.ts`](src/data/projects.ts) |
| Skills / stack | [`src/components/Skills.astro`](src/components/Skills.astro) |
| Cores / fontes / tema | [`src/styles/global.css`](src/styles/global.css) (bloco `:root`) |

---

## 📦 Deploy

A saída em `dist/` é estática — sobe em qualquer host (FTP, GitHub Pages, Vercel, Netlify…).

### FTP (configuração atual)

```bash
cp .env.example .env       # preencha as credenciais (o .env é ignorado pelo git)
./deploy.sh                # build + upload
```

O `deploy.sh` lê as variáveis de `.env` (ou do ambiente) e nunca guarda segredos no repositório.
A pasta pública neste host (Hostinger) é `domains/<dominio>/public_html/`.

> Antes de publicar em outro domínio, ajuste `site:` em [`astro.config.mjs`](astro.config.mjs)
> (afeta canonical e sitemap).

---

## 📄 Licença

[MIT](LICENSE) © Manolo Neto
