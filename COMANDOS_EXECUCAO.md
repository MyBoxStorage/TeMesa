# TeMesa — Status do Projeto e Comandos de Operação
# Última atualização: 15 de abril de 2026

## ═══════════════════════════════════════════════════
## REGRA PARA TODOS OS AGENTES DE IA NESTE PROJETO
## ═══════════════════════════════════════════════════

AGENTES SÓ PODEM USAR FERRAMENTAS DE FILESYSTEM (leitura e escrita de arquivos).
QUALQUER COMANDO POWERSHELL/TERMINAL DEVE SER ENTREGUE AO USUÁRIO PARA EXECUÇÃO MANUAL.
NUNCA execute comandos diretamente no terminal, mesmo que tenha acesso à ferramenta.

Formato obrigatório para entregar comandos ao usuário:

  Execute no PowerShell dentro da pasta do projeto:
  ```powershell
  <comandos aqui>
  ```

Exemplos do que NUNCA fazer diretamente:
  ❌ git add / git commit / git push
  ❌ pnpm install / pnpm dev / pnpm build
  ❌ netlify env:import
  ❌ Remove-Item / rm -rf
  ❌ prisma generate / prisma db push

Exemplos do que PODE fazer diretamente:
  ✅ Ler arquivos com ferramentas de filesystem
  ✅ Escrever/criar arquivos com ferramentas de filesystem
  ✅ Listar diretórios com ferramentas de filesystem

---

## ═══════════════════════════════════════════════════
## STATUS ATUAL ✅ FUNCIONANDO LOCALMENTE
## ═══════════════════════════════════════════════════

### Infraestrutura
✅ Banco de dados (Supabase) — schema criado, tabelas ok
✅ Restaurante porto-cabral-bc — criado com ID: cmnyw2nex00017btocqiyb0vs
   (Nota: este é o restaurante criado via onboarding, diferente do seed inicial)
✅ Turnos — Almoço (12h–15h30), Happy Hour (17h–19h Qui/Sex/Sáb), Jantar (19h–23h)
✅ Admin — techgeniushq@gmail.com tem isAdmin=true no banco
✅ Z-API — INSTANCE_ID e TOKEN configurados (CLIENT_TOKEN não necessário)
✅ Resend — API key configurada (contato@globallanding.com.br)

### Dashboard — todas as rotas ✅ 200
✅ /dashboard/reservas — lista, criar, filtrar, alterar status
✅ /dashboard/mesas — editor de mapa
✅ /dashboard/clientes — lista de clientes
✅ /dashboard/waitlist — fila de espera
✅ /admin — painel exclusivo do dono da plataforma
✅ /r/porto-cabral-bc — widget público (banco conectado)

---

## CORREÇÕES APLICADAS

### 1. tRPC v11 — enforceRestaurantRole (src/server/trpc.ts)
PROBLEMA: `unstable_pipe` não propaga `input` para middlewares no tRPC v11.
SOLUÇÃO: Reescrito usando `t.middleware` com `await getRawInput()` (API correta do tRPC v11).
```ts
// ERRADO (tRPC v10 / unstable_pipe)
enforceAuth.unstable_pipe(async ({ ctx, next, input }) => { ... })

// CORRETO (tRPC v11)
t.middleware(async ({ ctx, next, getRawInput }) => {
  const rawInput = await getRawInput()
  const restaurantId = (rawInput as Record<string, unknown>)?.restaurantId as string
})
```

### 2. next-themes — Script tag incompatível com React 19
PROBLEMA: ThemeProvider injeta `<script>` que React 19 rejeita em Client Components.
SOLUÇÃO: Removido ThemeProvider, classe `dark` aplicada diretamente no `<html>`.

### 3. Tailwind CSS — cache Turbopack corrompido
PROBLEMA: Turbopack procurava `tailwindcss` a partir de `C:\Users\pc\package-lock.json`.
SOLUÇÃO: Limpar `.next` + restaurar globals.css completo.

