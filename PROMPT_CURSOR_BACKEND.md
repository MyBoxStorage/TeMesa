# TeMesa — Mega-Prompt para Agente de Backend (Cursor)

> **Para o agente Cursor:** Você é um engenheiro full-stack sênior especializado em Next.js e sistemas SaaS multi-tenant. Sua missão é construir do zero o backend completo do TeMesa. Leia este documento integralmente antes de escrever qualquer linha de código. Cada decisão técnica aqui é definitiva e não pode ser alterada sem justificativa explícita.

---

## 1. Contexto do Produto

**TeMesa** é um SaaS white-label de gestão de reservas para restaurantes brasileiros. É gratuito para o restaurante e monetizado via integração com o ecossistema **BC Connect** (plataforma de leads de Balneário Camboriú). O sistema é inspirado no SevenRooms, com diferenciais nativos para o Brasil.

**Repositório:** https://github.com/MyBoxStorage/TeMesa
**Supabase Project:** https://krwizgdhhtgxkwdamjpc.supabase.co
**Branch principal:** main

---

## 2. Stack Tecnológica — Locked (não alterar sem aprovação)

| Camada | Tecnologia | Versão |
|---|---|---|
| Runtime | Node.js | 22 LTS |
| Package Manager | pnpm | latest |
| Framework | Next.js | 14+ App Router |
| Linguagem | TypeScript | strict, zero `any` |
| Estilo | Tailwind CSS + shadcn/ui | latest |
| API | tRPC v11 | latest |
| ORM | Prisma | 5.x |
| Banco | PostgreSQL via Supabase | — |
| Auth | Clerk | latest |
| Realtime | Supabase Realtime | — |
| WhatsApp | Z-API | REST |
| Email | Resend | latest |
| Validação | Zod | v3 |
| Testes | Vitest | latest |
| Deploy | Vercel | — |
| CI/CD | GitHub Actions | — |


---

## 3. Inicialização do Projeto (zero absoluto — repo vazio)

Execute exatamente nesta ordem:

```bash
# Passo 1: Criar projeto Next.js
pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm

# Passo 2: Dependências principais
pnpm add @trpc/server @trpc/client @trpc/next @trpc/react-query @tanstack/react-query superjson
pnpm add @prisma/client prisma
pnpm add @clerk/nextjs
pnpm add @supabase/supabase-js
pnpm add zod
pnpm add resend
pnpm add konva react-konva
pnpm add next-pwa
pnpm add react-i18next i18next i18next-http-backend i18next-browser-languagedetector
pnpm add date-fns date-fns-tz
pnpm add nanoid
pnpm add sharp

# Passo 3: shadcn/ui
pnpm dlx shadcn@latest init
# Escolher: Default style → Zinc → CSS variables: yes
pnpm dlx shadcn@latest add button card dialog drawer form input label select sheet tabs badge avatar calendar popover dropdown-menu scroll-area separator skeleton switch table textarea toast tooltip command

# Passo 4: Dev dependencies
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom

# Passo 5: Prisma
pnpm prisma init --datasource-provider postgresql
```

---

## 4. Estrutura de Pastas Completa

```
temesa/
├── .github/workflows/deploy.yml
├── public/
│   ├── manifest.json               ← PWA manifest
│   └── icons/                      ← icon-192.png, icon-512.png
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   │   └── sign-up/[[...sign-up]]/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx           ← verifica Clerk + redireciona onboarding
│   │   │   ├── reservas/page.tsx
│   │   │   ├── reservas/[id]/page.tsx
│   │   │   ├── mesas/page.tsx       ← editor Konva
│   │   │   ├── waitlist/page.tsx
│   │   │   ├── clientes/page.tsx
│   │   │   ├── clientes/[id]/page.tsx
│   │   │   ├── garcons/page.tsx
│   │   │   ├── relatorios/page.tsx
│   │   │   └── configuracoes/
│   │   │       ├── page.tsx
│   │   │       ├── tema/page.tsx
│   │   │       ├── turnos/page.tsx
│   │   │       ├── notificacoes/page.tsx
│   │   │       ├── auto-tags/page.tsx
│   │   │       └── pagamento/page.tsx
│   │   ├── (public)/
│   │   │   ├── r/[slug]/page.tsx    ← widget público de reservas (iframe)
│   │   │   └── confirmar/[token]/page.tsx ← confirmação/cancelamento
│   │   ├── onboarding/page.tsx      ← wizard guiado (skippable)
│   │   └── api/
│   │       ├── trpc/[trpc]/route.ts
│   │       ├── cron/
│   │       │   ├── expire-pending/route.ts   ← expira PENDING_PAYMENT
│   │       │   └── reminders/route.ts        ← lembretes 24h e 2h
│   │       └── webhooks/
│   │           ├── pagarme/route.ts
│   │           └── zapi/route.ts
│   ├── server/
│   │   ├── trpc.ts                  ← init tRPC + context + middlewares
│   │   ├── root-router.ts           ← merge de todos os routers
│   │   └── routers/
│   │       ├── restaurant.ts
│   │       ├── shifts.ts
│   │       ├── tables.ts
│   │       ├── floor-plan.ts
│   │       ├── reservations.ts
│   │       ├── customers.ts
│   │       ├── waitlist.ts
│   │       ├── servers.ts
│   │       ├── notifications.ts
│   │       ├── auto-tags.ts
│   │       ├── analytics.ts
│   │       └── widget.ts            ← public router (sem auth)
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── supabase.ts
│   │   ├── zapi.ts
│   │   ├── resend.ts
│   │   ├── bcconnect.ts
│   │   ├── notifications.ts         ← orquestrador dos 7 gatilhos
│   │   ├── crypto.ts                ← encrypt/decrypt para API keys
│   │   └── utils.ts
│   ├── hooks/
│   │   ├── use-trpc.ts
│   │   └── use-realtime.ts          ← Supabase Realtime
│   └── types/index.ts
├── prisma/schema.prisma
├── .env.example
└── next.config.js
```


