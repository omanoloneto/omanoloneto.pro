---
name: verify
description: Como buildar, servir e dirigir este site Astro (e os jogos de /class/games) pra verificação end-to-end com browser headless.
---

# Verificação deste repo

Site Astro estático. Sem testes — verificação é rodar no browser.

## Build + servir

```bash
npm run build                     # gera dist/ (valida TS dos data files)
npm run preview -- --port 4321    # serve dist/ (rodar em background)
```

URLs com barra final (`build.format: 'directory'`): `http://localhost:4321/class/games/<slug>/`.

## Dirigir com Playwright

Playwright NÃO está no repo. Instalar no scratchpad da sessão (não no projeto):

```bash
cd <scratchpad> && npm install playwright --no-fund --no-audit
npx playwright install chromium-headless-shell   # se versão do cache não bater
```

Script `.mjs` no scratchpad, `import { chromium } from 'playwright'`.

## Padrões dos jogos (/class/games)

- Estado exposto via atributos `data-*`: ler placar/HUD com `page.evaluate` em `[data-pontos]`, `[data-nivel]`, `[data-posicao]` etc.
- Fluxo: modal intro `[data-intro]` → clicar `[data-comecar]` → jogar → `[data-nivel-done]` → `[data-win]`.
- Toasts: esperar `.toast.ok.show` / `.toast.err.show`.
- Animações usam setTimeout de ~300–1400ms: dar `waitForTimeout` compatível entre ações.
- Testar mobile com viewport 360×740 (jogos são touch-first pra Chromebook/celular).
- Capturar `page.on('pageerror')` e console errors. 404 do ícone `/class/icons/<slug>.jpg` é esperado enquanto o jpg não existe (fallback de emoji cobre).

## Gotcha conhecido

Cenários com elementos `right:-6%` (mata/montes) criam overflow horizontal no container fixed do jogo; o browser pode scrollar o jogo pra fora da tela. O container do cenário (`.ceu`) precisa de `overflow: hidden`. Checar com `el.scrollLeft/scrollWidth` após clicar em Começar.
