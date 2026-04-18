# PROJETO: Sistema de Gestão de Reservas para Restaurantes (BR)

> **Documento de contexto para agentes de desenvolvimento.**
> Leia este arquivo integralmente antes de qualquer implementação.
> Última atualização: **Abril 2026 — pós-implementação das features de retenção**

---

## 1. Visão Geral

Este projeto é um **SaaS de gestão de reservas e relacionamento com clientes** voltado para o mercado de hospitalidade brasileiro (restaurantes, bares, lounges, espaços de eventos).

A inspiração é o SevenRooms, porém com diferenciais nativos para o Brasil:
- Interface 100% em português
- Preço em reais, planos acessíveis para estabelecimentos de todos os portes
- Integração com Pix, WhatsApp Business, iFood/Rappi
- Conformidade com LGPD
- Integração com sistemas fiscais brasileiros (NF-e / SAT)

---

## 2. Stack Tecnológica

| Camada | Tecnologia | Observações |
|---|---|---|
| Frontend | Next.js 15+ (App Router) | Padrão do projeto |
| Estilo | Tailwind CSS + shadcn/ui | Design system base |
| Backend | Next.js API Routes + tRPC | Tipagem end-to-end |
| ORM | Prisma | |
| Banco de Dados | PostgreSQL (Supabase) | |
| Autenticação | Clerk | Multi-tenant (por restaurante) |
| Realtime | Supabase Realtime | Atualização ao vivo do mapa de mesas |
| Pagamentos | Pagar.me | Pix nativo |
| WhatsApp | WPPConnect (local via ngrok) | Confirmações automáticas — `src/lib/zapi.ts` |
| E-mail | Resend | Notificações e confirmações |
| Deploy | Netlify (git push apenas — ver AGENTS.md) | |
| Package manager | **pnpm** | Nunca usar npm |

---

## 3. Arquitetura Multi-Tenant

Cada restaurante é um **tenant** isolado. A separação de dados deve ser feita por `restaurantId` em todas as tabelas. Um usuário pode ter acesso a múltiplos restaurantes (ex: rede de franquias).

```
Plataforma SaaS
│
├── Tenant A (Restaurante Alfa)
│   ├── Donos / Gerentes / Garçons
│   ├── Mesas, Reservas, Clientes, Configurações
│
├── Tenant B (Restaurante Beta)
│   └── ...
```

---

## 4. Módulos do Sistema

### 4.1 Módulo de Configuração do Restaurante
- Cadastro: nome, endereço, CNPJ, telefone, foto, logo, cover
- Horários de funcionamento por dia da semana
- Turnos configuráveis (ex: Almoço 12h–15h, Jantar 19h–23h)
- Capacidade máxima por turno
- **Política de reserva** (ver seção 5)
- `googlePlaceId` — usado para redirecionar avaliações positivas ao Google Reviews
- `occupationStatus` — toggle de lotação exibido no widget público (`OPEN` | `BUSY` | `FULL`)

### 4.2 Módulo de Mapa de Mesas
- Editor visual drag-and-drop do layout do salão
- Criação de mesas com: número/nome, capacidade mínima e máxima, posição no mapa, área (salão, varanda, bar, etc.)
- Visualização em tempo real do status de cada mesa:
  - `DISPONÍVEL` | `RESERVADA` | `OCUPADA` | `AGUARDANDO` | `BLOQUEADA`
- Suporte a múltiplos ambientes/áreas por restaurante

### 4.3 Módulo de Reservas
- Criação de reserva pelo operador (painel admin) ou pelo cliente (widget público)
- Campos obrigatórios: nome, telefone (WhatsApp), data, horário, número de pessoas
- Campos opcionais: e-mail, ocasião especial, restrições alimentares, observações
- Atribuição automática ou manual de mesa
- Status do ciclo de vida:
  ```
  PENDING → CONFIRMED → CHECKED_IN → FINISHED
                      → NO_SHOW
           → CANCELLED
  PENDING_PAYMENT → CONFIRMED (após Pix) | CANCELLED (expirado)
  ```
