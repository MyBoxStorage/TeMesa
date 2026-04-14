# PROJETO: Sistema de Gestão de Reservas para Restaurantes (BR)

> **Documento de contexto para agentes de desenvolvimento.**
> Leia este arquivo integralmente antes de qualquer implementação.
> Última atualização: Abril 2026

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
| Frontend | Next.js 14+ (App Router) | Padrão do projeto |
| Estilo | Tailwind CSS + shadcn/ui | Design system base |
| Backend | Next.js API Routes + tRPC | Tipagem end-to-end |
| ORM | Prisma | |
| Banco de Dados | PostgreSQL (Supabase) | |
| Autenticação | NextAuth.js / Clerk | Multi-tenant (por restaurante) |
| Realtime | Supabase Realtime | Atualização ao vivo do mapa de mesas |
| Pagamentos | Pagar.me + Stripe | Pix nativo via Pagar.me |
| WhatsApp | Z-API ou Twilio (WhatsApp Business API) | Confirmações automáticas |
| E-mail | Resend | Notificações e confirmações |
| Deploy | Vercel (frontend) + Railway (workers) | |
| Storage | Supabase Storage | Fotos do restaurante, cardápios |

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
- Cadastro: nome, endereço, CNPJ, telefone, foto
- Horários de funcionamento por dia da semana
- Turnos configuráveis (ex: Almoço 12h–15h, Jantar 19h–23h)
- Capacidade máxima por turno
- **Política de reserva** (ver seção 5)
- Integração fiscal (NF-e / SAT) — opcional

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
  PENDENTE → CONFIRMADA → CHECK_IN → FINALIZADA
                        → NO_SHOW
             → CANCELADA
  ```
- Histórico completo de alterações por reserva

### 4.4 Módulo de Pagamento Antecipado ⚙️ (OPCIONAL POR RESTAURANTE)

> **Esta funcionalidade é configurável pelo dono do restaurante.**
> Por padrão, está **desativada**. O dono pode ativá-la nas configurações.

Quando ativada, o restaurante pode configurar:

| Configuração | Tipo | Descrição |
|---|---|---|
| `prepayment_enabled` | boolean | Liga/desliga o pagamento antecipado |
| `prepayment_type` | enum | `POR_PESSOA` \| `VALOR_FIXO` \| `PERCENTUAL` |
| `prepayment_amount` | decimal | Valor base (ex: R$ 50,00 por pessoa) |
| `prepayment_applies_to` | enum | `TODAS_RESERVAS` \| `FERIADOS` \| `FINAIS_DE_SEMANA` \| `MANUAL` |
| `no_show_policy` | enum | `COBRAR_TOTAL` \| `COBRAR_PARCIAL` \| `REEMBOLSAR` \| `CREDITO` |
| `cancellation_deadline_hours` | int | Horas antes da reserva para cancelamento sem cobrança |

**Fluxo de pagamento:**
1. Cliente faz reserva → sistema calcula valor do sinal
2. Link de pagamento Pix gerado automaticamente via Pagar.me
3. Reserva fica como `PENDENTE_PAGAMENTO` até confirmação do Pix
4. Confirmação automática via webhook do Pagar.me
5. Em caso de no-show: cobrança ou reembolso conforme política configurada

**Quando desativado:** o fluxo de reserva é direto, sem etapa de pagamento.

### 4.5 Módulo de Waitlist (Lista de Espera)
- Fila de espera automática quando não há mesa disponível
- Notificação automática via WhatsApp quando mesa liberar
- Tempo estimado de espera calculado pelo sistema
- Cliente pode confirmar ou recusar a mesa via resposta no WhatsApp

### 4.6 Módulo de CRM de Clientes
- Perfil do cliente criado automaticamente na primeira reserva
- Histórico completo: todas as reservas, gastos estimados, no-shows, cancelamentos
- Tags personalizáveis (ex: VIP, Alérgico a Glúten, Cliente Frequente)
- Registro de preferências (mesa preferida, bebida favorita, etc.)
- Ocasiões especiais: aniversário, data de cadastro
- Score de confiabilidade (baseado em histórico de no-shows)
- **Consentimento LGPD**: registrado no momento do cadastro, com opção de exclusão de dados

### 4.7 Módulo de Notificações Automáticas
Todos os templates são editáveis pelo restaurante.

| Gatilho | Canal | Descrição |
|---|---|---|
| Reserva criada | WhatsApp + E-mail | Confirmação com detalhes |
| 24h antes | WhatsApp | Lembrete da reserva |
| 2h antes | WhatsApp | Lembrete final |
| Pagamento confirmado | WhatsApp | Recibo do sinal |
| Mesa disponível (waitlist) | WhatsApp | Convite para confirmar |
| Pós-visita (2h depois) | WhatsApp | Agradecimento + link de avaliação |
| Cancelamento | WhatsApp + E-mail | Confirmação do cancelamento |

### 4.8 Widget Público de Reservas
- Componente embeddable (iframe ou script tag) para o site do restaurante
- Seleção de data → horário → número de pessoas → formulário
- Layout responsivo e personalizado com as cores do restaurante
- Suporte a múltiplos idiomas (PT-BR, EN, ES)
- Exibe disponibilidade em tempo real
- Se pagamento antecipado ativo: exibe valor do sinal e redireciona para Pix

### 4.9 Módulo de Relatórios e Analytics
- Taxa de ocupação por dia/semana/mês
- Taxa de no-show e cancelamentos
- Reservas por canal de origem (widget, telefone, iFood, manual)
- Clientes novos vs. recorrentes
- Tempo médio de permanência por mesa
- Receita de sinais coletados (se pagamento ativo)
- Exportação CSV / PDF

### 4.10 Módulo de Integrações (Fase 2)
- **iFood / Rappi**: importar pedidos de delivery e unificar com reservas de mesa
- **Google Calendar**: sincronizar eventos especiais e bloqueios
- **Google My Business**: exibir disponibilidade diretamente no Maps
- **NF-e / SAT Fiscal**: emissão de nota para cobranças de sinal
- **Zapier / Make**: automações customizadas

---

## 5. Regras de Negócio Críticas

### Reservas
- Uma mesa não pode ter duas reservas confirmadas no mesmo horário
- O sistema deve considerar tempo de ocupação médio configurável por restaurante
- Reservas com pagamento pendente expiram após `X` minutos (configurável, padrão: 30 min)
- Não-comparecimento (no-show) só pode ser marcado após o horário da reserva + tolerância configurável (padrão: 15 min)

### Pagamento Antecipado
- **Sempre opcional para o restaurante** — jamais forçado pela plataforma
- O sistema NUNCA cobra o cliente sem que o restaurante tenha ativado e configurado a funcionalidade
- Reembolsos são processados pelo restaurante via painel, não automáticos
- O valor do sinal é deduzido do total da conta (lógico, não automático — integração com PDV é fase 2)

### LGPD
- Dados de clientes só podem ser usados para gestão de reservas do restaurante onde foram coletados
- Exportação de dados do cliente disponível a qualquer momento
- Exclusão de dados remove PII mas mantém registros anonimizados para estatísticas
- Consentimento deve ser explícito no widget público

---

## 6. Estrutura de Pastas (Next.js App Router)

```
/
├── app/
│   ├── (auth)/               # Login, cadastro, recuperação de senha
│   ├── (dashboard)/          # Área logada do restaurante
│   │   ├── reservas/         # Lista e gestão de reservas
│   │   ├── mesas/            # Editor do mapa de mesas
│   │   ├── clientes/         # CRM de clientes
│   │   ├── configuracoes/    # Config do restaurante (inclui pagamento)
│   │   └── relatorios/       # Analytics e exportações
│   ├── (public)/
│   │   └── r/[slug]/         # Widget público de reservas
│   └── api/
│       ├── reservas/         # CRUD de reservas
│       ├── webhooks/
│       │   ├── pagarme/      # Confirmação de pagamento Pix
│       │   └── zapi/         # Webhooks do WhatsApp
│       └── trpc/             # Rota tRPC
├── components/
│   ├── ui/                   # shadcn/ui components
│   ├── mapa-mesas/           # Componentes do editor de mesas
│   ├── reservas/             # Componentes de reservas
│   └── widget/               # Widget público embeddable
├── lib/
│   ├── prisma.ts
│   ├── auth.ts
│   ├── pagarme.ts            # Client Pagar.me
│   ├── zapi.ts               # Client Z-API WhatsApp
│   └── notifications.ts      # Orquestrador de notificações
├── prisma/
│   └── schema.prisma
└── ...
```

---

## 7. Modelo de Dados Principal (Prisma Schema — resumo)

```prisma
model Restaurant {
  id                  String   @id @default(cuid())
  name                String
  slug                String   @unique  // usado na URL do widget público
  cnpj                String?
  phone               String
  address             Json
  settings            Json     // turnos, capacidade, política de reserva
  prepaymentConfig    Json?    // null = desativado; ver seção 4.4
  tables              Table[]
  reservations        Reservation[]
  customers           Customer[]
  users               UserRestaurant[]
}