---

## 5. Variáveis de Ambiente (.env.example — criar este arquivo)

```env
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard/reservas
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://krwizgdhhtgxkwdamjpc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
DATABASE_URL=postgresql://postgres:[password]@db.krwizgdhhtgxkwdamjpc.supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:[password]@db.krwizgdhhtgxkwdamjpc.supabase.co:5432/postgres

# Z-API (WhatsApp)
ZAPI_INSTANCE_ID=...
ZAPI_TOKEN=...
ZAPI_CLIENT_TOKEN=...
ZAPI_BASE_URL=https://api.z-api.io

# Resend (Email)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@temesa.app

# Pagar.me (simulado no MVP — não bloquear fluxo se ausente)
PAGARME_API_KEY=ak_test_...
PAGARME_WEBHOOK_SECRET=...

# BC Connect
BC_CONNECT_WEBHOOK_URL=https://bc-conect.fly.dev
BC_CONNECT_ADMIN_API_KEY=...

# Segurança
ENCRYPTION_KEY=...         # 32 chars, para criptografar API keys no banco
CRON_SECRET=...            # protege rotas /api/cron/*
```


---

## 6. Schema Prisma Completo (prisma/schema.prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// ── ENUMS ────────────────────────────────────────────────────────────────────

enum StaffRole {
  OWNER    // acesso total
  MANAGER  // tudo exceto deletar restaurante
  HOSTESS  // floorplan, reservas, waitlist — sem configurações
  STAFF    // somente leitura: mesas ocupadas, nome do cliente, garçom atribuído
}

enum TableStatus {
  AVAILABLE
  RESERVED
  OCCUPIED
  WAITING
  BLOCKED
}

