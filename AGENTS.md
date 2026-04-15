<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:windows-environment-warnings -->
# Ambiente Windows — Armadilhas conhecidas desta máquina

## ⚠️ `C:\package.json` fantasma — NÃO recriar, NÃO mover de volta

Esta máquina possui (ou possuía) um arquivo `C:\package.json` de um projeto antigo
("verde-ouro-stamp-generator"). Ele foi renomeado para `C:\package.json.bak` em abril 2026.

**Por que isso importa:** O `enhanced-resolve` do Node.js (usado pelo Turbopack e webpack)
sobe a árvore de diretórios para encontrar um `package.json` como "description file".
Quando processa CSS a partir de diretórios fora do projeto (ex: `C:\Users\pc\Desktop\Projetos\balneario-camboriu`),
ele encontrava `C:\package.json` — que não tem `tailwindcss` — e falhava silenciosamente
com `Can't resolve 'tailwindcss'`.

**Regras:**
- **Não restaurar** `C:\package.json.bak` para `C:\package.json`
- **Não criar** nenhum `package.json` em diretórios fora de projetos específicos
  (ex: não criar em `C:\`, `C:\Users\pc\`, `C:\Users\pc\Desktop\`, etc.)
- Se precisar verificar se o arquivo voltou: `Test-Path C:\package.json`

## ⚠️ `next.config.js` — não simplificar o `turbopack`

O `turbopack.resolveAlias` no `next.config.js` é **intencional** e protege contra o problema
acima. Não simplificar para `turbopack: {}` nem remover o bloco inteiro.

```js
// CORRETO — manter exatamente assim
const path = require('path')
const nextConfig = {
  turbopack: {
    resolveAlias: {
      'tailwindcss': path.resolve(__dirname, 'node_modules/tailwindcss'),
    },
  },
}

// ERRADO — não fazer
// turbopack: {}
// turbopack: { root: __dirname }
// (sem turbopack)
```

## ⚠️ Deploy via `git push`, nunca `netlify deploy --build --prod`

No Windows, `netlify deploy --build --prod` falha com `EPERM: operation not permitted`
devido a arquivos `.dll` do Prisma que ficam em uso pelo processo Node. Sempre fazer
deploy via `git push` para a branch `main`.
<!-- END:windows-environment-warnings -->
