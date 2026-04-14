# TeMesa — Guia Completo de Implementação do Widget em um Site de Restaurante

> **Para agentes de IA e desenvolvedores.**
> Este documento descreve passo a passo como conectar um site de restaurante à plataforma TeMesa, ativando o sistema de reservas online com confirmação automática via WhatsApp.
> Siga a ordem exata. Não pule etapas.

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
10. [Testando o fluxo completo](#10-testando-o-fluxo-completo)
11. [Configurações opcionais](#11-configurações-opcionais)
12. [Referência de variáveis de ambiente](#12-referência-de-variáveis-de-ambiente)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Visão geral da arquitetura

```
Site do restaurante
  └── <iframe> ou <a href> apontando para:

TeMesa (https://temesa.app)
  └── /r/[slug]                    ← Widget público de reservas
        ├── Passo 1: Pessoas + Data
        ├── Passo 2: Horários disponíveis (via API tRPC)
        ├── Passo 3: Dados do cliente + LGPD
        └── Passo 4: Confirmação

  └── /confirmar/[token]           ← Página de confirmação/cancelamento
        ├── GET  → exibe reserva
        ├── POST → confirma presença
        └── POST → cancela reserva

Banco de dados (Supabase/PostgreSQL)
  └── Todos os dados isolados por restaurantId (multi-tenant)

Notificações
  ├── Z-API (WhatsApp Business) → cliente recebe confirmação, lembretes
  └── Resend (e-mail) → confirmação e lembretes (se e-mail fornecido)
```

**O widget é uma página Next.js hospedada no domínio TeMesa.** O site do restaurante apenas aponta para ela via `<iframe>` ou botão com link externo. Não há instalação de código no site do restaurante além de um único trecho HTML.

---

## 2. Pré-requisitos

Antes de começar, confirme que os itens abaixo estão disponíveis:

| Item | Onde obter | Obrigatório |
|---|---|---|
| Conta no TeMesa | `https://temesa.app/sign-up` | ✅ |
| Número de WhatsApp Business ativo | Meta Business / Z-API | ✅ |
| Credenciais Z-API (Instance ID + Token) | `https://z-api.io` | ✅ |
| Nome e slug do restaurante (ex: `bela-vista`) | Definido no cadastro | ✅ |
| Logo e cor primária do restaurante | Arquivo PNG/JPEG + hex da cor | Recomendado |
| Conta Resend para e-mails | `https://resend.com` | Opcional |

> **Slug:** identificador único do restaurante na URL. Deve ter apenas letras minúsculas, números e hífens. Exemplo: `restaurante-bela-vista`. Este valor define a URL final do widget: `https://temesa.app/r/restaurante-bela-vista`.

---

## 3. Criando a conta e o restaurante

### 3.1 Cadastro na plataforma

1. Acesse `https://temesa.app/sign-up`
2. Crie uma conta com e-mail e senha (ou Google)
3. Após o login, o sistema redireciona automaticamente para `/onboarding`

### 3.2 Onboarding — Passo 1: Dados do restaurante

Preencha o formulário com:

```
Nome do restaurante: [Nome exato que aparecerá no widget]
Slug (URL do widget): [ex: restaurante-bela-vista]
Telefone WhatsApp:   [ex: +55 47 99999-9999]
```

> **Atenção ao slug:** ele não pode ser alterado depois sem suporte. Escolha cuidadosamente. Use apenas letras minúsculas, números e hífens. Sem acentos, sem espaços.

Clique em **Criar restaurante**. O sistema cria automaticamente:
- O perfil do restaurante no banco
- Os templates de notificação padrão (WhatsApp + e-mail)
- O acesso de OWNER para o usuário criador

### 3.3 Onboarding — Passos 2, 3 e 4

Os passos de Turnos, Mesas e Notificações no onboarding são informativos. Clique **Pular por agora** em todos — a configuração real é feita nas seções seguintes com mais detalhes.

Ao chegar no passo 4, clique **Concluir** para ser redirecionado ao painel.

---

## 4. Configurando turnos

Os turnos definem **quando** o widget exibe horários disponíveis para reserva. Sem ao menos um turno ativo, o widget mostra "Sem disponibilidade" para qualquer data.

### 4.1 Acessar configuração de turnos

No painel, vá em **Configurações → Turnos**.

### 4.2 Criar um turno

Para cada período de atendimento (ex: Almoço, Jantar), crie um turno separado:

| Campo | Descrição | Exemplo |
|---|---|---|
| Nome | Nome exibido no widget | `Almoço` |
| Horário início | Formato HH:MM | `12:00` |
| Horário fim | Formato HH:MM | `15:00` |
| Dias da semana | Checkboxes de 0 (Dom) a 6 (Sáb) | `2,3,4,5,6` (Seg–Sáb) |
| Capacidade máxima | Total de **pessoas** aceitas no turno | `60` |
| Duração do giro | Tempo médio de permanência (minutos) | `90` |

> **Capacidade máxima:** é em número de **pessoas**, não de mesas. Se o restaurante aceita 60 pessoas por turno, coloque `60`. O widget filtra horários onde a soma de `partySize` das reservas confirmadas já atingiu esse limite.

### 4.3 Exemplo de configuração típica

```
Turno: Almoço
  Início: 12:00  Fim: 15:00
  Dias: Segunda a Sábado
  Capacidade: 60 pessoas
  Giro: 90 min

Turno: Jantar
  Início: 19:00  Fim: 23:00
  Dias: Terça a Domingo
  Capacidade: 80 pessoas
  Giro: 120 min
```

---

## 5. Criando o mapa de mesas

O mapa é necessário para que o sistema consiga fazer **atribuição de mesas** e exibir o status em tempo real no painel do operador.

### 5.1 Acessar o editor de mesas

No menu lateral, clique em **Mesas**.

### 5.2 Editor visual

O editor permite arrastar e posicionar mesas no canvas. Para cada mesa, defina:

| Campo | Descrição | Exemplo |
|---|---|---|
| Nome/Número | Identificador visível | `Mesa 12` |
| Capacidade | Máximo de pessoas | `4` |
| Capacidade mínima | Mínimo para ocupar | `2` |
| Área | Ambiente (salão, varanda, bar) | `Salão` |
| Forma | `SQUARE`, `ROUND`, `RECTANGLE`, `BOOTH`, `LONG_RECTANGLE` | `ROUND` |

### 5.3 Salvar

Clique em **Salvar mapa**. O sistema sincroniza automaticamente as mesas do canvas com o banco de dados.

> **Mínimo recomendado:** crie pelo menos as mesas reais do restaurante. Isso permite a atribuição automática de mesa no momento da reserva e a gestão visual no painel do operador durante o serviço.

---

## 6. Configurando o tema do widget

O widget herda as cores e fontes definidas aqui. Uma configuração cuidadosa faz o widget parecer parte nativa do site do restaurante.

### 6.1 Acessar configuração de tema

**Configurações → Tema**.

### 6.2 Campos disponíveis

| Campo | Descrição | Formato |
|---|---|---|
| Cor primária | Cor dos botões e destaques | `#HEX` ex: `#C8A96E` |
| Cor de destaque | Hover e acentos secundários | `#HEX` |
| Fonte | Família tipográfica | `Figtree`, `Inter`, `Playfair Display`, etc. |
| Border radius | Arredondamento dos botões | `0.5rem`, `1rem`, `0px` |
| Logo URL | URL pública da logo | `https://...` |
| Imagem de capa | URL pública da capa | `https://...` |

### 6.3 Recomendações por tipo de restaurante

```
Restaurante fine dining:
  primaryColor: #1a1a1a  (preto elegante)
  fontFamily: Playfair Display
  borderRadius: 0.25rem  (botões mais quadrados)

Restaurante casual/brasserie:
  primaryColor: #C8A96E  (dourado)
  fontFamily: Figtree
  borderRadius: 0.75rem

Bar/lounge:
  primaryColor: #7C3AED  (roxo)
  fontFamily: Inter
  borderRadius: 1rem
```

---

## 7. Configurando notificações WhatsApp

Este é o passo mais importante para a operação funcionar. Sem o WhatsApp configurado, reservas são criadas mas o cliente não recebe nenhuma comunicação.

### 7.1 Obter credenciais Z-API

1. Acesse `https://z-api.io` e crie uma conta
2. Crie uma instância conectada ao número WhatsApp Business do restaurante
3. Escaneie o QR Code com o celular do restaurante (app WhatsApp Business)
4. Anote os valores:
   - `ZAPI_INSTANCE_ID` — ID da instância (ex: `3D5F2A...`)
   - `ZAPI_TOKEN` — Token da instância
   - `ZAPI_CLIENT_TOKEN` — Token do cliente (na dashboard Z-API → API Keys)

### 7.2 Adicionar as credenciais ao ambiente

No arquivo `.env` do projeto TeMesa:

```env
ZAPI_INSTANCE_ID=SUA_INSTANCE_ID
ZAPI_TOKEN=SEU_TOKEN
ZAPI_CLIENT_TOKEN=SEU_CLIENT_TOKEN
ZAPI_BASE_URL=https://api.z-api.io
```

Se o projeto está no **Vercel**, adicione essas variáveis em:
`Settings → Environment Variables → Production`

### 7.3 Verificar templates de notificação

**Configurações → Notificações** exibe todos os templates ativos por gatilho e canal.

Os gatilhos disponíveis e quando são disparados:

| Gatilho | Quando | Canal padrão |
|---|---|---|
| `RESERVATION_CREATED` | Reserva criada | WhatsApp + E-mail |
| `REMINDER_24H` | 24h antes (cron horário) | WhatsApp + E-mail |
| `REMINDER_2H` | 2h antes (cron horário) | WhatsApp + E-mail |
| `PAYMENT_CONFIRMED` | Pix confirmado (webhook Pagar.me) | WhatsApp + E-mail |
| `WAITLIST_AVAILABLE` | Mesa liberada para cliente na lista | WhatsApp + E-mail |
| `POST_VISIT` | 2–4h após status FINISHED (cron) | WhatsApp + E-mail |
| `CANCELLED` | Reserva cancelada | WhatsApp + E-mail |

### 7.4 Personalizar um template

Os templates usam variáveis no formato `{{variavel}}`. Variáveis disponíveis:

```
{{guestName}}       → Nome do cliente
{{restaurantName}}  → Nome do restaurante
{{date}}            → Data formatada (dd/MM/yyyy)
{{time}}            → Horário (HH:mm)
{{partySize}}       → Número de pessoas
{{confirmUrl}}      → URL para confirmar presença
{{cancelUrl}}       → URL para cancelar reserva
{{reviewUrl}}       → URL de avaliação (aponta para a home por padrão)
```

Exemplo de template de confirmação customizado:

```
✅ *Olá {{guestName}}!*

Sua reserva no *{{restaurantName}}* foi confirmada com sucesso.

📅 Data: {{date}}
⏰ Horário: {{time}}
👥 Pessoas: {{partySize}}

Confirme sua presença: {{confirmUrl}}
Precisa cancelar? {{cancelUrl}}

Aguardamos você! 🍽️
```

---

## 8. Obtendo a URL e o código de embed

### 8.1 URL direta do widget

A URL do widget segue sempre o padrão:

```
https://temesa.app/r/[SLUG-DO-RESTAURANTE]
```

Exemplo: se o slug é `restaurante-bela-vista`:

```
https://temesa.app/r/restaurante-bela-vista
```

Para confirmar o slug exato, vá em **Configurações → Geral** e verifique o campo "Slug".

### 8.2 Código de embed (iframe)

Para embutir o widget diretamente em uma página do site do restaurante:

```html
<!-- Widget TeMesa — Reservas Online -->
<div style="width: 100%; max-width: 480px; margin: 0 auto;">
  <iframe
    src="https://temesa.app/r/SLUG-DO-RESTAURANTE"
    width="100%"
    height="700"
    frameborder="0"
    scrolling="auto"
    allow="clipboard-write"
    style="border: none; border-radius: 12px;"
    title="Reservas — Nome do Restaurante"
  ></iframe>
</div>
```

> Substitua `SLUG-DO-RESTAURANTE` e `Nome do Restaurante` pelos valores reais.

### 8.3 Botão com link externo (mais simples)

Abre o widget em uma nova aba. Indicado para sites simples ou landing pages:

```html
<a
  href="https://temesa.app/r/SLUG-DO-RESTAURANTE"
  target="_blank"
  rel="noopener noreferrer"
  style="
    display: inline-block;
    background-color: #COR-PRIMARIA-DO-RESTAURANTE;
    color: #ffffff;
    padding: 14px 32px;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 600;
    text-decoration: none;
    letter-spacing: 0.03em;
  "
>
  Reservar mesa
</a>
```

---

## 9. Adicionando ao site do restaurante

Escolha a abordagem de acordo com a plataforma do site:

### 9.1 WordPress / Elementor / WPBakery

1. Abra a página onde o widget deve aparecer no editor
2. Adicione um bloco/widget de **HTML personalizado** (Custom HTML)
3. Cole o código do iframe da seção 8.2
4. Salve e publique

Para o Elementor especificamente:
- Arraste o widget **HTML** para a seção desejada
- Cole o código do iframe no campo de conteúdo

### 9.2 Wix

1. No editor do Wix, clique em **Adicionar → Incorporar → Código HTML**
2. Cole o código do iframe
3. Ajuste o tamanho arrastando as alças do bloco (mínimo recomendado: 480 × 700px)
4. Publique o site

### 9.3 Squarespace

1. Adicione um bloco de **Código** (`/code` na barra de blocos)
2. Cole o código do iframe
3. Clique em **Aplicar**

### 9.4 Webflow

1. Arraste o componente **Embed** para a seção desejada
2. Cole o código do iframe no editor de embed
3. Salve e publique

### 9.5 Site HTML puro / Next.js / React

**HTML puro:** cole diretamente no `<body>` da página:

```html
<section id="reservas" style="padding: 60px 20px;">
  <h2 style="text-align: center; margin-bottom: 32px;">Faça sua reserva</h2>
  <div style="width: 100%; max-width: 480px; margin: 0 auto;">
    <iframe
      src="https://temesa.app/r/SLUG-DO-RESTAURANTE"
      width="100%"
      height="700"
      frameborder="0"
      style="border: none; border-radius: 12px;"
      title="Reservas online"
    ></iframe>
  </div>
</section>
```

**React / Next.js:**

```tsx
export function SecaoReservas() {
  return (
    <section id="reservas" className="py-16 px-4">
      <h2 className="text-center text-2xl font-bold mb-8">Faça sua reserva</h2>
      <div className="max-w-[480px] mx-auto">
        <iframe
          src="https://temesa.app/r/SLUG-DO-RESTAURANTE"
          width="100%"
          height={700}
          style={{ border: 'none', borderRadius: '12px' }}
          title="Reservas online"
        />
      </div>
    </section>
  )
}
```

---

## 10. Testando o fluxo completo

Execute este checklist **antes** de divulgar o link para clientes reais.

### 10.1 Checklist de pré-lançamento

```
□ 1. Abrir https://temesa.app/r/[slug] no browser
□ 2. Verificar que o nome e logo do restaurante aparecem corretamente
□ 3. Selecionar 2 pessoas e a data de hoje — botão "Ver horários" deve aparecer
□ 4. Confirmar que os turnos criados aparecem como opções de horário
□ 5. Selecionar um horário e preencher o formulário com dados de teste:
       Nome: Teste TeMesa
       WhatsApp: +55 [seu número]
       E-mail: [seu e-mail]
       Aceitar o checkbox LGPD
□ 6. Clicar "Confirmar reserva" — a tela de sucesso deve aparecer
□ 7. Verificar que a mensagem de confirmação chegou no WhatsApp
□ 8. Acessar o painel TeMesa → Reservas e confirmar que a reserva aparece
□ 9. No painel, clicar na reserva e tentar avançar o status para CHECKED_IN
□ 10. Abrir o link de cancelamento enviado no WhatsApp e testar o cancelamento
□ 11. Confirmar que a mensagem de cancelamento chegou no WhatsApp
```

### 10.2 Teste do iframe no site

```
□ 1. Abrir a página do site onde o iframe foi inserido
□ 2. Verificar que o widget carrega sem barra de scroll horizontal
□ 3. Testar no mobile (320px a 390px de largura)
□ 4. Verificar que o iframe não corta nenhuma parte do formulário
     (se cortar, aumentar o atributo height="..." no código do iframe)
□ 5. Verificar que o botão "Reservar mesa" (se usado) abre a URL correta
```

### 10.3 Ajuste de altura do iframe

O widget tem altura variável conforme o passo. Valores recomendados:

| Situação | height recomendado |
|---|---|
| Desktop | `700` |
| Mobile (via CSS responsive) | `750` |
| Apenas botão externo | N/A |

Para responsividade automática, use este snippet com JavaScript:

```html
<iframe
  id="temesa-widget"
  src="https://temesa.app/r/SLUG"
  width="100%"
  height="700"
  frameborder="0"
  style="border: none; border-radius: 12px; min-height: 600px;"
></iframe>
```

---

## 11. Configurações opcionais

### 11.1 Pagamento antecipado (sinal via Pix)

> **Esta funcionalidade está DESATIVADA por padrão.** Ative apenas se o restaurante quiser cobrar um sinal para confirmar a reserva.

Para ativar: **Configurações → Pagamento**

Campos de configuração:

```
prepayment_type:
  POR_PESSOA   → cobra X reais por cada pessoa do grupo
  VALOR_FIXO   → cobra um valor fixo por reserva
  PERCENTUAL   → cobra % do valor estimado

prepayment_amount:
  Valor em reais (ex: 50.00 → R$ 50 por pessoa)

prepayment_applies_to:
  TODAS_RESERVAS     → sempre cobra
  FERIADOS           → apenas em feriados
  FINAIS_DE_SEMANA   → sábado e domingo
  MANUAL             → operador decide caso a caso

no_show_policy:
  COBRAR_TOTAL    → retém o valor integral em caso de no-show
  COBRAR_PARCIAL  → retém parte
  REEMBOLSAR      → devolve tudo
  CREDITO         → vira crédito para próxima visita

cancellation_deadline_hours:
  Horas antes da reserva que o cliente pode cancelar sem cobrança
  Ex: 24 → pode cancelar até 24h antes sem perder o sinal
```

Quando o pagamento antecipado está ativo, o fluxo do widget inclui automaticamente uma etapa de Pix antes de confirmar a reserva. O cliente recebe o QR Code e o sistema aguarda o webhook do Pagar.me para confirmar.

**Requisito adicional para pagamento:** configurar as credenciais do Pagar.me no `.env`:

```env
PAGARME_API_KEY=ak_live_...
PAGARME_WEBHOOK_SECRET=seu_secret_hmac
```

### 11.2 Lista de espera (waitlist)

Quando um turno está lotado, o widget pode adicionar o cliente a uma fila de espera. O sistema envia notificação automática via WhatsApp quando uma mesa abrir.

A waitlist é ativada automaticamente quando `maxCapacity` do turno é atingida. Não há configuração adicional.

### 11.3 Domínio personalizado

Para que o widget apareça em `reservas.meurestaurante.com.br` ao invés de `temesa.app/r/slug`, configure um subdomínio no Vercel:

1. No painel Vercel do projeto TeMesa → **Settings → Domains**
2. Adicione o domínio `reservas.meurestaurante.com.br`
3. No DNS do domínio do restaurante, adicione um registro CNAME:
   ```
   reservas  CNAME  cname.vercel-dns.com
   ```
4. Aguarde a propagação (até 48h)

Após configurar, o widget fica acessível em `https://reservas.meurestaurante.com.br/r/slug`.

---

## 12. Referência de variáveis de ambiente

Todas as variáveis abaixo devem ser configuradas no arquivo `.env` (local) e no painel **Settings → Environment Variables** do Vercel (produção).

```env
# ── APLICAÇÃO ─────────────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=https://temesa.app
# URL base usada nos links de confirmação/cancelamento enviados por WhatsApp.
# Em produção: https://temesa.app (ou o domínio customizado)
# Em desenvolvimento: http://localhost:3000

# ── AUTENTICAÇÃO (Clerk) ──────────────────────────────────────────────────────
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard/reservas
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding

# ── BANCO DE DADOS (Supabase) ─────────────────────────────────────────────────
DATABASE_URL=postgresql://postgres:[SENHA]@aws-1-us-east-2.pooler.supabase.com:6543/postgres
# URL com pooler (porta 6543) — usada pela aplicação em runtime

DIRECT_URL=postgresql://postgres:[SENHA]@db.[PROJECT-REF].supabase.co:5432/postgres
# URL direta (porta 5432) — usada pelo Prisma para migrations/db push
# OBRIGATÓRIA para que `pnpm prisma db push` funcione sem travar

# ── WHATSAPP (Z-API) ──────────────────────────────────────────────────────────
ZAPI_INSTANCE_ID=sua_instance_id
ZAPI_TOKEN=seu_token
ZAPI_CLIENT_TOKEN=seu_client_token
ZAPI_BASE_URL=https://api.z-api.io

# ── E-MAIL (Resend) ───────────────────────────────────────────────────────────
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@temesa.app
# O domínio do from precisa estar verificado no Resend

# ── PAGAMENTOS (Pagar.me) — opcional ─────────────────────────────────────────
PAGARME_API_KEY=ak_live_...
PAGARME_WEBHOOK_SECRET=secret_para_validacao_hmac
# Necessário apenas se o módulo de pagamento antecipado estiver ativo

# ── SEGURANÇA ─────────────────────────────────────────────────────────────────
ENCRYPTION_KEY=chave_de_32_caracteres_exatos_aqui
# Usada para criptografar API keys de integrações no banco de dados
# Gerar com: node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"

CRON_SECRET=outra_chave_longa_aleatoria
# Protege as rotas /api/cron/* de chamadas não autorizadas
# O Vercel envia este token automaticamente nos headers dos cron jobs
# Configurar também em: vercel.json → env (ou como variável de ambiente no Vercel)
```

---

## 13. Troubleshooting

### Widget mostra "Sem disponibilidade" para todas as datas

**Causa mais provável:** nenhum turno ativo cadastrado, ou os turnos não incluem o dia da semana selecionado.

**Solução:**
1. Acessar **Configurações → Turnos**
2. Verificar se existe ao menos um turno com `isActive = true`
3. Verificar se os dias da semana do turno incluem a data selecionada no widget
4. Verificar se `maxCapacity` é maior que zero

---

### WhatsApp não está enviando mensagens

**Causa mais provável:** credenciais Z-API não configuradas ou instância desconectada.

**Como diagnosticar:**
1. Verificar as variáveis de ambiente `ZAPI_INSTANCE_ID`, `ZAPI_TOKEN` e `ZAPI_CLIENT_TOKEN`
2. No painel Z-API, verificar se a instância está no status **Conectada** (ícone verde)
3. Se a instância estiver desconectada, escanear o QR Code novamente com o WhatsApp Business

**Verificar nos logs do Vercel:**
- `[Z-API] Não configurado — mensagem não enviada` → variáveis de ambiente ausentes
- `[Z-API] Falha: ...` → credenciais incorretas ou instância offline
- `[Notifications] WhatsApp falhou: ...` → erro genérico com detalhes na mensagem

---

### `pnpm prisma db push` trava e não termina

**Causa:** o `DATABASE_URL` aponta para a URL do pooler (porta 6543), que não suporta DDL.

**Solução:** confirmar que `DIRECT_URL` está configurado no `.env` e que o `schema.prisma` contém:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")   ← esta linha é obrigatória
}
```

Alternativamente, executar o SQL diretamente no **Supabase SQL Editor**.

---

### O iframe está cortando o conteúdo

**Causa:** o atributo `height` do iframe é menor que a altura do widget.

**Solução:** aumentar o valor:

```html
height="800"  <!-- ou 850 para segurança em mobile -->
```

---

### Erro 403 ao criar reserva pelo widget

**Causa:** o endpoint de criação de reservas tem rate limiting. O limite padrão é 10 reservas por minuto por slug de restaurante.

**Contexto:** este limite existe para proteger o widget de abuso. Em condições normais de uso, nunca é atingido.

**Para testes:** aguardar 60 segundos e tentar novamente.

---

### Reserva criada mas não aparece no painel

**Causa possível:** o painel está filtrado por data específica e a reserva está em outra data.

**Solução:** remover o filtro de data no painel (clique no X do filtro de data para ver todas as reservas).

---

### Erro "Token expirado" ao confirmar ou cancelar pelo link

**Causa:** o token de confirmação expira 1 hora antes do horário da reserva. Após esse prazo, o link não funciona mais.

**Para o operador:** confirmar ou cancelar manualmente pelo painel em **Reservas → [reserva] → Alterar status**.

---

## Resumo de URLs importantes

| Recurso | URL |
|---|---|
| Widget de reservas | `https://temesa.app/r/[slug]` |
| Painel do operador | `https://temesa.app/dashboard/reservas` |
| Confirmação pelo cliente | `https://temesa.app/confirmar/[token]` |
| Cancelamento pelo cliente | `https://temesa.app/confirmar/[token]?action=cancel` |
| Onboarding (novo restaurante) | `https://temesa.app/onboarding` |

---

*Documento gerado com base no código-fonte do TeMesa. Versão de referência: abril de 2026.*