enum TableShape {
  SQUARE
  ROUND
  RECTANGLE
  BOOTH
  LONG_RECTANGLE
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

enum WaitlistStatus {
  WAITING
  NOTIFIED
  CONFIRMED
  DECLINED
  EXPIRED
}

enum NotificationTrigger {
  RESERVATION_CREATED
  REMINDER_24H
  REMINDER_2H
  PAYMENT_CONFIRMED
  WAITLIST_AVAILABLE
  POST_VISIT
  CANCELLED
}

enum NotificationChannel {
  WHATSAPP
  EMAIL
}
```


```prisma
// ── MODELS ───────────────────────────────────────────────────────────────────

model User {
  id          String           @id @default(cuid())
  clerkId     String           @unique
  email       String           @unique
  name        String
  phone       String?
  createdAt   DateTime         @default(now())
  restaurants UserRestaurant[]
}

model Restaurant {
  id                 String    @id @default(cuid())
  name               String
  slug               String    @unique
  cnpj               String?
  phone              String
  address            Json
  timezone           String    @default("America/Sao_Paulo")
  logoUrl            String?
  coverUrl           String?
  themeConfig        Json?
  // themeConfig: { primaryColor: string, secondaryColor: string,
  //   accentColor: string, fontFamily: string, borderRadius: string }
  operatingHours     Json
  // operatingHours: { monday: {open:"12:00",close:"23:00",enabled:true}, ... }
  prepaymentConfig   Json?
  // prepaymentConfig: null = desativado. Quando ativo:
  // { type:"POR_PESSOA"|"VALOR_FIXO"|"PERCENTUAL", amountCents:number,
  //   appliesTo:"TODAS"|"FERIADOS"|"FINAIS_DE_SEMANA"|"MANUAL",
  //   noShowPolicy:"COBRAR_TOTAL"|"COBRAR_PARCIAL"|"REEMBOLSAR"|"CREDITO",
  //   cancellationDeadlineHours:number, expirationMinutes:number }
  onboardingStatus   Json      @default("{\"restaurant\":false,\"shifts\":false,\"tables\":false,\"notifications\":false}")
  bcConnectPartnerId String?
  bcConnectApiKey    String?   // criptografado com ENCRYPTION_KEY
  isActive           Boolean   @default(true)
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  users                 UserRestaurant[]
  tables                Table[]
  floorPlan             FloorPlan?
  shifts                Shift[]
  reservations          Reservation[]
  customers             Customer[]
  waitlistEntries       WaitlistEntry[]
  notificationTemplates NotificationTemplate[]
  autoTags              AutoTag[]
  servers               Server[]
}

model UserRestaurant {
  id           String     @id @default(cuid())
  userId       String
  restaurantId String
  role         StaffRole  @default(STAFF)
  createdAt    DateTime   @default(now())
  user         User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  restaurant   Restaurant @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  @@unique([userId, restaurantId])
}

model FloorPlan {
  id            String     @id @default(cuid())
  restaurantId  String     @unique
  canvasData    Json
  // canvasData: Konva stage JSON serializado pelo método stage.toJSON()
  // Estrutura: { attrs:{width,height}, className:"Stage", children:[{layers}] }
  floorTemplate String     @default("wood")
  // Valores: wood | marble | dark | black | red | blue | brown | white | gray
  areas         String[]   @default(["Salão"])
  restaurant    Restaurant @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  updatedAt     DateTime   @updatedAt
}
```


```prisma
model Table {
  id           String      @id @default(cuid())
  restaurantId String
  name         String
  capacity     Int
  minCapacity  Int         @default(1)
  area         String?
  posX         Float       @default(0)
  posY         Float       @default(0)
  shape        TableShape  @default(SQUARE)
  rotation     Float       @default(0)
  status       TableStatus @default(AVAILABLE)
  restaurant   Restaurant  @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  reservations Reservation[]
  serverAssignments ServerTableAssignment[]
}

model Shift {
  id           String   @id @default(cuid())
  restaurantId String
  name         String
  startTime    String   // "12:00"
  endTime      String   // "15:00"
  daysOfWeek   Int[]    // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb
  maxCapacity  Int?
  turnDuration Int      @default(90)  // minutos por mesa
  isActive     Boolean  @default(true)
  restaurant   Restaurant @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  reservations Reservation[]
  waitlistEntries WaitlistEntry[]
}

model Reservation {
  id                    String            @id @default(cuid())
  restaurantId          String
  customerId            String?
  tableId               String?
  shiftId               String?
  serverId              String?
  guestName             String
  guestPhone            String            // E.164 (+5511999999999)
  guestEmail            String?
  partySize             Int
  date                  DateTime          // UTC
  status                ReservationStatus @default(PENDING)
  occasion              String?
  notes                 String?
  dietaryNotes          String?
  source                ReservationSource @default(MANUAL)
  confirmToken          String?           @unique  // nanoid(32)
  confirmTokenExpiresAt DateTime?         // = date - 1h
  lgpdConsent           Boolean           @default(false)
  lgpdConsentAt         DateTime?
  bcConnectSent         Boolean           @default(false)
  statusHistory         ReservationStatusHistory[]
  prepayment            PrepaymentRecord?
  restaurant            Restaurant        @relation(fields: [restaurantId], references: [id])
  customer              Customer?         @relation(fields: [customerId], references: [id])
  table                 Table?            @relation(fields: [tableId], references: [id])
  shift                 Shift?            @relation(fields: [shiftId], references: [id])
  server                Server?           @relation(fields: [serverId], references: [id])
  createdAt             DateTime          @default(now())
  updatedAt             DateTime          @updatedAt
}

model ReservationStatusHistory {
  id            String             @id @default(cuid())
  reservationId String
  fromStatus    ReservationStatus?
  toStatus      ReservationStatus
  changedBy     String?            // userId ou "SYSTEM"
  reason        String?
  reservation   Reservation        @relation(fields: [reservationId], references: [id], onDelete: Cascade)
  createdAt     DateTime           @default(now())
}

model PrepaymentRecord {
  id             String        @id @default(cuid())
  reservationId  String        @unique
  amountCents    Int
  status         PaymentStatus @default(PENDING)
  pixCode        String?
  pixQrCodeUrl   String?
  pagarmeOrderId String?
  paidAt         DateTime?
  refundedAt     DateTime?
  expiresAt      DateTime?
  reservation    Reservation   @relation(fields: [reservationId], references: [id])
}
```


```prisma
model Customer {
  id               String    @id @default(cuid())
  restaurantId     String
  name             String
  phone            String    // E.164
  email            String?
  birthdate        DateTime?
  tags             String[]
  preferences      Json?
  notes            String?
  lgpdConsent      Boolean   @default(false)
  lgpdConsentAt    DateTime?
  noShowCount      Int       @default(0)
  visitCount       Int       @default(0)
  totalSpentCents  Int       @default(0)
  reliabilityScore Float     @default(100)  // 0-100
  restaurant       Restaurant @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  reservations     Reservation[]
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  @@unique([restaurantId, phone])
}

model WaitlistEntry {
  id               String         @id @default(cuid())
  restaurantId     String
  shiftId          String?
  guestName        String
  guestPhone       String         // E.164
  guestEmail       String?
  partySize        Int
  date             DateTime
  position         Int
  status           WaitlistStatus @default(WAITING)
  notifiedAt       DateTime?
  responseDeadline DateTime?      // notifiedAt + 15 min
  confirmToken     String?        @unique
  restaurant       Restaurant     @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  shift            Shift?         @relation(fields: [shiftId], references: [id])
  createdAt        DateTime       @default(now())
}

model NotificationTemplate {
  id           String              @id @default(cuid())
  restaurantId String
  trigger      NotificationTrigger
  channel      NotificationChannel
  templatePtBr String
  templateEn   String?
  templateEs   String?
  isActive     Boolean             @default(true)
  restaurant   Restaurant          @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  @@unique([restaurantId, trigger, channel])
}

model AutoTag {
  id           String   @id @default(cuid())
  restaurantId String
  name         String
  color        String   @default("#6366f1")
  icon         String?
  conditions   Json
  // conditions: [{ field:"visitCount"|"noShowCount"|"tags"|"occasion"|"source",
  //                operator:"gte"|"lte"|"eq"|"contains", value:any }]
  isActive     Boolean  @default(true)
  restaurant   Restaurant @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  createdAt    DateTime @default(now())
}

model Server {
  id           String   @id @default(cuid())
  restaurantId String
  name         String
  userId       String?  // Se o garçom tiver login próprio no sistema
  isActive     Boolean  @default(true)
  restaurant   Restaurant @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  reservations Reservation[]
  tableAssignments ServerTableAssignment[]
}

model ServerTableAssignment {
  id        String   @id @default(cuid())
  serverId  String
  tableId   String
  date      DateTime @db.Date
  shiftId   String?
  server    Server   @relation(fields: [serverId], references: [id], onDelete: Cascade)
  table     Table    @relation(fields: [tableId], references: [id], onDelete: Cascade)
  @@unique([serverId, tableId, date])
}
```


---

## 7. Configuração do tRPC + Context + Middlewares (src/server/trpc.ts)

```typescript
import { initTRPC, TRPCError } from '@trpc/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import superjson from 'superjson'
import { ZodError } from 'zod'
import type { StaffRole } from '@prisma/client'

export const createTRPCContext = async () => {
  const { userId: clerkUserId } = await auth()
  return { clerkUserId, prisma }
}

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter: ({ shape, error }) => ({
    ...shape,
    data: {
      ...shape.data,
      zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
    },
  }),
})