model Table {
  id           String   @id @default(cuid())
  restaurantId String
  name         String   // ex: "Mesa 12" ou "Varanda A"
  capacity     Int
  minCapacity  Int      @default(1)
  area         String?  // salão, varanda, bar
  posX         Float    // posição no mapa
  posY         Float
  status       TableStatus @default(AVAILABLE)
  restaurant   Restaurant @relation(fields: [restaurantId], references: [id])
  reservations Reservation[]
}

model Reservation {
  id              String            @id @default(cuid())
  restaurantId    String
  customerId      String?
  tableId         String?
  guestName       String
  guestPhone      String
  guestEmail      String?
  partySize       Int
  date            DateTime
  shift           String            // "ALMOCO" | "JANTAR" | id do turno
  status          ReservationStatus @default(PENDING)
  occasion        String?
  notes           String?
  dietaryNotes    String?
  source          ReservationSource @default(MANUAL)
  prepayment      PrepaymentRecord?
  restaurant      Restaurant @relation(...)
  customer        Customer?  @relation(...)
  table           Table?     @relation(...)
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt
}

model PrepaymentRecord {
  id              String          @id @default(cuid())
  reservationId   String          @unique
  amount          Decimal
  status          PaymentStatus   @default(PENDING)
  pixCode         String?
  pixQrCode       String?
  pagarmeOrderId  String?
  paidAt          DateTime?
  refundedAt      DateTime?
  reservation     Reservation @relation(...)
}