### 4. ReservationForm — inputs uncontrolled → controlled
PROBLEMA: Campos sem defaultValues começavam como `undefined`.
SOLUÇÃO: Todos os campos de texto iniciados com `''` no defaultValues.

### 5. middleware.ts → proxy.ts
PROBLEMA: Next.js 16 deprecou a convenção `middleware`.
SOLUÇÃO: Arquivo renomeado para src/proxy.ts.

---

## PRÓXIMOS PASSOS PARA IR AO AR (em ordem)

### PASSO 1 — Deploy no Netlify

Execute no PowerShell dentro de C:\Users\pc\Desktop\Projetos\balneario-camboriu\TeMesa:

```powershell
netlify env:import .env
git add -A
git commit -m "fix: trpc v11 getRawInput, reservation form defaultValues, proxy rename"
git push
```

Após o build concluir (~3 min), forçar redeploy para embutir vars NEXT_PUBLIC_*:
```powershell
git commit --allow-empty -m "chore: trigger redeploy with production env vars"
git push
```

### PASSO 2 — Secret CRON_SECRET no GitHub
GitHub → repositório TeMesa → Settings → Secrets and variables → Actions
→ New repository secret:
  Nome:  CRON_SECRET
  Valor: temesa_cron_secret_2026

### PASSO 3 — Tornar-se admin em produção
Após fazer login em https://temesa.vercel.app/sign-up
com techgeniushq@gmail.com, executar no Supabase SQL Editor:
  UPDATE "User" SET "isAdmin" = true WHERE email = 'techgeniushq@gmail.com';

### PASSO 4 — Verificar widget no Porto Cabral
O widget já está embebido em portocabralatual via TeMesaWidget.tsx.
Aponta para: https://temesa.vercel.app/r/porto-cabral-bc
Após deploy do TeMesa, aparece automaticamente na seção de reservas.

---

## URLS IMPORTANTES

| Recurso | URL |
|---|---|
| Widget Porto Cabral | https://temesa.vercel.app/r/porto-cabral-bc |
| Dashboard operador | https://temesa.vercel.app/dashboard/reservas |
| Painel admin (só você) | https://temesa.vercel.app/admin |
| Onboarding parceiro | https://temesa.vercel.app/onboarding |
| Confirmar reserva | https://temesa.vercel.app/confirmar/[token] |
| Cron expire-pending | https://temesa.vercel.app/api/cron/expire-pending |
| Cron reminders | https://temesa.vercel.app/api/cron/reminders |

---

## COMANDOS DO DIA A DIA

### Iniciar dev local
```powershell
cd C:\Users\pc\Desktop\Projetos\balneario-camboriu\TeMesa
pnpm dev
```

### Se CSS quebrar (erro do Turbopack)
```powershell
cd C:\Users\pc\Desktop\Projetos\balneario-camboriu\TeMesa
Remove-Item -Recurse -Force .next
pnpm dev
```

### Regenerar Prisma Client (após alterar schema.prisma)
```powershell
cd C:\Users\pc\Desktop\Projetos\balneario-camboriu\TeMesa
pnpm prisma generate
```

### Re-rodar seed (idempotente)
```powershell
cd C:\Users\pc\Desktop\Projetos\balneario-camboriu\TeMesa
pnpm tsx prisma/seed.ts
```

---

## PENDÊNCIAS

- [ ] Deploy Netlify (Passo 1)
- [ ] Secret CRON_SECRET no GitHub (Passo 2)
- [ ] isAdmin em produção (Passo 3)
- [ ] Clerk production keys (atual: pk_test_ — ok para testes)
- [ ] Z-API CLIENT_TOKEN (opcional — funciona sem)
- [ ] Pagar.me (opcional — só se ativar pagamento antecipado)
- [ ] Domínio personalizado no Netlify (opcional)