export const router = t.router
export const publicProcedure = t.procedure

const enforceAuth = t.middleware(async ({ ctx, next }) => {
  if (!ctx.clerkUserId) throw new TRPCError({ code: 'UNAUTHORIZED' })
  const user = await ctx.prisma.user.findUnique({ where: { clerkId: ctx.clerkUserId } })
  if (!user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Usuário não encontrado' })
  return next({ ctx: { ...ctx, user } })
})

// Hierarquia: STAFF < HOSTESS < MANAGER < OWNER
const ROLE_HIERARCHY: StaffRole[] = ['STAFF', 'HOSTESS', 'MANAGER', 'OWNER']

export const enforceRestaurantRole = (minRole: StaffRole) =>
  enforceAuth.unstable_pipe(async ({ ctx, next, rawInput }) => {
    const restaurantId = (rawInput as Record<string, unknown>)?.restaurantId as string
    if (!restaurantId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'restaurantId obrigatório' })

    const membership = await ctx.prisma.userRestaurant.findUnique({
      where: { userId_restaurantId: { userId: ctx.user.id, restaurantId } },
    })
    if (!membership) throw new TRPCError({ code: 'FORBIDDEN' })

    if (ROLE_HIERARCHY.indexOf(membership.role) < ROLE_HIERARCHY.indexOf(minRole)) {
      throw new TRPCError({ code: 'FORBIDDEN', message: `Requer papel ${minRole} ou superior` })
    }
    return next({ ctx: { ...ctx, membership, restaurantId } })
  })

export const protectedProcedure = t.procedure.use(enforceAuth)
export const hostessProcedure   = t.procedure.use(enforceRestaurantRole('HOSTESS'))
export const managerProcedure   = t.procedure.use(enforceRestaurantRole('MANAGER'))
export const ownerProcedure     = t.procedure.use(enforceRestaurantRole('OWNER'))
```


---

## 8. Todos os tRPC Routers — Especificação Completa

### 8.1 restaurant.router.ts
```
create (protectedProcedure)
  input: { name, slug, phone, address, cnpj? }
  action: cria Restaurant + UserRestaurant(role=OWNER) + seed de NotificationTemplates padrão

getMyRestaurant (protectedProcedure)
  action: retorna o restaurante do usuário logado

update (ownerProcedure)
  input: { restaurantId, name?, phone?, address?, cnpj?, operatingHours? }

updateTheme (ownerProcedure)
  input: { restaurantId, primaryColor, secondaryColor, accentColor, fontFamily, borderRadius, logoUrl?, coverUrl? }

updateOnboardingStep (protectedProcedure)
  input: { restaurantId, step: "restaurant"|"shifts"|"tables"|"notifications", completed: boolean }

connectBcConnect (ownerProcedure)
  input: { restaurantId, partnerId, apiKey }
  action: criptografa apiKey com ENCRYPTION_KEY antes de salvar
```

### 8.2 shifts.router.ts
```
list (protectedProcedure)
  input: { restaurantId }

create (managerProcedure)
  input: { restaurantId, name, startTime, endTime, daysOfWeek, maxCapacity?, turnDuration?, isActive }

update (managerProcedure)
  input: { restaurantId, shiftId, ...campos }

delete (managerProcedure)
  action: isActive = false (soft delete)

getAvailableSlots (publicProcedure)
  input: { slug, date: string (YYYY-MM-DD), partySize }
  action: busca turnos ativos para o dia da semana;
          para cada turno, conta reservas CONFIRMED+PENDING_PAYMENT+CHECKED_IN;
          retorna slots onde (maxCapacity - ocupadas) >= partySize;
          retorna array de { shiftId, shiftName, startTime, endTime, area, availableSeats }