- Histórico completo de alterações por reserva (`ReservationStatusHistory`)
- `confirmToken` gerado na criação e **mantido** após confirmação — reutilizado para o link de avaliação pós-visita

> **Atenção:** `confirmByToken` é idempotente — se a reserva já estiver CONFIRMED ou CHECKED_IN,
> retorna sem erro e sem alterar o token. O token só é zerado em cancelamento definitivo ou
> quando a reserva é concluída e o link de avaliação foi enviado com sucesso.

### 4.4 Módulo de Pagamento Antecipado ⚙️ (OPCIONAL POR RESTAURANTE)

> **Esta funcionalidade é configurável pelo dono do restaurante.**
> Por padrão, está **desativada**. O add-on "Proteção No-Show" deve estar ativo (`noShowProtectionAddon: true`)
> para que o pagamento antecipado possa ser habilitado.

A configuração é gerenciada em `/dashboard/configuracoes/pagamento` e salva em `restaurant.prepaymentConfig` (Json):

```typescript
interface PrepaymentConfig {
  prepayment_enabled: boolean
  prepayment_type: 'POR_PESSOA' | 'VALOR_FIXO'
  prepayment_amount: number           // em reais; convertido p/ centavos no backend
  prepayment_expiry_minutes: number   // padrão: 30
  applies_to: 'TODAS' | 'FDS' | 'FERIADOS' | 'MANUAL'
  cancellation_deadline_hours: number // padrão: 24
  no_show_policy: 'COBRAR_TOTAL' | 'REEMBOLSAR' | 'CREDITO'
  upsell_occasions: string[]          // ex: ['BIRTHDAY', 'ROMANTIC']
  upsell_message: string
  upsell_package_name: string
}
```

**Fluxo de pagamento:**
1. Cliente faz reserva pelo widget → sistema verifica `prepaymentConfig`
2. Se ativo: gera QR Code Pix via Pagar.me, reserva fica como `PENDING_PAYMENT`
3. Confirmação automática via webhook do Pagar.me (`/api/webhooks/pagarme`)
4. Em caso de no-show: tratado manualmente pelo operador conforme `no_show_policy`

**Upsell de ocasiões:** quando `upsell_occasions` inclui o motivo informado pelo cliente no widget,
um card de oferta especial é exibido na tela de sucesso do widget. O restaurante entra em contato
via WhatsApp para confirmar os detalhes — sem cobrança adicional via app.

### 4.5 Módulo de Waitlist (Lista de Espera)

- Fila de espera quando não há slots disponíveis — formulário exibido diretamente no widget
- `WaitlistEntry` com posição na fila, token de confirmação e prazo de resposta
- Trigger automático: quando uma reserva é cancelada, o próximo da fila é notificado via WhatsApp
- Prazo de resposta: 30 minutos; se expirado, próximo da fila é notificado (via cron `expire-pending`)
- Página `/confirmar/[token]` resolve tanto reservas quanto convites de waitlist pelo mesmo token

**Estados de WaitlistEntry:**
```
WAITING → NOTIFIED → CONFIRMED (vira reserva automaticamente)
                   → DECLINED
                   → EXPIRED (prazo esgotado → próximo é notificado)
```

> **Regra de segurança:** `confirmFromWaitlist` e `declineFromWaitlist` só aceitam entradas
> em status `NOTIFIED`. Qualquer outro estado retorna erro para evitar confirmações fora do fluxo.

