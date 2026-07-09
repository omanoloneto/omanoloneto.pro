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

Qualquer filho que vaze da viewport (cenário com `right:-6%`, inimigo perto da borda, HUD largo demais no mobile) cria overflow horizontal no container fixed do jogo; o browser pode scrollar o jogo pra fora da tela. Fixes em camadas: raiz do jogo usa `overflow: clip` (não `hidden` — clip impede scroll programático/por foco), cenário (`.ceu`/`.espaco`) e `.campo` com `overflow: hidden`. Checar com `el.scrollWidth === el.clientWidth` após começar o jogo, em desktop E mobile 360px.

## Acelerar testes de jogos com rAF/níveis longos

`page.route(URL, ...)` interceptando o HTML e reescrevendo o blob `data-dados` com regex: `"abates":\d+` → `"abates":1` (1 abate por nível), `"velocidade":[0-9.]+` → `0.55` (inimigo chega na linha em ~1.5s), `"intervaloSpawn":\d+` → `900`. Permite atravessar 10 níveis ou perder 3 vidas em segundos.