```

### 8.3 tables.router.ts
```
list (protectedProcedure)
  input: { restaurantId, area? }
  retorna mesas com status atual

create (managerProcedure)
  input: { restaurantId, name, capacity, minCapacity, area?, shape, posX, posY, rotation }

update (managerProcedure)
  input: { restaurantId, tableId, ...campos }

updateStatus (hostessProcedure)
  input: { restaurantId, tableId, status: TableStatus }
  REGRA: STAFF não pode chamar este método

delete (ownerProcedure)
  REGRA: não pode deletar mesa com reservas CONFIRMED ou CHECKED_IN

bulkUpdatePositions (managerProcedure)
  input: { restaurantId, updates: Array<{ tableId, posX, posY, rotation }> }
  action: atualiza posições após salvar o canvas Konva
```

### 8.4 floor-plan.router.ts
```
get (protectedProcedure)
  input: { restaurantId }
  retorna: canvasData, floorTemplate, areas

save (managerProcedure)
  input: { restaurantId, canvasData: any, floorTemplate: string, areas: string[] }
  action: upsert FloorPlan + chama bulkUpdatePositions para sincronizar mesas

getPublic (publicProcedure)
  input: { slug }
  retorna: canvasData simplificado (apenas posições e shapes, sem dados de clientes)
  usado pelo widget público para mostrar o layout visualmente
```

### 8.5 reservations.router.ts
```
list (protectedProcedure)
  input: { restaurantId, date?: string, status?: ReservationStatus, search?: string }
  retorna reservas com customer + table + server + shift

getById (protectedProcedure)
  input: { restaurantId, reservationId }
  retorna reserva completa com histórico

create (protectedProcedure | publicProcedure via widget)
  input: { restaurantId, guestName, guestPhone, guestEmail?, partySize, date,
           shiftId, tableId?, occasion?, notes?, dietaryNotes?, source,
           lgpdConsent: boolean }
  REGRA 1: verificar conflito de mesa (mesma mesa, mesmo turno, mesmo dia, status ativo)
  REGRA 2: se prepaymentConfig ativo → status=PENDING_PAYMENT; senão → CONFIRMED
  REGRA 3: gerar confirmToken=nanoid(32), confirmTokenExpiresAt=date-1h
  REGRA 4: upsert Customer por (restaurantId, guestPhone)
  REGRA 5: registrar status inicial no statusHistory
  REGRA 6: disparar notificação RESERVATION_CREATED (WhatsApp + email)
  REGRA 7: se lgpdConsent=true → sendBcEvent("RESERVATION")

updateStatus (hostessProcedure)
  input: { restaurantId, reservationId, status, reason? }
  MÁQUINA DE ESTADOS:
    PENDING → CONFIRMED | CANCELLED | PENDING_PAYMENT
    PENDING_PAYMENT → CONFIRMED (via webhook Pagar.me) | CANCELLED | EXPIRED
    CONFIRMED → CHECKED_IN | CANCELLED | NO_SHOW
    CHECKED_IN → FINISHED | NO_SHOW
    (FINISHED, NO_SHOW, CANCELLED são estados finais)
  AO MARCAR NO_SHOW: customer.noShowCount++ + recalcular reliabilityScore
  AO MARCAR FINISHED: customer.visitCount++ + recalcular reliabilityScore
  AO MARCAR CHECKED_IN: sendBcEvent("CHECK_IN")
  AO MARCAR FINISHED: sendBcEvent("CHECK_OUT") + agendar POST_VISIT para 2h depois
  AO MARCAR CANCELLED: disparar notificação CANCELLED

getByToken (publicProcedure)
  input: { token }
  retorna: { reservation, restaurant: { name, logoUrl, themeConfig } }
  usado para renderizar a página de confirmação/cancelamento com o tema do restaurante

confirmByToken (publicProcedure)
  input: { token }
  REGRA: verificar confirmTokenExpiresAt > now()
  action: status PENDING → CONFIRMED, invalidar token

cancelByToken (publicProcedure)
  input: { token }
  action: status CONFIRMED|PENDING → CANCELLED, disparar notificação CANCELLED
```


### 8.6 customers.router.ts
```
list (protectedProcedure)
  input: { restaurantId, search?, tags?: string[] }

getById (protectedProcedure)
  input: { restaurantId, customerId }
  retorna perfil completo + histórico de reservas

update (managerProcedure)
  input: { restaurantId, customerId, name?, email?, birthdate?, tags?, preferences?, notes? }
  AO ATUALIZAR preferences ou dietaryNotes: sendBcEvent("PREFERENCE_UPDATE")

applyAutoTags (managerProcedure)
  input: { restaurantId, customerId }
  action: avalia todas as autoTags do restaurante contra o perfil do cliente e aplica/remove tags

deleteData (ownerProcedure) — LGPD
  input: { restaurantId, customerId }
  action: name="Anonimizado", phone="00000000000", email=null, birthdate=null
          tags=[], preferences=null, notes=null, lgpdConsent=false
          Mantém contadores (visitCount, noShowCount) para estatísticas anônimas