### 4.6 Módulo de CRM de Clientes
- Perfil do cliente criado automaticamente na primeira reserva
- Histórico completo: todas as reservas, gastos estimados, no-shows, cancelamentos
- Tags personalizáveis (ex: VIP, Alérgico a Glúten, Cliente Frequente) + auto-tags por regras
- Registro de preferências (mesa preferida, bebida favorita, etc.)
- Ocasiões especiais: aniversário, data de cadastro
- Score de confiabilidade (baseado em histórico de no-shows) — `reliabilityScore`
- `lastReview` salvo em `customer.preferences` após avaliação pós-visita
- **Consentimento LGPD**: registrado no momento do cadastro, com opção de exclusão de dados

### 4.7 Módulo de Notificações Automáticas
Todos os templates são editáveis pelo restaurante (`NotificationTemplate`).

| Gatilho | Canal | Quando |
|---|---|---|
| `RESERVATION_CREATED` | WhatsApp + E-mail | Imediato após criação da reserva |
| `REMINDER_24H` | WhatsApp | 24h antes — inclui opção SIM/NÃO |
| `REMINDER_2H` | WhatsApp | 2h antes — inclui opção SIM/NÃO |
| `PAYMENT_CONFIRMED` | WhatsApp | Após Pix confirmado |
| `WAITLIST_AVAILABLE` | WhatsApp | Quando mesa abre para fila de espera |
| `POST_VISIT` | WhatsApp | 2-4h após status FINISHED |
| `CANCELLED` | WhatsApp + E-mail | Após cancelamento |

**Respostas SIM/NÃO via WhatsApp:** processadas pelo webhook `/api/webhooks/wppconnect`.
Palavras reconhecidas: `SIM`, `S`, `1`, `OK`, `CONFIRMO`, `YES` → confirma; `NÃO`, `NAO`, `N`, `2`, `CANCELAR` → cancela.

**Review funnel pós-visita:**
- Rating ≥ 4 → redireciona para Google Reviews (se `googlePlaceId` configurado)
- Rating ≤ 3 → salva feedback internamente + notifica admin via WhatsApp (número do restaurante)
- Link de avaliação usa `confirmToken` — token preservado após confirmação para esse fim

### 4.8 Widget Público de Reservas

**Acesso:** `/r/[slug]` — embeddável em qualquer site via iframe

Features do widget (booking-widget.tsx):
- Seleção de data → horário → dados do cliente → qualificação → confirmação
- Faixa de ocupação no topo quando `occupationStatus` é `BUSY` ou `FULL`
- Se não há slots disponíveis: formulário de waitlist integrado (WaitlistForm)
- Upsell de ocasião especial na tela de sucesso (se configurado)
- Link direto para Google Reviews na tela de sucesso (se `googlePlaceId` configurado)
- Pagamento antecipado via Pix QR Code (se add-on ativo)
- Suporte a múltiplos idiomas (PT-BR, EN, ES)
- Rate limiting por IP no backend

### 4.9 Módulo de Status de Ocupação

Toggle no dashboard (home page) permite ao operador atualizar o status público em tempo real:

| Status | Exibição no widget | Comportamento |
|---|---|---|
| `OPEN` | Nada exibido | Normal |
| `BUSY` | 🟡 "Movimentado — algumas mesas disponíveis" | Normal |
| `FULL` | 🔴 "Lotado agora — mas você pode reservar para outro dia" | Formulário continua disponível |

> O status `FULL` **não bloqueia** o formulário de reservas. O cliente pode reservar para outro dia.

### 4.10 Módulo de Relatórios e Analytics
- Taxa de ocupação por dia/semana/mês
- Taxa de no-show e cancelamentos
- Reservas por canal de origem
- Clientes novos vs. recorrentes
- Tempo médio de permanência por mesa
- Receita de sinais coletados (se pagamento ativo)
- Exportação CSV / PDF

---

## 5. Regras de Negócio Críticas

### Reservas
- Uma mesa não pode ter duas reservas confirmadas no mesmo horário/turno
- Reservas com pagamento pendente expiram após `prepayment_expiry_minutes` (padrão: 30 min)
- No-show só pode ser marcado após o horário da reserva + tolerância

