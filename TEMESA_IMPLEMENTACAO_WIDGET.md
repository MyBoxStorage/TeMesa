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

TeMesa (https://seu-app.netlify.app)
  └── /r/[slug]                    ← Widget público de reservas
        ├── Passo 1: Pessoas + Data
        ├── Passo 2: Horários disponíveis (via tRPC)
        ├── Passo 3: Dados do cliente + LGPD
        └── Passo 4: Confirmação

  └── /confirmar/[token]           ← Confirmação/cancelamento pelo cliente
  └── /dashboard/reservas          ← Painel do operador
  └── /onboarding                  ← Cadastro de novo restaurante

Stack:
  Next.js 16 (App Router + Turbopack)
  tRPC + Prisma + PostgreSQL (Supabase)
  Clerk (autenticação multi-tenant)
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

1. Acesse `https://seu-app.netlify.app/sign-up`
2. Crie conta com e-mail e senha (ou Google)
3. O sistema redireciona para `/onboarding`

### 3.2 Onboarding — Passo 1

Preencha:
```
Nome do restaurante: [Nome exibido no widget]
Slug (URL do widget): [ex: restaurante-bela-vista]
Telefone WhatsApp:   [ex: +55 47 99999-9999]
```

> **Slug:** use apenas letras minúsculas, números e hífens. Sem acentos. Define a URL: `https://seu-app.netlify.app/r/[slug]`.

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
| Fonte | Nome da família | `Figtree` |
| Border radius | CSS | `0.75rem` |
| Logo URL | URL pública | `https://...` |

Exemplos por perfil:
```
Fine dining:  primaryColor: #1a1a1a | fontFamily: Playfair Display | borderRadius: 0.25rem
Casual:       primaryColor: #C8A96E | fontFamily: Figtree           | borderRadius: 0.75rem
Bar/Lounge:   primaryColor: #7C3AED | fontFamily: Inter             | borderRadius: 1rem
```

---

## 7. Configurando notificações WhatsApp

### 7.1 Credenciais Z-API

1. Acesse z-api.io → crie instância → escaneie QR Code com WhatsApp Business
2. Anote: `ZAPI_INSTANCE_ID`, `ZAPI_TOKEN`, `ZAPI_CLIENT_TOKEN`

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

### 8.1 URL do widget
```
https://seu-app.netlify.app/r/[SLUG]
```

### 8.2 Iframe (embed)
```html
<div style="width: 100%; max-width: 480px; margin: 0 auto;">
  <iframe
    src="https://seu-app.netlify.app/r/SLUG"
    width="100%"
    height="700"
    frameborder="0"
    style="border: none; border-radius: 12px;"
    title="Reservas online"
  ></iframe>
</div>
```

### 8.3 Botão externo
```html
<a
  href="https://seu-app.netlify.app/r/SLUG"
  target="_blank"
  rel="noopener noreferrer"
  style="display:inline-block; background:#000; color:#fff;
         padding:14px 32px; border-radius:8px; font-weight:600;
         text-decoration:none;"
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

**`package.json`** — script `postinstall`:**
```json
"scripts": {
  "postinstall": "prisma generate"
}
```

**`prisma/schema.prisma`** — datasource com `directUrl`:**
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

**`tsconfig.json`** — excluir pasta `prisma`:**
```json
"exclude": ["node_modules", "prisma"]
```

**`next.config.js`** — adicionar `turbopack: {}`:**
```js
const nextConfig = {
  turbopack: {},
  reactStrictMode: true,
  // ... resto das configs
}
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

Variáveis `NEXT_PUBLIC_*` são embutidas no bundle no momento do build. Ao alterar qualquer variável de ambiente, sempre fazer um novo deploy.

---

## 11. Variáveis de ambiente — referência completa

```env
# ── APLICAÇÃO ──────────────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=https://seu-app.netlify.app
# NUNCA deixar como http://localhost:3000 em produção.
# Usada em todos os links enviados por WhatsApp (confirmação, cancelamento).
# Copiar a URL gerada pelo Netlify após o primeiro deploy.

# ── AUTENTICAÇÃO (Clerk) ──────────────────────────────────────────────────────
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard/reservas
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding

# ── BANCO DE DADOS (Supabase) ─────────────────────────────────────────────────
DATABASE_URL=postgresql://postgres.XXXX:SENHA@aws-1-us-east-2.pooler.supabase.com:6543/postgres
# Transaction pooler — porta 6543 — usado pela aplicação em runtime

DIRECT_URL=postgresql://postgres:SENHA@db.XXXX.supabase.co:5432/postgres
# Direct connection — porta 5432 — usado pelo Prisma para DDL/migrations
# Supabase → Settings → Database → Direct connection
# OBRIGATÓRIO: sem isso, prisma db push trava indefinidamente

NEXT_PUBLIC_SUPABASE_URL=https://XXXX.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# ── WHATSAPP (Z-API) ──────────────────────────────────────────────────────────
ZAPI_INSTANCE_ID=sua_instance_id
ZAPI_TOKEN=seu_token
ZAPI_CLIENT_TOKEN=seu_client_token
ZAPI_BASE_URL=https://api.z-api.io
# Sem configuração: sistema funciona, mensagens não são enviadas.

# ── E-MAIL (Resend) ───────────────────────────────────────────────────────────
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@temesa.app
# Domínio precisa estar verificado no Resend.

# ── SEGURANÇA ─────────────────────────────────────────────────────────────────
ENCRYPTION_KEY=32characterslongexactlyrequired!
# Exatamente 32 caracteres.
# Gerar: node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"

CRON_SECRET=qualquer_string_longa_e_aleatoria
# Protege /api/cron/*. Usar o mesmo valor no cron-job.org como Bearer token.

# ── PAGAMENTOS (Pagar.me) — opcional ─────────────────────────────────────────
PAGARME_API_KEY=ak_live_...
PAGARME_WEBHOOK_SECRET=secret_hmac

# ── BC CONNECT — opcional ────────────────────────────────────────────────────
BC_CONNECT_WEBHOOK_URL=https://bc-conect.fly.dev
BC_CONNECT_ADMIN_API_KEY=sua_chave
```

---

## 12. Banco de dados — setup inicial

### 12.1 Criar tabelas (fazer apenas uma vez)

**Opção A — Via Supabase SQL Editor (recomendado):**
1. supabase.com → seu projeto → **SQL Editor → New query**
2. Cole o conteúdo de `supabase-schema.sql` (na raiz do projeto)
3. Clique **Run**

**Opção B — Via terminal (requer DIRECT_URL no .env):**
```bash
pnpm prisma db push
```

> Se o comando travar após 1 minuto, use a Opção A. O problema é o pooler.

### 12.2 Tabelas criadas

O schema inclui todas as tabelas do sistema mais:
```sql
-- Rate limiting para o widget público (serverless-safe)
CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  key       TEXT        PRIMARY KEY,
  count     INTEGER     NOT NULL DEFAULT 1,
  "resetAt" TIMESTAMPTZ NOT NULL
);
```

---

## 13. Crons externos — cron-job.org

O Netlify free não suporta crons com frequência maior que 1x/dia. Configure no **cron-job.org** (gratuito).

**Job 1 — Expirar reservas com pagamento pendente:**
```
URL:        https://seu-app.netlify.app/api/cron/expire-pending
Método:     GET
Frequência: A cada 5 minutos
Header:     Authorization: Bearer SEU_CRON_SECRET
```

**Job 2 — Enviar lembretes (24h e 2h antes):**
```
URL:        https://seu-app.netlify.app/api/cron/reminders
Método:     GET
Frequência: A cada hora (minuto 0)
Header:     Authorization: Bearer SEU_CRON_SECRET
```

---

## 14. Testando o fluxo completo

```
□ 1. Abrir https://seu-app.netlify.app/r/[slug]
□ 2. Nome e logo do restaurante aparecem corretamente
□ 3. Selecionar 2 pessoas + data de hoje → botão "Ver horários"
□ 4. Turnos criados aparecem como opções de horário
□ 5. Selecionar horário → preencher formulário:
       Nome: Teste TeMesa
       WhatsApp: +55 [seu número]
       E-mail: [seu e-mail]
       Aceitar checkbox LGPD
□ 6. Clicar "Confirmar reserva" → tela de sucesso aparece
□ 7. Mensagem WhatsApp de confirmação chegou no número informado
□ 8. Painel /dashboard/reservas → reserva aparece na lista
□ 9. Painel → clicar na reserva → avançar status para CHECKED_IN
□ 10. Clicar no link de cancelamento enviado pelo WhatsApp → cancela
□ 11. Mensagem WhatsApp de cancelamento chegou
```

---

## 15. Configurações opcionais

### 15.1 Pagamento antecipado (sinal Pix)

Desativado por padrão. Ativar em **Configurações → Pagamento**.

| Campo | Opções |
|---|---|
| `prepayment_type` | `POR_PESSOA` / `VALOR_FIXO` / `PERCENTUAL` |
| `prepayment_applies_to` | `TODAS_RESERVAS` / `FERIADOS` / `FINAIS_DE_SEMANA` / `MANUAL` |
| `no_show_policy` | `COBRAR_TOTAL` / `COBRAR_PARCIAL` / `REEMBOLSAR` / `CREDITO` |
| `cancellation_deadline_hours` | Horas antes para cancelar sem cobrança |

Requer `PAGARME_API_KEY` e `PAGARME_WEBHOOK_SECRET`.

### 15.2 Domínio personalizado no Netlify

1. Netlify → **Domain management → Add domain**
2. DNS do domínio: `reservas CNAME seu-app.netlify.app`
3. Atualizar `NEXT_PUBLIC_APP_URL` e fazer redeploy

---

## 16. Troubleshooting — erros conhecidos

### `@clerk/nextjs: Missing publishableKey`
Variável `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` não foi embutida no bundle.
**Solução:** `netlify env:import .env` → novo deploy via `git push`.

### Build: `Cannot find module '@radix-ui/react-label'`
`field.tsx` importa pacote individual não instalado.
**Solução:** substituir `React.ComponentProps<typeof LabelPrimitive.Root>` por `React.ComponentProps<typeof Label>` e remover o import de `@radix-ui/react-label`.

### Build: `Type error — partySize: unknown`
Zod v4: `z.coerce.number()` infere input como `unknown`.
**Solução:** usar `z.number()` + `parseInt(e.target.value, 10)` no `onChange`.

### Build: `Resolver — undefined not assignable`
Zod v4: `.default()` no schema torna o campo opcional no input.
**Solução:** remover `.default()` do schema, colocar o valor no `defaultValues` do `useForm`.

### Build: `Property 'address' is missing`
Form de onboarding não envia `address`.
**Solução:** `createRestaurant.mutate({ ...v, address: {} })`.

### Build: `turbopack webpack conflict`
`next-pwa` injeta webpack config no Next.js 16 (Turbopack padrão).
**Solução:** adicionar `turbopack: {}` ao `next.config.js`.

### Build: `PrismaClient not exported`
Prisma Client não gerado. `prisma/seed.ts` incluído no type-check.
**Solução:** `"postinstall": "prisma generate"` no `package.json` + excluir `"prisma"` do `tsconfig.json` + `pnpm prisma generate &&` no `netlify.toml`.

### Deploy: `publish directory same as base directory`
`netlify.toml` sem `publish = ".next"`.
**Solução:** adicionar `publish = ".next"` ao `[build]`.

### `prisma db push` trava
Pooler (porta 6543) não aceita DDL.
**Solução:** usar SQL Editor do Supabase, ou garantir `directUrl = env("DIRECT_URL")` no schema e `DIRECT_URL` (porta 5432) no `.env`.

### Build local: `EPERM: operation not permitted` no Windows
`netlify deploy --build --prod` conflita com arquivos `.dll` do Prisma em uso.
**Solução:** nunca buildar localmente via CLI. Sempre fazer deploy via `git push`.

### Widget: "Sem disponibilidade" para todas as datas
Sem turno ativo ou turno não inclui o dia selecionado.
**Solução:** Configurações → Turnos → verificar `isActive`, dias da semana e `maxCapacity > 0`.

---

## Resumo de URLs importantes

| Recurso | URL |
|---|---|
| Widget de reservas | `https://seu-app.netlify.app/r/[slug]` |
| Painel do operador | `https://seu-app.netlify.app/dashboard/reservas` |
| Confirmação pelo cliente | `https://seu-app.netlify.app/confirmar/[token]` |
| Cancelamento pelo cliente | `https://seu-app.netlify.app/confirmar/[token]?action=cancel` |
| Onboarding novo restaurante | `https://seu-app.netlify.app/onboarding` |
| Cron — expirar reservas | `https://seu-app.netlify.app/api/cron/expire-pending` |
| Cron — lembretes | `https://seu-app.netlify.app/api/cron/reminders` |

---

*Documento validado em produção — abril 2026.*
*Sistema em funcionamento em `unique-sfogliatella-a00c01.netlify.app`.*