```

### 8.7 waitlist.router.ts
```
list (protectedProcedure)
  input: { restaurantId, date }
  retorna fila ordenada por posição

add (publicProcedure ou protectedProcedure)
  input: { restaurantId, guestName, guestPhone, guestEmail?, partySize, date, shiftId? }
  action: calcula posição (max+1), gera confirmToken para futuras ações

notifyNext (hostessProcedure)
  input: { restaurantId, waitlistEntryId }
  action: status=NOTIFIED, notifiedAt=now(), responseDeadline=now()+15min
          envia WhatsApp com link de confirmação (WAITLIST_AVAILABLE)

confirmFromWaitlist (publicProcedure)
  input: { token }
  REGRA: verificar responseDeadline > now()
  action: cria Reservation automaticamente, status da fila=CONFIRMED

declineFromWaitlist (publicProcedure)
  input: { token }
  action: status=DECLINED, chama notifyNext para o próximo

remove (managerProcedure)
  input: { restaurantId, waitlistEntryId }
```

### 8.8 servers.router.ts
```
list (protectedProcedure)
  input: { restaurantId }

create (managerProcedure)
  input: { restaurantId, name, userId? }

update (managerProcedure)
  input: { restaurantId, serverId, name?, isActive? }

assignTables (managerProcedure)
  input: { restaurantId, serverId, tableIds: string[], date, shiftId? }
  action: upsert ServerTableAssignment para cada mesa

getTodayAssignments (protectedProcedure)
  input: { restaurantId, date }
  retorna mapa: { tableId → { server: { id, name } } }
  STAFF pode chamar este método (apenas leitura)
```

### 8.9 notifications.router.ts
```
listTemplates (protectedProcedure)
  input: { restaurantId }

updateTemplate (managerProcedure)
  input: { restaurantId, trigger, channel, templatePtBr, templateEn?, templateEs?, isActive }
  NOTA: variáveis disponíveis nos templates:
    {{guestName}}, {{restaurantName}}, {{date}}, {{time}},
    {{partySize}}, {{shiftName}}, {{tableArea}},
    {{confirmUrl}}, {{cancelUrl}}, {{reviewUrl}}

sendTest (managerProcedure)
  input: { restaurantId, trigger, phone }
  action: renderiza template PT-BR com dados fictícios e envia via Z-API
```

### 8.10 auto-tags.router.ts
```
list (protectedProcedure)
  input: { restaurantId }

create (managerProcedure)
  input: { restaurantId, name, color, icon?, conditions }
  conditions: [{ field, operator, value }]
  Campos válidos: visitCount, noShowCount, reliabilityScore,
                  tags (contains), source (last reservation source)

update / delete (managerProcedure)

runAll (managerProcedure)
  input: { restaurantId }
  action: para cada customer do restaurante, avalia todas as autoTags e atualiza tags
```

### 8.11 analytics.router.ts
```
getDashboard (protectedProcedure)
  input: { restaurantId }
  retorna:
    - reservasHoje: número de reservas do dia atual
    - coversHoje: soma de partySize das reservas confirmadas hoje
    - taxaOcupacao: (coversHoje / maxCapacidade) * 100
    - noShowsMes: count de NO_SHOW no mês atual
    - clientesNovos30dias: customers criados nos últimos 30 dias
    - reservasPorCanal: { MANUAL:n, WIDGET:n, WHATSAPP:n, ... }
    - reservasPorStatus: { CONFIRMED:n, PENDING:n, ... }

getOccupancy30Days (protectedProcedure)
  input: { restaurantId }
  retorna: array de { date, covers, capacity } para o gráfico de ocupação

getTopCustomers (protectedProcedure)
  input: { restaurantId, limit?: number }
  retorna: top N clientes por visitCount
```

### 8.12 widget.router.ts (apenas publicProcedure)
```
getRestaurantInfo (slug)
  retorna: name, logoUrl, coverUrl, themeConfig, operatingHours, slug

getAvailableSlots (slug, date, partySize)
  mesma lógica de shifts.getAvailableSlots

createReservation (slug, { guestName, guestPhone, guestEmail?, partySize,
                           date, shiftId, occasion?, dietaryNotes?, lgpdConsent })
  RATE LIMIT: 10 req/min por IP
  action: igual ao reservations.create com source=WIDGET
```


---

## 9. Integração BC Connect (src/lib/bcconnect.ts)

```typescript
// REGRA CRÍTICA: NUNCA enviar ao BC Connect sem lgpdConsent === true
// REGRA CRÍTICA: Falha silenciosa — nunca bloquear o fluxo principal

const BC_WEBHOOK_URL = process.env.BC_CONNECT_WEBHOOK_URL ?? ''

export type BcEventType = 'RESERVATION' | 'CHECK_IN' | 'CHECK_OUT' | 'PREFERENCE_UPDATE'

interface SendBcEventInput {
  restaurantId: string
  eventType: BcEventType
  customer: { email: string; name?: string; phone?: string; birthdate?: Date }
  metadata?: { groupSize?: number; occasionType?: string;
               preferences?: Array<{ category: string; value: string }> }
}