### Pagamento Antecipado
- **Sempre opcional para o restaurante** — jamais forçado pela plataforma
- Requer `noShowProtectionAddon: true` no restaurante para ser habilitado
- O sistema NUNCA cobra o cliente sem que o restaurante tenha ativado a funcionalidade
- Se `prepayment_amount` for 0 ou inválido, a reserva é confirmada sem cobrança e logado um aviso

### Waitlist
- `confirmFromWaitlist` e `declineFromWaitlist` só operam sobre entradas em status `NOTIFIED`
- Prazo de resposta: 30 minutos; depois disso, o cron `expire-pending` avança a fila automaticamente
- Trigger automático de waitlist ocorre no cancelamento de reserva (dentro de `reservations.updateStatus`)

### LGPD
- Dados de clientes só podem ser usados para gestão de reservas do restaurante onde foram coletados
- Exportação de dados do cliente disponível a qualquer momento
- Exclusão de dados remove PII mas mantém registros anonimizados para estatísticas
- Consentimento deve ser explícito no widget público

---

## 6. Estrutura de Pastas (Next.js App Router)

```
src/
├── app/
│   ├── (auth)/                          # Login, cadastro (Clerk)
│   ├── (dashboard)/dashboard/
│   │   ├── page.tsx                     # Home: OccupationToggle + card reservas sem confirmação
│   │   ├── reservas/                    # Lista e gestão de reservas
│   │   ├── mesas/                       # Editor do mapa de mesas
│   │   ├── waitlist/                    # Gestão da fila de espera
│   │   ├── clientes/                    # CRM de clientes
│   │   ├── configuracoes/
│   │   │   ├── page.tsx                 # Config geral (inclui Google Place ID)
│   │   │   ├── pagamento/page.tsx       # Config pagamento antecipado + upsell
│   │   │   ├── protecao-noshow/         # Toggle do add-on
│   │   │   └── notificacoes/            # Templates de WhatsApp/e-mail
│   │   └── relatorios/
│   ├── (public)/
│   │   ├── r/[slug]/page.tsx            # Widget público de reservas
│   │   ├── confirmar/[token]/page.tsx   # Confirma reserva OU convite de waitlist
│   │   └── avaliar/[token]/page.tsx     # Avaliação pós-visita + redirect Google
│   └── api/
│       ├── cron/
│       │   ├── reminders/route.ts       # REMINDER_24H, REMINDER_2H, POST_VISIT
│       │   ├── expire-pending/route.ts  # Expira reservas Pix + entradas NOTIFIED da waitlist
│       │   └── recurring/route.ts       # Reservas recorrentes
│       └── webhooks/
│           ├── pagarme/route.ts         # Confirmação Pix (HMAC validado)
│           └── wppconnect/route.ts      # Respostas SIM/NÃO do WhatsApp
├── components/
│   ├── ui/                              # shadcn/ui
│   ├── dashboard/
│   │   └── OccupationToggle.tsx         # Toggle de status de ocupação
│   └── widget/
│       ├── booking-widget.tsx           # Widget completo (reserva + waitlist + upsell)
│       └── confirmation-page.tsx        # Página de confirmação (reserva ou waitlist)
├── server/routers/
│   ├── reservations.ts                  # CRUD + updateStatus (com trigger waitlist automático)
│   ├── waitlist.ts                      # add, notifyNext, confirmFromWaitlist, declineFromWaitlist
│   ├── widget.ts                        # getRestaurantInfo, createReservation, submitReview
│   └── restaurant.ts                    # getById, update, updateOccupationStatus, updatePrepaymentConfig, updateGooglePlaceId
└── lib/
    ├── notifications.ts                 # Orquestrador de notificações (WhatsApp + e-mail)
    ├── notification-templates.ts        # Templates padrão editáveis
    ├── widgetPublic.ts                  # Lógica de criação de reserva + Pix
    ├── reservationRules.ts              # confirmToken, reliabilityScore, ACTIVE_STATUSES
    ├── zapi.ts                          # Cliente WPPConnect (sendWhatsApp, sendWhatsAppImage)
    └── pagarme.ts                       # Cliente Pagar.me (createPixOrder)
```

