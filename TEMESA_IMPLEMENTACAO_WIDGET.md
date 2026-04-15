# TeMesa — Guia Completo de Implementação em Produção

> **Para agentes de IA e desenvolvedores.**
> Documento validado em produção — abril 2026.
> Inclui todas as correções e armadilhas encontradas durante o deploy real.

---

## Índice

1. [Visão geral da arquitetura](#1-visão-geral-da-arquitetura)
2. [Pré-requisitos](#2-pré-requisitos)
3. [Criando a conta e o restaurante](#3-criando-a-conta-e-o-restaurante)
4. [Configurando turnos](#4-configurando-turnos)
5. [Criando o mapa de mesas](#5-criando-o-mapa-de-mesas)
6. [Configurando o tema do widget](#6-configurando-o-tema-do-widget)
7. [Configurando notificações WhatsApp](#7-configurando-notificações-whatsapp)
8. [Obtendo a URL e o código de embed](#8-obtendo-a-url-e-o-código-de-embed)
9. [Adicionando ao site do restaurante](#9-adicionando-ao-site-do-restaurante)
10. [Deploy em produção — Netlify](#10-deploy-em-produção--netlify)
11. [Variáveis de ambiente — referência completa](#11-variáveis-de-ambiente--referência-completa)
12. [Banco de dados — setup inicial](#12-banco-de-dados--setup-inicial)
13. [Crons externos — cron-job.org](#13-crons-externos--cron-joborg)
14. [Testando o fluxo completo](#14-testando-o-fluxo-completo)
15. [Configurações opcionais](#15-configurações-opcionais)
16. [Troubleshooting — erros conhecidos](#16-troubleshooting--erros-conhecidos)

---

## 1. Visão geral da arquitetura

```
Site do restaurante
  └── <iframe> ou <a href> apontando para:

TeMesa (https://unique-sfogliatella-a00c01.netlify.app)
  └── /r/[slug]                    ← Widget público de reservas
        ├── Passo 1: Pessoas + Data
        ├── Passo 2: Horários disponíveis (via tRPC → shifts.getAvailableSlots)
        ├── Passo 3: Dados do cliente + LGPD
        └── Passo 4: Confirmação (tela de sucesso)

  └── /confirmar/[token]           ← Confirmação/cancelamento pelo cliente
  └── /dashboard/reservas          ← Painel do operador
  └── /onboarding                  ← Cadastro de novo restaurante

Stack:
  Next.js 16.2.3 (App Router + Turbopack)
  tRPC v11 + Prisma v5 + PostgreSQL (Supabase)
  Clerk v7 (autenticação multi-tenant)
  Z-API (WhatsApp Business)
  Resend (e-mail)
  Netlify (deploy)
```

---

## 2. Pré-requisitos

| Item | Onde obter | Obrigatório |
|---|---|---|
| Conta Netlify | netlify.com | ✅ |
| Conta Supabase | supabase.com | ✅ |
| Conta Clerk | clerk.com | ✅ |
| Número WhatsApp Business + Z-API | z-api.io | ✅ |
| Netlify CLI instalado | `npm install -g netlify-cli` | ✅ |
| Conta Resend | resend.com | Recomendado |
| Conta cron-job.org | cron-job.org | Recomendado |

---

## 3. Criando a conta e o restaurante

### 3.1 Cadastro

1. Acesse `https://unique-sfogliatella-a00c01.netlify.app/sign-up`
2. Crie conta com e-mail e senha (ou Google)
3. O sistema redireciona para `/onboarding`

### 3.2 Onboarding — Passo 1

Preencha:
```
Nome do restaurante: [Nome exibido no widget]
Slug (URL do widget): [ex: porto-cabral-bc]
Telefone WhatsApp:   [ex: +55 47 99999-9999]
```

> **Slug:** use apenas letras minúsculas, números e hífens. Sem acentos.
> Define a URL: `https://unique-sfogliatella-a00c01.netlify.app/r/[slug]`.

### 3.3 Passos 2, 3 e 4 do onboarding

Clique **Pular por agora** em todos — configure em detalhe nas seções seguintes.

---

## 4. Configurando turnos

**Configurações → Turnos**

Sem ao menos um turno ativo, o widget mostra "Sem disponibilidade" para qualquer data.

| Campo | Descrição | Exemplo |
|---|---|---|
| Nome | Exibido no widget | `Jantar` |
| Horário início/fim | Formato HH:MM | `19:00` / `23:00` |
| Dias da semana | 0=Dom … 6=Sáb | `2,3,4,5,6` |
| Capacidade máxima | Total de **pessoas** | `80` |
| Duração do giro | Minutos de permanência média | `120` |

**Porto Cabral BC — turnos já criados via seed:**
| Turno | Horário | Dias | Cap. |
|---|---|---|---|
| Almoço | 12:00–15:30 | Todos | 120 |
| Happy Hour | 17:00–19:00 | Qui, Sex, Sáb | 60 |
| Jantar | 19:00–23:00 | Todos | 120 |

---

## 5. Criando o mapa de mesas

**Menu lateral → Mesas**

Use o editor visual para criar e posicionar mesas. Campos por mesa:

| Campo | Exemplo |
|---|---|
| Nome/Número | `Mesa 12` |
| Capacidade máxima | `4` |
| Capacidade mínima | `2` |
| Área | `Salão`, `Varanda`, `Bar` |
| Forma | `SQUARE`, `ROUND`, `RECTANGLE`, `BOOTH`, `LONG_RECTANGLE` |

Clique **Salvar mapa** após editar.

---

## 6. Configurando o tema do widget

**Configurações → Tema**

| Campo | Formato | Exemplo |
|---|---|---|
| Cor primária | `#HEX` | `#C8A96E` |
| Fonte | Nome da família | `Playfair Display` |
| Border radius | CSS | `0.75rem` |
| Logo URL | URL pública | `https://...` |

**Porto Cabral BC — tema configurado via seed:**
```json
{
  "primaryColor": "#C8A96E",
  "accentColor": "#C8A96E",
  "fontFamily": "Playfair Display",
  "borderRadius": "0.75rem"
}
```

---

## 7. Configurando notificações WhatsApp

### 7.1 Credenciais Z-API

1. Acesse z-api.io → crie instância → escaneie QR Code com WhatsApp Business
2. Anote: `ZAPI_INSTANCE_ID`, `ZAPI_TOKEN`, `ZAPI_CLIENT_TOKEN`
3. Configure no `.env` (valores atuais ainda são `TODO` — pendente)

### 7.2 Templates disponíveis

| Gatilho | Quando dispara |
|---|---|
| `RESERVATION_CREATED` | Reserva criada |
| `REMINDER_24H` | 24h antes (cron horário) |
| `REMINDER_2H` | 2h antes (cron horário) |
| `PAYMENT_CONFIRMED` | Pix confirmado (webhook) |
| `WAITLIST_AVAILABLE` | Mesa liberada na fila |
| `POST_VISIT` | 2–4h após FINISHED |
| `CANCELLED` | Reserva cancelada |

Variáveis disponíveis nos templates:
```
{{guestName}} {{restaurantName}} {{date}} {{time}} {{partySize}}
{{confirmUrl}} {{cancelUrl}} {{reviewUrl}}
```

---

## 8. Obtendo a URL e o código de embed

### 8.1 URL do widget — Porto Cabral BC
```
https://unique-sfogliatella-a00c01.netlify.app/r/porto-cabral-bc
```

### 8.2 Iframe (embed) — já integrado em portocabralatual
```html
<div style="width: 100%; max-width: 480px; margin: 0 auto;">
  <iframe
    src="https://unique-sfogliatella-a00c01.netlify.app/r/porto-cabral-bc"
    width="100%"
    height="700"
    frameborder="0"
    style="border: none; border-radius: 12px;"
    title="Reservas online — Porto Cabral BC"
  ></iframe>
</div>
```

> O iframe está implementado no site portocabralatual em
> `components/home/TeMesaWidget.tsx` e embutido na `ReservaSection.tsx`.

### 8.3 Botão externo
```html
<a
  href="https://unique-sfogliatella-a00c01.netlify.app/r/porto-cabral-bc"
  target="_blank"
  rel="noopener noreferrer"
>
  Reservar mesa
</a>
```

---

## 9. Adicionando ao site do restaurante

| Plataforma | Método |
|---|---|
| WordPress / Elementor | Bloco **HTML personalizado** → cole o iframe |
| Wix | **Adicionar → Incorporar → Código HTML** → cole o iframe |
| Squarespace | Bloco **/code** → cole o iframe |
| Webflow | Componente **Embed** → cole o iframe |
| HTML puro / Next.js | Cole diretamente na página |

Altura recomendada: `700px` desktop, `750px` mobile.

> **Atenção:** o widget `/r/[slug]` deve estar acessível em iframe de qualquer origem.
> O `next.config.js` já configura os headers corretos:
> - Rota `/r/:slug*`: `X-Frame-Options: ALLOWALL` + `Content-Security-Policy: frame-ancestors *`
> - Demais rotas: `X-Frame-Options: SAMEORIGIN` (proteção padrão)

---

## 10. Deploy em produção — Netlify

### 10.1 Arquivos obrigatórios na raiz do projeto

**`netlify.toml`:**
```toml
[build]
  command   = "pnpm prisma generate && pnpm run build"
  publish   = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

**`package.json`** — script `postinstall`:
```json
"scripts": {
  "postinstall": "prisma generate"
}
```

**`prisma/schema.prisma`** — datasource com `directUrl`:
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

**`tsconfig.json`** — excluir pasta `prisma`:
```json
"exclude": ["node_modules", "prisma"]
```

**`.npmrc`** — necessário para desenvolvimento local no Windows:
```
shamefully-hoist=true
ignore-scripts[]=sharp
ignore-scripts[]=unrs-resolver
```

**`next.config.js`** — configuração atual com headers de segurança e resolveAlias:
```js
const path = require('path')

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
]

const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    resolveAlias: {
      // Hardpina tailwindcss ao node_modules local.
      // Evita que enhanced-resolve suba a árvore e encontre
      // package.json fantasma em diretórios ancestrais.
      'tailwindcss': path.resolve(__dirname, 'node_modules/tailwindcss'),
    },
  },
  async headers() {
    return [
      { source: '/(.*)', headers: securityHeaders },
      {
        source: '/r/:slug*',
        headers: [
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
          { key: 'Content-Security-Policy', value: 'frame-ancestors *' },
        ],
      },
    ]
  },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'krwizgdhhtgxkwdamjpc.supabase.co' }],
  },
  experimental: { serverActions: { bodySizeLimit: '2mb' } },
}

module.exports = nextConfig
```

### 10.2 Deploy inicial — passo a passo

```bash
# 1. Criar repositório no GitHub e fazer push
git remote add origin https://github.com/SEU_USER/TeMesa.git
git branch -M main
git push -u origin main

# 2. No Netlify: New project → Import from GitHub → selecionar o repo
#    O Netlify detecta Next.js automaticamente e configura o plugin

# 3. Instalar Netlify CLI (usar npm, não pnpm global)
npm install -g netlify-cli

# 4. Login e link com o projeto Netlify
netlify login
netlify link

# 5. Importar TODAS as variáveis do .env para o Netlify de uma vez
netlify env:import .env

# 6. Forçar redeploy para embutir variáveis NEXT_PUBLIC_* no bundle
git commit --allow-empty -m "chore: trigger redeploy with env vars"
git push
```

> **Não usar** `netlify deploy --build --prod` no Windows — causa erro EPERM
> com arquivos `.dll` do Prisma em uso. Sempre fazer deploy via `git push`.

### 10.3 Deploys subsequentes

Todo `git push` para `main` dispara deploy automático.

Variáveis `NEXT_PUBLIC_*` são embutidas no bundle no momento do build.
Ao alterar qualquer variável de ambiente, sempre fazer um novo deploy.

---

## 11. Variáveis de ambiente — referência completa

```env
# ── APLICAÇÃO ──────────────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=https://unique-sfogliatella-a00c01.netlify.app
# NUNCA deixar como http://localhost:3000 em produção.

# ── AUTENTICAÇÃO (Clerk) ──────────────────────────────────────────────────────
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard/reservas
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding

# ── BANCO DE DADOS (Supabase) ─────────────────────────────────────────────────
DATABASE_URL=postgresql://postgres.XXXX:SENHA@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
# Transaction pooler — porta 6543 — runtime (Netlify serverless)

DIRECT_URL=postgresql://postgres:SENHA@db.XXXX.supabase.co:5432/postgres
# Direct connection — porta 5432 — prisma db push / migrations
# OBRIGATÓRIO: sem isso, prisma db push trava indefinidamente

NEXT_PUBLIC_SUPABASE_URL=https://XXXX.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# ── WHATSAPP (Z-API) — pendente de configuração ───────────────────────────────
ZAPI_INSTANCE_ID=TODO
ZAPI_TOKEN=TODO
ZAPI_CLIENT_TOKEN=TODO
ZAPI_BASE_URL=https://api.z-api.io

# ── E-MAIL (Resend) — pendente de configuração ───────────────────────────────
RESEND_API_KEY=TODO_re_...
RESEND_FROM_EMAIL=noreply@temesa.app

# ── PAGAMENTOS (Pagar.me) — opcional, desativado por padrão ──────────────────
PAGARME_API_KEY=TODO_ak_test_...
PAGARME_WEBHOOK_SECRET=TODO

# ── BC CONNECT ────────────────────────────────────────────────────────────────
BC_CONNECT_WEBHOOK_URL=https://bc-conect.fly.dev

# ── SEGURANÇA ─────────────────────────────────────────────────────────────────
ENCRYPTION_KEY=temesa2026seguranca123456789012
CRON_SECRET=temesa_cron_secret_2026
```

---

## 12. Banco de dados — setup inicial

### 12.1 Criar tabelas ✅ CONCLUÍDO

As tabelas foram criadas via `supabase-schema.sql` no SQL Editor do Supabase.
O restaurante Porto Cabral BC e seus 3 turnos foram criados via `pnpm tsx prisma/seed.ts`.

**Se precisar recriar do zero:**
1. supabase.com → seu projeto → **SQL Editor → New query**
2. Cole o conteúdo de `supabase-schema.sql`
3. Clique **Run**
4. Rode `pnpm prisma generate` e depois `pnpm tsx prisma/seed.ts`

### 12.2 Tabelas criadas

Todas as tabelas do schema Prisma mais:
```sql
CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  key       TEXT        PRIMARY KEY,
  count     INTEGER     NOT NULL DEFAULT 1,
  "resetAt" TIMESTAMPTZ NOT NULL
);
```

---

## 13. Crons externos — cron-job.org

O Netlify free não suporta crons com frequência maior que 1x/dia.
Configure no **cron-job.org** (gratuito).

**Job 1 — Expirar reservas com pagamento pendente:**
```
URL:        https://unique-sfogliatella-a00c01.netlify.app/api/cron/expire-pending
Método:     GET
Frequência: A cada 5 minutos
Header:     Authorization: Bearer temesa_cron_secret_2026
```

**Job 2 — Enviar lembretes (24h e 2h antes):**
```
URL:        https://unique-sfogliatella-a00c01.netlify.app/api/cron/reminders
Método:     GET
Frequência: A cada hora (minuto 0)
Header:     Authorization: Bearer temesa_cron_secret_2026
```

---

## 14. Testando o fluxo completo

```
□ 1. Abrir http://localhost:3000/r/porto-cabral-bc (dev) ou
       https://unique-sfogliatella-a00c01.netlify.app/r/porto-cabral-bc (prod)
□ 2. Nome "Porto Cabral BC" e tema dourado (#C8A96E) aparecem
□ 3. Selecionar 2 pessoas + data de hoje → botão "Ver horários disponíveis"
□ 4. Turnos: Almoço / Happy Hour / Jantar aparecem conforme o dia
□ 5. Selecionar horário → preencher formulário:
       Nome: Teste TeMesa
       WhatsApp: +55 [seu número]
       E-mail: [seu e-mail]
       Aceitar checkbox LGPD
□ 6. Clicar "Confirmar reserva" → tela de sucesso "Reserva confirmada! 🎉"
□ 7. (quando Z-API configurado) WhatsApp chegou no número informado
□ 8. Painel /dashboard/reservas → reserva aparece na lista
□ 9. Clicar na reserva → painel lateral com tabs Hóspede / Reserva / Histórico
□ 10. Avançar status: Confirmar → Check-in → Finalizar
□ 11. (quando Z-API configurado) Link de cancelamento pelo WhatsApp cancela
```

---

## 15. Configurações opcionais

### 15.1 Pagamento antecipado (sinal Pix)

Desativado por padrão. Ativar em **Configurações → Pagamento**.
Requer `PAGARME_API_KEY` e `PAGARME_WEBHOOK_SECRET`.

| Campo | Opções |
|---|---|
| `prepayment_type` | `POR_PESSOA` / `VALOR_FIXO` / `PERCENTUAL` |
| `prepayment_applies_to` | `TODAS_RESERVAS` / `FERIADOS` / `FINAIS_DE_SEMANA` / `MANUAL` |
| `no_show_policy` | `COBRAR_TOTAL` / `COBRAR_PARCIAL` / `REEMBOLSAR` / `CREDITO` |
| `cancellation_deadline_hours` | Horas antes para cancelar sem cobrança |

### 15.2 Domínio personalizado no Netlify

1. Netlify → **Domain management → Add domain**
2. DNS do domínio: `reservas CNAME unique-sfogliatella-a00c01.netlify.app`
3. Atualizar `NEXT_PUBLIC_APP_URL` e fazer redeploy

---

## 16. Troubleshooting — erros conhecidos

### `@clerk/nextjs: Missing publishableKey`
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` não foi embutida no bundle.
**Solução:** `netlify env:import .env` → novo deploy via `git push`.

### Build: `Cannot find module '@radix-ui/react-label'`
`field.tsx` importa pacote individual não instalado.
**Solução:** substituir `React.ComponentProps<typeof LabelPrimitive.Root>` por
`React.ComponentProps<typeof Label>` e remover o import de `@radix-ui/react-label`.

### Build: `Type error — partySize: unknown`
Zod v4: `z.coerce.number()` infere input como `unknown`.
**Solução:** usar `z.number()` + `parseInt(e.target.value, 10)` no `onChange`.

### Build: `Property 'address' is missing`
Form de onboarding não envia `address`.
**Solução:** `createRestaurant.mutate({ ...v, address: {} })`.

### Build: `PrismaClient not exported`
Prisma Client não gerado.
**Solução:** `"postinstall": "prisma generate"` no `package.json` +
excluir `"prisma"` do `tsconfig.json` + `pnpm prisma generate &&` no `netlify.toml`.

### Deploy: `publish directory same as base directory`
`netlify.toml` sem `publish = ".next"`.
**Solução:** adicionar `publish = ".next"` ao `[build]`.

### `prisma db push` trava
Pooler (porta 6543) não aceita DDL.
**Solução:** usar SQL Editor do Supabase com `directUrl = env("DIRECT_URL")` (porta 5432).

### Build local: `EPERM: operation not permitted` no Windows
`netlify deploy --build --prod` conflita com arquivos `.dll` do Prisma em uso.
**Solução:** nunca buildar localmente via CLI. Sempre fazer deploy via `git push`.

### Widget: "Sem disponibilidade" para todas as datas
Sem turno ativo ou turno não inclui o dia selecionado.
**Solução:** Configurações → Turnos → verificar `isActive`, dias da semana e `maxCapacity > 0`.

### next-themes: `Encountered a script tag while rendering React component` (React 19)
`ThemeProvider` do `next-themes` injeta `<script>` incompatível com React 19 / Next.js 16.
**Solução:** remover `next-themes` inteiramente. O dashboard usa `class="dark"` fixo no `<html>`.
O `layout.tsx` não importa mais `ThemeProvider`. O `providers.tsx` não tem mais `ThemeProvider`.

### `Can't resolve 'tailwindcss'` — enhanced-resolve sobe a árvore de diretórios ⚠️

**Sintoma:**
```
Error: Can't resolve 'tailwindcss' in 'C:\Users\pc\Desktop\Projetos\balneario-camboriu'
  using description file: C:\Users\pc\package.json
```
O enhanced-resolve parte de um diretório ancestral errado, não do `TeMesa`.

**Causa raiz:**
O `enhanced-resolve` sobe a árvore de diretórios procurando o `package.json` mais próximo
como "description file". Se houver um `package.json` em `C:\Users\pc\` ou qualquer ancestral
do projeto, ele é encontrado primeiro. Isso faz a resolução de CSS tentar buscar `tailwindcss`
em `C:\Users\pc\node_modules\` (inexistente), resultando no erro.

**Solução aplicada (permanente):**

1. Remover arquivos `package.json` / `package-lock.json` de diretórios fora do projeto
   (`C:\Users\pc\`, `C:\`, etc.) que não pertencem ao TeMesa.

2. `next.config.js` com `turbopack.resolveAlias` como defesa adicional:
```js
turbopack: {
  resolveAlias: {
    'tailwindcss': path.resolve(__dirname, 'node_modules/tailwindcss'),
  },
},
```

3. `.npmrc` com `shamefully-hoist=true` para garantir que pnpm exponha
   `tailwindcss` diretamente em `node_modules/` (não só no virtual store `.pnpm/`).

4. **Limpar o cache** se o erro persistir:
```powershell
Remove-Item -Recurse -Force .next
pnpm dev
```

**O que NÃO deve ser alterado:**
- `@import "tailwindcss"` no `globals.css` — é a sintaxe correta para Tailwind v4
- `postcss.config.mjs` com `@tailwindcss/postcss` — está correto
- Arquivos `.next/` devem ser limpos, não modificados

### `Cannot apply unknown utility class 'border-border'` após globals.css simplificado

**Causa:** o `globals.css` foi simplificado e perdeu o bloco `@theme inline` que mapeia
as variáveis CSS (`--border`, `--background`, etc.) para as classes do Tailwind.

**Solução:** restaurar o `globals.css` completo com:
```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-border: var(--border);
  --color-background: var(--background);
  /* ... todos os tokens ... */
}
```

O arquivo correto está em `src/app/globals.css`.

---

## Resumo de URLs importantes

| Recurso | URL |
|---|---|
| Widget Porto Cabral BC | `https://unique-sfogliatella-a00c01.netlify.app/r/porto-cabral-bc` |
| Painel do operador | `https://unique-sfogliatella-a00c01.netlify.app/dashboard/reservas` |
| Onboarding novo restaurante | `https://unique-sfogliatella-a00c01.netlify.app/onboarding` |
| Confirmação pelo cliente | `https://unique-sfogliatella-a00c01.netlify.app/confirmar/[token]` |
| Cancelamento pelo cliente | `https://unique-sfogliatella-a00c01.netlify.app/confirmar/[token]?action=cancel` |
| Cron — expirar reservas | `https://unique-sfogliatella-a00c01.netlify.app/api/cron/expire-pending` |
| Cron — lembretes | `https://unique-sfogliatella-a00c01.netlify.app/api/cron/reminders` |

---

## Estado atual do projeto (abril 2026)

### ✅ Concluído
- Schema Prisma completo (Restaurant, Table, Shift, Reservation, Customer, etc.)
- Banco de dados criado no Supabase (`supabase-schema.sql`)
- Restaurante `porto-cabral-bc` criado via seed com 3 turnos
- Widget público `/r/[slug]` funcional (4 passos: config → slots → form → sucesso)
- Dashboard `/dashboard/reservas` completo (lista, filtros, painel lateral, timeline)
- `ReservationForm` (criar reserva manualmente), `ReservationDetail` (alterar status)
- `ShiftForm` (criar/editar turnos via modal em Configurações → Turnos)
- Página `/confirmar/[token]` (confirmação e cancelamento pelo cliente)
- Onboarding `/onboarding` (fluxo de criação do restaurante)
- Crons `/api/cron/expire-pending` e `/api/cron/reminders`
- Notificações via WhatsApp (`sendNotification`) e e-mail (templates com variáveis)
- Integração com BC Connect (`sendBcEvent`)
- Headers de segurança + CORS do iframe configurados no `next.config.js`
- TeMesaWidget integrado no site portocabralatual (`components/home/TeMesaWidget.tsx`)

### 🔴 Pendente
- Configurar Z-API (WhatsApp): `ZAPI_INSTANCE_ID`, `ZAPI_TOKEN`, `ZAPI_CLIENT_TOKEN`
- Configurar Resend (e-mail): `RESEND_API_KEY`
- Tornar-se admin: `UPDATE "User" SET "isAdmin" = true WHERE email = 'SEU@EMAIL.COM'`
- Deploy para Netlify: `git push` + configurar env vars no painel do Netlify
- Configurar crons no cron-job.org

---

*Documento atualizado em abril 2026.*
*Sistema em desenvolvimento local. Deploy em `unique-sfogliatella-a00c01.netlify.app`.*