export async function sendBcEvent(input: SendBcEventInput): Promise<void> {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: input.restaurantId },
    select: { bcConnectPartnerId: true, bcConnectApiKey: true },
  })
  if (!restaurant?.bcConnectPartnerId || !restaurant?.bcConnectApiKey) return

  const apiKey = decrypt(restaurant.bcConnectApiKey) // src/lib/crypto.ts

  const payload = {
    eventType: input.eventType,
    occurredAt: new Date().toISOString(),
    lead: {
      email: input.customer.email,
      name: input.customer.name,
      phone: input.customer.phone,
    },
    optinAccepted: true,
    metadata: input.metadata,
  }

  try {
    const res = await fetch(
      `${BC_WEBHOOK_URL}/api/webhook/partner/${restaurant.bcConnectPartnerId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000),
      }
    )
    if (!res.ok) console.warn(`[BC Connect] ${res.status}:`, await res.text())
  } catch (err) {
    console.warn('[BC Connect] Falha silenciosa:', (err as Error).message)
  }
}
```

---

## 10. Integração Z-API WhatsApp (src/lib/zapi.ts)

```typescript
const BASE = process.env.ZAPI_BASE_URL ?? 'https://api.z-api.io'
const INSTANCE = process.env.ZAPI_INSTANCE_ID ?? ''
const TOKEN = process.env.ZAPI_TOKEN ?? ''
const CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN ?? ''

export async function sendWhatsApp(phone: string, message: string): Promise<void> {
  if (!INSTANCE || !TOKEN) {
    console.log('[Z-API] Não configurado — mensagem não enviada')
    return
  }
  const phoneClean = phone.replace(/\D/g, '').replace(/^0/, '55')
  try {
    const res = await fetch(`${BASE}/instances/${INSTANCE}/token/${TOKEN}/send-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Client-Token': CLIENT_TOKEN },
      body: JSON.stringify({ phone: phoneClean, message }),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) console.warn('[Z-API] Falha:', await res.text())
  } catch (err) {
    console.warn('[Z-API] Erro:', (err as Error).message)
  }
}
```

---

## 11. Orquestrador de Notificações (src/lib/notifications.ts)

```typescript
// Templates padrão para seed (PT-BR)
// Variáveis interpoladas: {{guestName}}, {{restaurantName}}, {{date}},
// {{time}}, {{partySize}}, {{shiftName}}, {{confirmUrl}}, {{cancelUrl}}

export const DEFAULT_TEMPLATES = {
  RESERVATION_CREATED: {
    WHATSAPP: `✅ *Reserva confirmada!*\nOlá {{guestName}}, sua reserva no *{{restaurantName}}* está confirmada.\n\n📅 {{date}} às {{time}}\n👥 {{partySize}} pessoas\n\nConfirme sua presença até 1 hora antes: {{confirmUrl}}\nPrecisa cancelar? {{cancelUrl}}\n\nAté lá! 🍽️`,
  },
  REMINDER_24H: {
    WHATSAPP: `⏰ *Lembrete de reserva*\nOlá {{guestName}}! Sua reserva no *{{restaurantName}}* é amanhã.\n\n📅 {{date}} às {{time}} • {{partySize}} pessoas\n\nConfirme: {{confirmUrl}} | Cancelar: {{cancelUrl}}`,
  },
  REMINDER_2H: {
    WHATSAPP: `🍽️ Olá {{guestName}}! Sua reserva no *{{restaurantName}}* é em 2 horas ({{time}}). Até logo! 😊`,
  },
  PAYMENT_CONFIRMED: {
    WHATSAPP: `💳 *Pagamento confirmado!*\nOlá {{guestName}}, seu sinal para *{{restaurantName}}* foi recebido.\n📅 {{date}} às {{time}} • Obrigado! 🎉`,
  },
  WAITLIST_AVAILABLE: {
    WHATSAPP: `🎉 *Mesa disponível no {{restaurantName}}!*\nOlá {{guestName}}, uma mesa ficou disponível!\n\nVocê tem *15 minutos* para confirmar: {{confirmUrl}}\nNão quer mais? {{cancelUrl}}`,
  },
  POST_VISIT: {
    WHATSAPP: `🙏 Olá {{guestName}}, obrigado pela visita ao *{{restaurantName}}*! Como foi sua experiência?\n⭐ {{reviewUrl}}`,
  },
  CANCELLED: {
    WHATSAPP: `❌ Olá {{guestName}}, sua reserva no *{{restaurantName}}* de {{date}} às {{time}} foi cancelada. Até a próxima! 👋`,
  },
}