---

## 7. Modelo de Dados — Schema Atual (resumo dos campos relevantes)

```prisma
model Restaurant {
  // ... campos base ...
  googlePlaceId        String?    // usado no funil de review (redirect Google para rating >= 4)
  occupationStatus     String     @default("OPEN")  // "OPEN" | "BUSY" | "FULL"
  occupationUpdatedAt  DateTime?
  noShowProtectionAddon Boolean   @default(false)
  prepaymentConfig     Json?      // null = desativado; ver seção 4.4 para estrutura completa
  bcConnectPartnerId   String?
  bcConnectApiKey      String?
}

model Reservation {
  // ... campos base ...
  confirmToken          String?   @unique  // PRESERVADO após confirmação (reutilizado para reviewUrl)
  confirmTokenExpiresAt DateTime?
  reminder24hSentAt     DateTime?
  reminder2hSentAt      DateTime?
  postVisitSentAt       DateTime?
  originType            String?
  visitFrequency        String?
  consumptionPreferences String[]
  referralSource        String?
  optinMarketing        Boolean   @default(false)
  bcConnectSent         Boolean   @default(false)
}

model WaitlistEntry {
  // ... campos base ...
  status           WaitlistStatus  // WAITING | NOTIFIED | CONFIRMED | DECLINED | EXPIRED
  confirmToken     String?  @unique
  responseDeadline DateTime?
  notifiedAt       DateTime?
}

// confirmToken é compartilhado entre Reservation e WaitlistEntry.
// A página /confirmar/[token] resolve qual dos dois está sendo tratado
// checando Reservation primeiro, depois WaitlistEntry.
```

> **Pendência de infra:** Os campos `occupationStatus` e `occupationUpdatedAt` foram adicionados
> ao `schema.prisma` e o `prisma generate` foi executado com sucesso. A migration/push ao banco
> (`pnpm prisma db push`) falhou por indisponibilidade temporária do Supabase (P1001).
> **Executar `pnpm prisma db push` assim que a conexão com o banco estiver disponível.**

---

## 8. Modelo de Negócio (SaaS)

| Plano | Preço | Reservas/mês | Restaurantes | Obs |
|---|---|---|---|---|
| **Gratuito** | R$ 0 | até 50 | 1 | Sem pagamento antecipado |
| **Essencial** | R$ 199/mês | até 300 | 1 | Pagamento antecipado incluso |
| **Profissional** | R$ 399/mês | ilimitado | 1 | + Analytics avançado, integrações |
| **Rede** | R$ 799/mês | ilimitado | até 5 | + Painel consolidado |
| **Enterprise** | Sob consulta | ilimitado | ilimitado | White-label, SLA dedicado |

Add-on: **Proteção No-Show** — R$ 49/mês (habilita pagamento antecipado via Pix)

---

## 9. Fases de Desenvolvimento

### Fase 1 — MVP ✅ CONCLUÍDA
- [x] Autenticação e onboarding do restaurante (Clerk + multi-tenant)
- [x] Editor de mesas (mapa visual drag-and-drop)
- [x] CRUD completo de reservas (painel admin)
- [x] Widget público de reservas (`/r/[slug]`)
- [x] Notificações WhatsApp (RESERVATION_CREATED + REMINDER_24H + REMINDER_2H)
- [x] Respostas SIM/NÃO via WhatsApp (webhook WPPConnect)
- [x] Pagamento antecipado via Pix (opcional, configurável — add-on)
- [x] CRM básico de clientes (perfil automático + reliabilityScore)
- [x] Página de confirmação de reserva (`/confirmar/[token]`)