model Customer {
  id           String   @id @default(cuid())
  restaurantId String
  name         String
  phone        String
  email        String?
  birthdate    DateTime?
  tags         String[]
  preferences  Json?
  lgpdConsent  Boolean  @default(false)
  lgpdConsentAt DateTime?
  noShowCount  Int      @default(0)
  visitCount   Int      @default(0)
  reservations Reservation[]
  restaurant   Restaurant @relation(...)
}

enum ReservationStatus {
  PENDING
  PENDING_PAYMENT
  CONFIRMED
  CHECKED_IN
  FINISHED
  NO_SHOW
  CANCELLED
}

enum TableStatus {
  AVAILABLE
  RESERVED
  OCCUPIED
  WAITING
  BLOCKED
}

enum ReservationSource {
  MANUAL
  WIDGET
  WHATSAPP
  IFOOD
  PHONE
}

enum PaymentStatus {
  PENDING
  PAID
  REFUNDED
  PARTIAL_REFUND
  EXPIRED
}
```

---

## 8. Modelo de Negócio (SaaS)

| Plano | Preço | Reservas/mês | Restaurantes | Obs |
|---|---|---|---|---|
| **Gratuito** | R$ 0 | até 50 | 1 | Sem pagamento antecipado |
| **Essencial** | R$ 199/mês | até 300 | 1 | Pagamento antecipado incluso |
| **Profissional** | R$ 399/mês | ilimitado | 1 | + Analytics avançado, integrações |
| **Rede** | R$ 799/mês | ilimitado | até 5 | + Painel consolidado |
| **Enterprise** | Sob consulta | ilimitado | ilimitado | White-label, SLA dedicado |

---

## 9. Fases de Desenvolvimento

### Fase 1 — MVP (3–4 meses)
- [ ] Autenticação e onboarding do restaurante
- [ ] Editor de mesas básico (sem drag-and-drop visual ainda)
- [ ] CRUD completo de reservas (painel admin)
- [ ] Widget público de reservas
- [ ] Notificações WhatsApp (criação + lembrete 24h)
- [ ] Pagamento antecipado via Pix (opcional, configurável)
- [ ] CRM básico de clientes

### Fase 2 — Crescimento (2–3 meses após MVP)
- [ ] Mapa de mesas visual com drag-and-drop
- [ ] Waitlist inteligente
- [ ] Relatórios e analytics
- [ ] Integração iFood/Rappi
- [ ] Notificações pós-visita e feedback

### Fase 3 — Escala
- [ ] App mobile (React Native / Expo) para operadores
- [ ] White-label para redes e franquias
- [ ] Integrações PDV (TOTVS, Linx)
- [ ] API pública para desenvolvedores

---

## 10. Decisões de Arquitetura e Convenções

- **Idioma do código**: inglês (variáveis, funções, comentários técnicos)
- **Idioma da UI**: português do Brasil
- **Datas**: sempre armazenadas em UTC, exibidas no fuso do restaurante
- **Moeda**: armazenada em centavos (integer), exibida formatada como BRL
- **Telefones**: armazenados no formato E.164 (+5511999999999)
- **Validação**: Zod em todas as entradas (API e formulários)
- **Erros**: tratados com classes de erro customizadas + logging estruturado
- **Testes**: Vitest para unitários, Playwright para E2E nos fluxos críticos
- **Feature flags**: configurações do restaurante controlam funcionalidades opcionais

---

## 11. Segurança e Compliance

- Autenticação com JWT + refresh tokens
- RBAC (controle de acesso por papel): `OWNER` | `MANAGER` | `STAFF`
- Rate limiting nas rotas públicas (widget de reservas)
- Dados sensíveis (CPF, cartão) nunca armazenados — usar tokenização do Pagar.me
- LGPD: consentimento explícito, direito ao esquecimento implementado
- Logs de auditoria para ações críticas (cancelamentos, cobranças, exclusões)
- Webhooks validados por assinatura HMAC (Pagar.me, Z-API)

---

> **Para o agente:** Ao iniciar uma tarefa neste projeto, identifique em qual módulo e fase ela se encaixa, respeite as decisões de arquitetura acima, e sempre considere que o pagamento antecipado é uma funcionalidade **opcional e configurável** — nunca deve ser obrigatória ou ativada por padrão.