export async function sendNotification(params: {
  restaurantId: string
  trigger: NotificationTrigger
  reservation: Reservation & { restaurant: Restaurant; customer?: Customer | null }
  locale?: 'pt-BR' | 'en' | 'es'
}): Promise<void> {
  // 1. Buscar template do banco (customizado pelo restaurante)
  // 2. Se não existir, usar DEFAULT_TEMPLATES
  // 3. Interpolar variáveis
  // 4. Enviar via Z-API (WhatsApp) e/ou Resend (Email)
}
```


---

## 12. Rotas de Cron Jobs

### /app/api/cron/expire-pending/route.ts
```typescript
// Chamada: Vercel Cron a cada 5 minutos (vercel.json)
// Protegida por: Authorization: Bearer ${CRON_SECRET}
// Ação: busca reservas PENDING_PAYMENT com expiresAt < now()
//       atualiza status para CANCELLED + registra no statusHistory
```

### /app/api/cron/reminders/route.ts
```typescript
// Chamada: Vercel Cron a cada hora
// Ação 1: busca reservas CONFIRMED com date BETWEEN (now+23h) E (now+25h)
//         envia notificação REMINDER_24H
// Ação 2: busca reservas CONFIRMED com date BETWEEN (now+1.5h) E (now+2.5h)
//         envia notificação REMINDER_2H
// Ação 3: busca reservas CHECKED_IN que mudaram para FINISHED há mais de 2h
//         envia notificação POST_VISIT
```

### vercel.json (criar na raiz do projeto)
```json
{
  "crons": [
    { "path": "/api/cron/expire-pending", "schedule": "*/5 * * * *" },
    { "path": "/api/cron/reminders",      "schedule": "0 * * * *"   }
  ]
}
```

---

## 13. Webhooks

### /app/api/webhooks/pagarme/route.ts
```typescript
// Validar assinatura HMAC SHA256
// Header: x-pagarme-signature
// Secret: process.env.PAGARME_WEBHOOK_SECRET
// Ao receber order.paid:
//   - buscar PrepaymentRecord por pagarmeOrderId
//   - status=PAID, paidAt=now()
//   - Reservation status: PENDING_PAYMENT → CONFIRMED
//   - disparar notificação PAYMENT_CONFIRMED
```

### /app/api/webhooks/zapi/route.ts
```typescript
// Recebe mensagens de resposta dos clientes via WhatsApp
// Usado principalmente para confirmações de waitlist
// Validar via header x-z-api-security-token
```

---

## 14. Rate Limiting (nas rotas públicas)

```typescript
// src/app/api/widget/[slug]/availability/route.ts
// src/server/routers/widget.ts
// Implementar via headers e Map em memória (ou Upstash Redis se disponível)
// Limite: 10 requests / minuto por IP para criação de reserva
// Limite: 60 requests / minuto por IP para consulta de disponibilidade
```

---

## 15. CI/CD — GitHub Actions (.github/workflows/deploy.yml)

```yaml
name: CI/CD TeMesa

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: latest }
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm prisma generate
      - run: pnpm run type-check
      - run: pnpm test --run

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

Adicionar ao `package.json`:
```json
{
  "scripts": {
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:ci": "vitest run"
  }
}
```

---

## 16. Supabase Realtime (src/hooks/use-realtime.ts)

```typescript
// Configurar canal por restaurante para status de mesas
// Canal: `realtime:tables:${restaurantId}`
// Evento: postgres_changes INSERT/UPDATE na tabela Table
// Filtro: restaurantId=eq.${restaurantId}
// O FloorPlanViewer e a lista de reservas assinam este canal
// Atualiza o estado local sem refresh de página

// Também configurar canal para novas reservas:
// Canal: `realtime:reservations:${restaurantId}`
// Push notification para HOSTESS quando nova reserva chega via widget
```

---

## 17. Seed do Banco (prisma/seed.ts)

O seed deve:
1. Criar templates padrão de notificação (PT-BR) para todos os 7 triggers × 2 canais
2. Criar um restaurante de demonstração com slug "demo" para testes locais
3. Criar 1 usuário admin de demonstração

---

## 18. Regras de Negócio Críticas — Resumo

```
CONFLITO DE MESA: ao criar reserva com mesa específica, verificar se existe
outra reserva com mesmo tableId + mesmo dia + turno que se sobrepõe
+ status IN [PENDING, PENDING_PAYMENT, CONFIRMED, CHECKED_IN]

RELIABILITY SCORE: Math.max(0, Math.min(100, 100 - (noShowCount * 15) + (visitCount * 2)))
Recalcular em cada mudança de noShowCount ou visitCount

TOKEN EXPIRADO: confirmTokenExpiresAt = new Date(reserva.date.getTime() - 3600000)
Verificar em confirmByToken e cancelByToken

PREPAYMENT: NUNCA verificar/aplicar prepaymentConfig sem antes confirmar
que restaurant.prepaymentConfig !== null

LGPD: NUNCA chamar sendBcEvent sem verificar reservation.lgpdConsent === true
e customer.lgpdConsent === true

MULTI-TENANT: TODA query ao banco DEVE filtrar por restaurantId
Nunca retornar dados de outro restaurante
```

---

## 19. Checklist de Entrega do Backend

- [ ] `pnpm prisma migrate dev` sem erros
- [ ] `pnpm run type-check` sem erros TypeScript
- [ ] `pnpm test --run` passa (unitários das regras de negócio)
- [ ] Todos os 12 routers implementados com schemas Zod
- [ ] Seed funcional com templates de notificação
- [ ] Rotas de cron implementadas e protegidas
- [ ] Webhooks Pagar.me e Z-API com validação HMAC
- [ ] Rate limiting nas rotas públicas do widget
- [ ] BC Connect: falha silenciosa confirmada (try/catch + timeout 5s)
- [ ] RBAC: STAFF não pode alterar status de mesa
- [ ] `.env.example` completo e documentado
- [ ] `vercel.json` com crons configurados
- [ ] GitHub Actions rodando em push para main
- [ ] Supabase Realtime configurado para mesas e reservas