### Fase 2 — Features de Retenção ✅ CONCLUÍDA (Abril 2026)
- [x] Waitlist inteligente com trigger automático no cancelamento
- [x] Widget: fila de espera quando não há slots disponíveis
- [x] Widget: faixa de status de ocupação (OPEN / BUSY / FULL)
- [x] Widget: upsell de ocasiões especiais na tela de sucesso
- [x] Funil de reputação pós-visita (POST_VISIT → /avaliar/[token])
- [x] Review redirect ao Google para rating ≥ 4 (via googlePlaceId)
- [x] Alerta WhatsApp ao admin para review negativa (rating ≤ 3)
- [x] Dashboard: OccupationToggle na home
- [x] Dashboard: card "Reservas sem confirmação" na home
- [x] Configurações de pagamento antecipado (substituiu placeholder)
- [x] Configurações: campo Google Place ID
- [x] Bug fix: confirmByToken preserva confirmToken (antes zerava — quebrava reviewUrl)
- [x] /confirmar/[token] unificado: resolve reserva OU convite de waitlist pelo mesmo token

### Fase 3 — Pendências Técnicas
- [ ] **`pnpm prisma db push`** — aplicar occupationStatus/occupationUpdatedAt no Supabase
- [ ] Testes E2E Playwright para fluxo waitlist e review
- [ ] Relatórios e analytics (módulo 4.10)

### Fase 4 — Escala (ver ROADMAP_FUTURO.md)
- [ ] Landing page institucional com calculadora ROI (R1)
- [ ] Score preditivo de no-show (R2 — requer 500+ reservas históricas)
- [ ] Relatório automático semanal por e-mail (R3)
- [ ] Integração "Reserve pelo Google" (R4)
- [ ] App mobile (React Native / Expo)
- [ ] Integrações PDV (TOTVS, Linx)

---

## 10. Decisões de Arquitetura e Convenções

- **Idioma do código**: inglês (variáveis, funções, comentários técnicos)
- **Idioma da UI**: português do Brasil
- **Datas**: sempre armazenadas em UTC, exibidas no fuso do restaurante
- **Moeda**: armazenada em centavos (integer), exibida formatada como BRL
- **Telefones**: armazenados no formato E.164 (+5511999999999)
- **Validação**: Zod em todas as entradas (API e formulários)
- **confirmToken**: gerado na criação e **preservado** após confirmação — reutilizado para reviewUrl no POST_VISIT
- **Waitlist triggers**: automáticos via `reservations.updateStatus` (no cancelamento) e cron `expire-pending`
- **occupationStatus**: toggle manual pelo operador; não calculado automaticamente
- **prepaymentConfig**: requer `noShowProtectionAddon: true` para habilitar `prepayment_enabled`
- **Deploy**: sempre via `git push` — nunca `netlify deploy --build --prod` (EPERM no Windows)
- **Package manager**: pnpm — nunca npm

---

## 11. Segurança e Compliance

- Autenticação com Clerk (JWT gerenciado)
- RBAC: `OWNER` | `MANAGER` | `HOSTESS` | `STAFF`
- Rate limiting nas rotas públicas (widget de reservas) via `RateLimitBucket` no Prisma
- Dados sensíveis (CPF, cartão) nunca armazenados — tokenização via Pagar.me
- LGPD: consentimento explícito, direito ao esquecimento implementado
- Logs de auditoria via `ReservationStatusHistory` para todas as transições de status
- Webhooks validados por assinatura HMAC (Pagar.me via `x-pagarme-signature`)
- `upsellConfig` nunca expõe dados financeiros ao frontend público

---

> **Para o agente:** Ao iniciar uma tarefa neste projeto, identifique em qual módulo e fase ela se encaixa.
> Respeite as decisões de arquitetura acima. Pagamento antecipado é opcional e requer add-on ativo.
> Antes de implementar qualquer coisa, leia os arquivos relevantes — nunca infira comportamento pelo nome.
