# PROMPT CURSOR — Implementação de 10 Features | TeMesa
> **Agente**: leia este arquivo integralmente ANTES de qualquer alteração.
> **Regra zero**: nenhuma feature pode quebrar o que já funciona em produção.
> **WhatsApp**: o projeto usa WPPConnect (open-source), NÃO Z-API.
> O servidor WPPConnect roda em `http://localhost:21465` (dev) ou via ngrok (prod).
> O client está em `src/lib/zapi.ts` (nome legado — já adaptado para WPPConnect).
> A env var é `WPPCONNECT_URL`. NÃO crie novos clients de WhatsApp.
> **Antes de implementar cada feature**, rode `pnpm type-check` para confirmar que o projeto compila.
> **Após implementar cada feature**, rode `pnpm type-check` novamente. Se falhar, corrija antes de prosseguir.

---

## Índice de Features

| # | Feature | Complexidade | Arquivos principais |
|---|---------|-------------|-------------------|
| 1 | Confirmação 1 toque WhatsApp | Média | `zapi.ts`, `notification-templates.ts`, `api/webhooks/wppconnect/` |
| 2 | Add-on Proteção No-Show | Baixa | `schema.prisma`, `restaurant.ts` router, configurações UI |
| 3 | Link Google Reviews pós-visita | Baixa | `schema.prisma`, `notification-templates.ts`, configurações UI |
| 4 | Reserva recorrente | Média | `schema.prisma`, `reservations.ts` router, CRM UI |
| 5 | Onboarding guiado com defaults | Média | `onboarding/page.tsx` |
| 6 | PWA para hostess/garçom | Média | `manifest.json`, novo layout PWA |
| 7 | Visão "Hoje à noite" | Baixa | novo `dashboard/page.tsx` |
| 8 | Alerta no-show serial | Baixa | `reservation-form.tsx`, `reservation-card.tsx` |
| 9 | Widget reviews interno → Google | Média | nova rota pública, `notification-templates.ts` |
| 10 | Instrumentar PostHog | Baixa | `providers.tsx`, `layout.tsx` |

---

## FEATURE 1 — Confirmação de reserva com 1 toque no WhatsApp

### Contexto
Hoje o lembrete 24h/2h envia link `{{confirmUrl}}` que abre `/confirmar/[token]` no navegador.
Queremos adicionar uma **resposta rápida via WhatsApp**: o cliente responde "1" para confirmar ou "2" para cancelar, direto na conversa. O link continua funcionando como fallback.

### Alterações

#### 1.1 — `src/lib/notification-templates.ts`
Alterar APENAS os templates `REMINDER_24H` e `REMINDER_2H` do canal WHATSAPP.
Adicionar instruções de resposta rápida ao final da mensagem.

**Template `REMINDER_24H.WHATSAPP` — substituir por:**
```
⏰ *Lembrete de reserva*\nOlá {{guestName}}! Sua reserva no *{{restaurantName}}* é amanhã.\n\n📅 {{date}} às {{time}} • {{partySize}} pessoas\n\n✅ Responda *1* para CONFIRMAR\n❌ Responda *2* para CANCELAR\n\nOu acesse: {{confirmUrl}}
```

**Template `REMINDER_2H.WHATSAPP` — substituir por:**
```
🍽️ Olá {{guestName}}! Sua reserva no *{{restaurantName}}* é em 2 horas ({{time}}).\n\n✅ Responda *1* para confirmar\n❌ Responda *2* para cancelar\n\nAté logo! 😊
```

**NÃO alterar** nenhum outro template. NÃO alterar templates de EMAIL.

#### 1.2 — Nova rota: `src/app/api/webhooks/wppconnect/route.ts`
Criar esta rota para receber mensagens de resposta do cliente.
O WPPConnect envia webhooks quando recebe mensagens.

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendWhatsApp } from '@/lib/zapi'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // WPPConnect envia evento 'onMessage' com estrutura:
    // { event: 'onMessage', session: 'temesa', data: { from: '5547...@c.us', body: '1' } }
    // Adapte conforme a estrutura real do seu WPPConnect server
    const event = body.event ?? body.type
    if (event !== 'onMessage' && event !== 'message') {
      return NextResponse.json({ ok: true, skipped: true })
    }
    
    const data = body.data ?? body
    const rawPhone = (data.from ?? data.phone ?? '').replace('@c.us', '').replace('@s.whatsapp.net', '')
    const messageBody = (data.body ?? data.text ?? '').trim()
    
    if (!rawPhone || !messageBody) {
      return NextResponse.json({ ok: true, skipped: true })
    }
    
    // Normalizar telefone para E.164
    const phone = rawPhone.startsWith('+') ? rawPhone : `+${rawPhone}`
    
    // Aceitar apenas "1" (confirmar) ou "2" (cancelar)
    if (messageBody !== '1' && messageBody !== '2') {
      return NextResponse.json({ ok: true, skipped: 'not-a-reply' })
    }
    
    // Buscar reserva mais recente CONFIRMADA ou PENDING desse telefone
    const reservation = await prisma.reservation.findFirst({
      where: {
        guestPhone: phone,
        status: { in: ['CONFIRMED', 'PENDING'] },
        date: { gte: new Date() },
      },
      include: { restaurant: true },
      orderBy: { date: 'asc' },
    })
    
    if (!reservation) {
      return NextResponse.json({ ok: true, skipped: 'no-reservation' })
    }
    
    if (messageBody === '1') {
      // Confirmar
      if (reservation.status === 'PENDING') {
        await prisma.reservation.update({
          where: { id: reservation.id },
          data: { status: 'CONFIRMED' },
        })
        await prisma.reservationStatusHistory.create({
          data: {
            reservationId: reservation.id,
            fromStatus: 'PENDING',
            toStatus: 'CONFIRMED',
            changedBy: 'WHATSAPP_REPLY',
          },
        })
      }
      await sendWhatsApp(phone, `✅ Reserva confirmada! Esperamos você no ${reservation.restaurant.name}. Até lá! 🍽️`)
    } else if (messageBody === '2') {
      // Cancelar
      await prisma.reservation.update({
        where: { id: reservation.id },
        data: { status: 'CANCELLED' },
      })
      await prisma.reservationStatusHistory.create({
        data: {
          reservationId: reservation.id,
          fromStatus: reservation.status,
          toStatus: 'CANCELLED',
          changedBy: 'WHATSAPP_REPLY',
          reason: 'Cancelado pelo cliente via resposta WhatsApp',
        },
      })
      await sendWhatsApp(phone, `❌ Reserva cancelada. Esperamos vê-lo em outra oportunidade no ${reservation.restaurant.name}! 👋`)
    }
    
    return NextResponse.json({ ok: true, processed: true })
  } catch (err) {
    console.error('[Webhook WPPConnect]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

#### 1.3 — `middleware.ts`
A rota `/api/webhooks/(.*)` já está na lista `isPublicRoute`. **Nenhuma alteração necessária.**

#### 1.4 — Configurar webhook no WPPConnect
O dono do projeto precisa configurar o WPPConnect para enviar webhooks para:
- **Dev**: `http://localhost:3000/api/webhooks/wppconnect`
- **Prod**: `https://temesa.vercel.app/api/webhooks/wppconnect`

Isso é configuração externa, não código. Deixar em nota ao final.

---

## FEATURE 2 — Add-on "Proteção No-Show" vendido separadamente

### Contexto
O pagamento antecipado (Pix) já está implementado como funcionalidade do restaurante via `prepaymentConfig`.
Esta feature é sobre **posicionamento de produto**: permitir que o restaurante ative o Pix como add-on independente do plano.
Na prática, é uma tela de configuração que mostra o add-on e seu preço.

### Alterações

#### 2.1 — `prisma/schema.prisma`
Adicionar campo ao model `Restaurant`:

```prisma
model Restaurant {
  // ... campos existentes ...
  noShowProtectionAddon Boolean @default(false)  // add depois de prepaymentConfig
}
```

**SQL para Supabase** (rodar no SQL Editor):
```sql
ALTER TABLE "Restaurant" ADD COLUMN "noShowProtectionAddon" BOOLEAN NOT NULL DEFAULT false;
```

#### 2.2 — Nova página: `src/app/(dashboard)/dashboard/configuracoes/protecao-noshow/page.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Shield, Zap, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/trpc/react'
import { useDashboard } from '../../layout'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function ProtecaoNoShowPage() {
  const { restaurantId } = useDashboard()
  const utils = api.useUtils()
  
  const { data: restaurant } = api.restaurant.getById.useQuery(
    { restaurantId: restaurantId! },
    { enabled: !!restaurantId }
  )
  
  const toggleAddon = api.restaurant.toggleNoShowProtection.useMutation({
    onSuccess: () => {
      utils.restaurant.getById.invalidate()
      toast.success('Configuração salva!')
    },
    onError: (e) => toast.error(e.message),
  })
  
  const isActive = restaurant?.noShowProtectionAddon ?? false
  const prepaymentEnabled = (restaurant?.prepaymentConfig as any)?.prepayment_enabled === true
  
  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Shield className="w-5 h-5" /> Proteção No-Show
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cobre um sinal via Pix para reduzir não-comparecimentos. Add-on: R$49/mês.
        </p>
      </div>
      
      <div className={cn(
        'border rounded-xl p-6 space-y-4',
        isActive ? 'border-green-500/30 bg-green-500/5' : 'border-border'
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center',
              isActive ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground'
            )}>
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-sm">
                {isActive ? 'Add-on ativo' : 'Add-on desativado'}
              </p>
              <p className="text-xs text-muted-foreground">
                R$49/mês • Cobrança de sinal Pix em reservas
              </p>
            </div>
          </div>
          <Button
            variant={isActive ? 'destructive' : 'default'}
            size="sm"
            onClick={() => toggleAddon.mutate({ restaurantId: restaurantId!, enabled: !isActive })}
            disabled={toggleAddon.isPending}
          >
            {isActive ? 'Desativar' : 'Ativar add-on'}
          </Button>
        </div>
        
        {isActive && !prepaymentEnabled && (
          <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-300">
              O add-on está ativo, mas o pagamento antecipado ainda não está configurado.
              Vá em <strong>Configurações → Pagamento</strong> para definir valor do sinal e política de no-show.
            </p>
          </div>
        )}
      </div>
      
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Como funciona</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• Cliente faz reserva pelo widget → recebe QR Code Pix</li>
          <li>• Reserva fica como "Pendente Pagamento" até confirmação</li>
          <li>• Pagamento confirmado via webhook → status atualiza automaticamente</li>
          <li>• Em caso de no-show: cobrança ou reembolso conforme sua política</li>
        </ul>
      </div>
    </div>
  )
}
```

#### 2.3 — Adicionar rota tRPC: `src/server/routers/restaurant.ts`
Adicionar ao router existente (NÃO substituir — apenas adicionar esta mutation):

```typescript
toggleNoShowProtection: protectedProcedure
  .input(z.object({
    restaurantId: z.string(),
    enabled: z.boolean(),
  }))
  .mutation(async ({ ctx, input }) => {
    return ctx.prisma.restaurant.update({
      where: { id: input.restaurantId },
      data: { noShowProtectionAddon: input.enabled },
    })
  }),
```

#### 2.4 — Adicionar link no menu de configurações
Em `src/app/(dashboard)/dashboard/configuracoes/page.tsx`, adicionar um card/link para a nova rota `/dashboard/configuracoes/protecao-noshow`. Não substituir o conteúdo existente — apenas adicionar ao array de itens de configuração.

---

## FEATURE 3 — Link de avaliação Google pós-visita

### Contexto
O template POST_VISIT já existe. Queremos que a mensagem inclua um link direto para o Google Reviews do restaurante. O restaurante precisa informar seu Google Place ID nas configurações.

### Alterações

#### 3.1 — `prisma/schema.prisma`
Adicionar campo ao model `Restaurant`:

```prisma
model Restaurant {
  // ... campos existentes ...
  googlePlaceId String?  // add depois de noShowProtectionAddon
}
```

**SQL para Supabase:**
```sql
ALTER TABLE "Restaurant" ADD COLUMN "googlePlaceId" TEXT;
```

#### 3.2 — `src/lib/notifications.ts`
No objeto `vars` (dentro de `sendNotification`), adicionar a variável `reviewUrl` com o link do Google Reviews:

**Localizar** (linhas ~56-67, bloco `const vars`):
```typescript
reviewUrl: `${appUrl}`,
```

**Substituir por:**
```typescript
reviewUrl: reservation.restaurant.googlePlaceId
  ? `https://search.google.com/local/writereview?placeid=${reservation.restaurant.googlePlaceId}`
  : `${appUrl}`,
```

Isso faz com que `{{reviewUrl}}` nos templates aponte para o Google Reviews quando o Place ID está configurado, e para a URL do app quando não está.

#### 3.3 — `src/lib/notification-templates.ts`
Alterar APENAS o template `POST_VISIT.WHATSAPP`:

```
🙏 Olá {{guestName}}, obrigado pela visita ao *{{restaurantName}}*!\n\nComo foi sua experiência?\n⭐ Deixe sua avaliação: {{reviewUrl}}\n\nSua opinião nos ajuda muito! 💛
```

#### 3.4 — Adicionar campo na UI de configurações do restaurante
Em `src/app/(dashboard)/dashboard/configuracoes/page.tsx` (ou no formulário de settings do restaurante), adicionar campo:

```tsx
<FormField name="googlePlaceId" render={({ field }) => (
  <FormItem>
    <FormLabel className="text-[12px]">Google Place ID (para avaliações)</FormLabel>
    <FormControl>
      <Input {...field} placeholder="ChIJ..." className="h-10" />
    </FormControl>
    <p className="text-[11px] text-muted-foreground">
      Encontre em Google Maps → seu restaurante → "Compartilhar" → Place ID
    </p>
  </FormItem>
)} />
```

Adicionar também a mutation correspondente no router `restaurant.ts` para salvar o `googlePlaceId`.

---

## FEATURE 4 — Reserva recorrente ("minha mesa toda sexta")

### Contexto
Clientes fiéis querem reservar a mesma mesa toda semana sem repetir o processo. O operador configura isso pelo CRM do cliente.

### Alterações

#### 4.1 — `prisma/schema.prisma`
Novo model:

```prisma
model RecurringReservation {
  id            String   @id @default(cuid())
  restaurantId  String
  customerId    String
  tableId       String?
  shiftId       String?
  dayOfWeek     Int      // 0=Dom ... 6=Sab
  partySize     Int
  isActive      Boolean  @default(true)
  notes         String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  restaurant    Restaurant @relation(fields: [restaurantId], references: [id], onDelete: Cascade)
  customer      Customer   @relation(fields: [customerId], references: [id], onDelete: Cascade)
  
  @@index([restaurantId, isActive])
}
```

Adicionar relações nos models existentes:

```prisma
model Restaurant {
  // ... campos existentes ...
  recurringReservations RecurringReservation[]
}

model Customer {
  // ... campos existentes ...
  recurringReservations RecurringReservation[]
}
```

**SQL para Supabase:**
```sql
CREATE TABLE "RecurringReservation" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "tableId" TEXT,
  "shiftId" TEXT,
  "dayOfWeek" INTEGER NOT NULL,
  "partySize" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "RecurringReservation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RecurringReservation_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE,
  CONSTRAINT "RecurringReservation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE
);
CREATE INDEX "RecurringReservation_restaurantId_isActive_idx" ON "RecurringReservation"("restaurantId", "isActive");
```

#### 4.2 — Novo router: `src/server/routers/recurring.ts`

```typescript
import { z } from 'zod'
import { router, staffProcedure } from '@/server/trpc'

export const recurringRouter = router({
  list: staffProcedure
    .input(z.object({ restaurantId: z.string(), customerId: z.string().optional() }))
    .query(({ ctx, input }) =>
      ctx.prisma.recurringReservation.findMany({
        where: {
          restaurantId: input.restaurantId,
          ...(input.customerId ? { customerId: input.customerId } : {}),
          isActive: true,
        },
        include: { customer: true },
        orderBy: { dayOfWeek: 'asc' },
      })
    ),

  create: staffProcedure
    .input(z.object({
      restaurantId: z.string(),
      customerId: z.string(),
      tableId: z.string().optional(),
      shiftId: z.string().optional(),
      dayOfWeek: z.number().int().min(0).max(6),
      partySize: z.number().int().positive(),
      notes: z.string().optional(),
    }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.recurringReservation.create({ data: input })
    ),

  toggle: staffProcedure
    .input(z.object({ id: z.string(), restaurantId: z.string(), isActive: z.boolean() }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.recurringReservation.update({
        where: { id: input.id },
        data: { isActive: input.isActive },
      })
    ),

  delete: staffProcedure
    .input(z.object({ id: z.string(), restaurantId: z.string() }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.recurringReservation.delete({ where: { id: input.id } })
    ),
})
```

#### 4.3 — Registrar no root-router: `src/server/root-router.ts`
Adicionar import e rota:
```typescript
import { recurringRouter } from '@/server/routers/recurring'
// no objeto router:
recurring: recurringRouter,
```

#### 4.4 — Nova rota cron: `src/app/api/cron/recurring/route.ts`
Roda 1x/dia (meia-noite). Cria reservas para os próximos 7 dias com base nas recorrências ativas.

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { nanoid } from 'nanoid'
import { addDays, getDay, startOfDay } from 'date-fns'

function isCronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET ?? ''
  if (!secret) return false
  return (req.headers.get('authorization') ?? '') === `Bearer ${secret}`
}

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const recurrings = await prisma.recurringReservation.findMany({
    where: { isActive: true },
    include: { customer: true },
  })

  let created = 0
  const today = startOfDay(new Date())

  for (const rec of recurrings) {
    // Verificar nos próximos 7 dias se o dayOfWeek bate
    for (let d = 1; d <= 7; d++) {
      const targetDate = addDays(today, d)
      if (getDay(targetDate) !== rec.dayOfWeek) continue

      // Verificar se já existe reserva desse cliente nessa data
      const existing = await prisma.reservation.findFirst({
        where: {
          restaurantId: rec.restaurantId,
          customerId: rec.customerId,
          date: {
            gte: startOfDay(targetDate),
            lte: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000 - 1),
          },
          status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
        },
      })
      if (existing) continue

      await prisma.reservation.create({
        data: {
          restaurantId: rec.restaurantId,
          customerId: rec.customerId,
          tableId: rec.tableId,
          shiftId: rec.shiftId,
          guestName: rec.customer.name,
          guestPhone: rec.customer.phone,
          guestEmail: rec.customer.email,
          partySize: rec.partySize,
          date: targetDate,
          status: 'CONFIRMED',
          source: 'MANUAL',
          notes: rec.notes ? `[Recorrente] ${rec.notes}` : '[Recorrente]',
          confirmToken: nanoid(32),
          lgpdConsent: rec.customer.lgpdConsent,
          statusHistory: {
            create: { fromStatus: null, toStatus: 'CONFIRMED', changedBy: 'SYSTEM_RECURRING' },
          },
        },
      })
      created++
    }
  }

  return NextResponse.json({ ok: true, created })
}
```

#### 4.5 — UI no CRM do cliente
No componente de detalhe do cliente (em `src/components/clientes/`), adicionar seção "Reserva recorrente" com:
- Lista de recorrências ativas
- Botão "Criar reserva recorrente" → modal com: dia da semana (select), turno (select), mesa (select opcional), nº pessoas
- Toggle para ativar/desativar cada recorrência
- Botão de excluir

---

## FEATURE 5 — Onboarding guiado com defaults inteligentes

### Contexto
O onboarding atual (`src/app/onboarding/page.tsx`) tem 4 passos, mas os passos 2-4 são "Pular por agora". Queremos que o passo 1 pergunte o **tipo de estabelecimento** e pré-configure turnos e mesas automaticamente.

### Alterações

#### 5.1 — `src/app/onboarding/page.tsx`
Modificar o schema e o form do Step 0 para incluir um campo `businessType`:

Adicionar ao `schema0`:
```typescript
const schema0 = z.object({
  name:  z.string().min(2, 'Mínimo 2 caracteres'),
  phone: z.string().min(10, 'Telefone inválido'),
  slug:  z.string().min(2).regex(/^[a-z0-9-]+$/, 'Apenas letras minúsculas, números e hífens'),
  businessType: z.enum(['bar', 'casual', 'fine_dining', 'lounge', 'cafe']).default('casual'),
})
```

Adicionar campo de seleção visual (cards clicáveis) no formulário do Step 0, ANTES do botão de submit:

```tsx
<FormField control={form0.control} name="businessType" render={({ field }) => (
  <FormItem>
    <FormLabel className="text-[12px]">Tipo de estabelecimento</FormLabel>
    <div className="grid grid-cols-2 gap-2">
      {[
        { value: 'bar', label: '🍺 Bar', desc: 'Happy hour, petiscos' },
        { value: 'casual', label: '🍽️ Casual', desc: 'Almoço e jantar' },
        { value: 'fine_dining', label: '✨ Fine Dining', desc: 'Alta gastronomia' },
        { value: 'lounge', label: '🎵 Lounge/Balada', desc: 'Noite, drinks' },
      ].map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => field.onChange(opt.value)}
          className={cn(
            'p-3 border rounded-lg text-left transition-all',
            field.value === opt.value
              ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
              : 'border-border hover:border-primary/50'
          )}
        >
          <p className="text-sm font-medium">{opt.label}</p>
          <p className="text-[11px] text-muted-foreground">{opt.desc}</p>
        </button>
      ))}
    </div>
  </FormItem>
)} />
```

#### 5.2 — `src/server/routers/restaurant.ts`
Na mutation `create`, adicionar lógica para pré-criar turnos e mesas default baseados no `businessType`:

Adicionar ao input da mutation `create`:
```typescript
businessType: z.enum(['bar', 'casual', 'fine_dining', 'lounge', 'cafe']).optional(),
```

Após a criação do restaurante, adicionar (NÃO substituir o código existente de criação):

```typescript
// Defaults inteligentes por tipo de estabelecimento
const defaults: Record<string, { shifts: Array<{name:string,start:string,end:string,days:number[],cap:number,dur:number}>, tables: number }> = {
  bar: {
    shifts: [
      { name: 'Happy Hour', start: '17:00', end: '20:00', days: [1,2,3,4,5], cap: 40, dur: 90 },
      { name: 'Noite', start: '20:00', end: '01:00', days: [3,4,5,6], cap: 60, dur: 120 },
    ],
    tables: 10,
  },
  casual: {
    shifts: [
      { name: 'Almoço', start: '12:00', end: '15:00', days: [0,1,2,3,4,5,6], cap: 80, dur: 90 },
      { name: 'Jantar', start: '19:00', end: '23:00', days: [0,1,2,3,4,5,6], cap: 80, dur: 120 },
    ],
    tables: 15,
  },
  fine_dining: {
    shifts: [
      { name: 'Almoço', start: '12:00', end: '14:30', days: [2,3,4,5,6], cap: 40, dur: 120 },
      { name: 'Jantar', start: '19:30', end: '23:00', days: [2,3,4,5,6], cap: 40, dur: 150 },
    ],
    tables: 12,
  },
  lounge: {
    shifts: [
      { name: 'Noite', start: '21:00', end: '03:00', days: [4,5,6], cap: 100, dur: 120 },
    ],
    tables: 20,
  },
  cafe: {
    shifts: [
      { name: 'Manhã', start: '08:00', end: '12:00', days: [0,1,2,3,4,5,6], cap: 30, dur: 60 },
      { name: 'Tarde', start: '14:00', end: '18:00', days: [0,1,2,3,4,5,6], cap: 30, dur: 60 },
    ],
    tables: 8,
  },
}

const preset = defaults[input.businessType ?? 'casual']
if (preset) {
  // Criar turnos
  for (const s of preset.shifts) {
    await ctx.prisma.shift.create({
      data: {
        restaurantId: restaurant.id,
        name: s.name,
        startTime: s.start,
        endTime: s.end,
        daysOfWeek: s.days,
        maxCapacity: s.cap,
        turnDuration: s.dur,
      },
    })
  }
  // Criar mesas simples
  for (let i = 1; i <= preset.tables; i++) {
    await ctx.prisma.table.create({
      data: {
        restaurantId: restaurant.id,
        name: `Mesa ${i}`,
        capacity: 4,
        minCapacity: 1,
        area: 'Salão',
        posX: (i % 5) * 120 + 60,
        posY: Math.floor((i - 1) / 5) * 120 + 60,
      },
    })
  }
}
```

#### 5.3 — Alterar Step 1 do onboarding
Quando defaults foram criados, exibir um resumo em vez de "Pular":

```tsx
{step === 1 && (
  <div className="space-y-4">
    <p className="text-[13px] text-muted-foreground">
      Criamos automaticamente turnos e mesas para o seu tipo de estabelecimento.
      Você pode personalizar tudo depois em <strong>Configurações → Turnos</strong> e <strong>Mesas</strong>.
    </p>
    <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
      <p className="text-[12px] text-green-300">
        ✅ Turnos e mesas pré-configurados com base no seu tipo de restaurante
      </p>
    </div>
    <StepFooter onSkip={() => setStep(2)} onNext={() => setStep(2)} />
  </div>
)}
```

---

## FEATURE 6 — App PWA para hostess/garçom

### Contexto
O dashboard atual é desktop-first. A hostess precisa de uma view mobile otimizada.
Implementar como PWA (Progressive Web App) — não app nativo.

### Alterações

#### 6.1 — `public/manifest.json`
Criar:
```json
{
  "name": "TeMesa",
  "short_name": "TeMesa",
  "description": "Gestão de reservas para restaurantes",
  "start_url": "/dashboard/reservas",
  "display": "standalone",
  "background_color": "#09090b",
  "theme_color": "#09090b",
  "orientation": "portrait",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

#### 6.2 — `src/app/layout.tsx`
Adicionar no `<head>` do layout raiz:
```html
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#09090b" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<link rel="apple-touch-icon" href="/icon-192.png" />
```

#### 6.3 — Criar ícones PWA
Gerar `public/icon-192.png` e `public/icon-512.png` a partir do favicon existente.
Se não tiver gerador, criar ícones simples com o logo do TeMesa (🍽️ em fundo escuro).

#### 6.4 — Nova rota PWA: `src/app/(dashboard)/dashboard/hostess/page.tsx`
View mobile-first otimizada para hostess, com:
- Lista de reservas do turno atual (mais próximo)
- Swipe para check-in
- Cards grandes com nome, nº pessoas, mesa, horário, badges (VIP, alergia, aniversário)
- Botão "Check-in" grande e acessível

```typescript
'use client'

import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Users, MapPin, Clock, AlertTriangle, CheckCircle, Star, Cake } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { api } from '@/trpc/react'
import { useDashboard } from '../layout'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function HostessPage() {
  const { restaurantId } = useDashboard()
  const dateStr = format(new Date(), 'yyyy-MM-dd')
  const utils = api.useUtils()

  const { data: reservations } = api.reservations.list.useQuery({
    restaurantId: restaurantId!,
    date: dateStr,
  }, { enabled: !!restaurantId, refetchInterval: 15_000 }) // auto-refresh 15s

  const updateStatus = api.reservations.updateStatus.useMutation({
    onSuccess: () => {
      utils.reservations.list.invalidate()
      toast.success('Status atualizado!')
    },
    onError: (e) => toast.error(e.message),
  })

  // Mostrar apenas reservas ativas do turno atual
  const now = new Date()
  const activeReservations = useMemo(() =>
    (reservations ?? [])
      .filter(r => ['CONFIRMED', 'PENDING', 'CHECKED_IN'].includes(r.status))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [reservations]
  )

  if (!restaurantId) return null

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header compacto */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-bold">Hoje</p>
            <p className="text-xs text-muted-foreground">
              {format(now, "EEEE, dd 'de' MMMM", { locale: ptBR })} · {activeReservations.length} reservas
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold tabular-nums">{format(now, 'HH:mm')}</p>
          </div>
        </div>
      </div>

      {/* Lista de reservas como cards grandes */}
      <div className="p-4 space-y-3">
        {activeReservations.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhuma reserva ativa para hoje</p>
          </div>
        ) : activeReservations.map(r => {
          const isNoShowRisk = (r.customer?.noShowCount ?? 0) >= 2
          const isVIP = r.customer?.tags?.includes('VIP')
          const isBirthday = r.occasion === 'BIRTHDAY'
          const hasAllergy = !!r.dietaryNotes

          return (
            <div key={r.id} className={cn(
              'border rounded-xl p-4 space-y-3',
              r.status === 'CHECKED_IN' ? 'border-green-500/30 bg-green-500/5' :
              isNoShowRisk ? 'border-amber-500/30 bg-amber-500/5' :
              'border-border'
            )}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-base">{r.guestName}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                    <Clock className="w-3 h-3" />
                    {format(new Date(r.date), 'HH:mm')}
                    <Users className="w-3 h-3 ml-1" />
                    {r.partySize} pessoas
                    {r.table && <>
                      <MapPin className="w-3 h-3 ml-1" />
                      {r.table.name}
                    </>}
                  </p>
                </div>
                <div className="flex gap-1">
                  {isVIP && <Badge variant="outline" className="text-amber-400 border-amber-400/30 text-[10px]"><Star className="w-2.5 h-2.5 mr-0.5" />VIP</Badge>}
                  {isBirthday && <Badge variant="outline" className="text-pink-400 border-pink-400/30 text-[10px]"><Cake className="w-2.5 h-2.5 mr-0.5" />Aniversário</Badge>}
                </div>
              </div>

              {(hasAllergy || isNoShowRisk) && (
                <div className="flex gap-2 flex-wrap">
                  {hasAllergy && (
                    <span className="text-[10px] px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full">
                      ⚠️ {r.dietaryNotes}
                    </span>
                  )}
                  {isNoShowRisk && (
                    <span className="text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full">
                      <AlertTriangle className="w-2.5 h-2.5 inline mr-0.5" />
                      {r.customer?.noShowCount} no-shows
                    </span>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                {r.status === 'CONFIRMED' && (
                  <Button
                    className="flex-1 h-12 text-sm font-semibold"
                    onClick={() => updateStatus.mutate({
                      restaurantId: restaurantId!,
                      reservationId: r.id,
                      status: 'CHECKED_IN',
                    })}
                    disabled={updateStatus.isPending}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Check-in
                  </Button>
                )}
                {r.status === 'CHECKED_IN' && (
                  <Button
                    variant="outline"
                    className="flex-1 h-12 text-sm border-green-500/30 text-green-400"
                    onClick={() => updateStatus.mutate({
                      restaurantId: restaurantId!,
                      reservationId: r.id,
                      status: 'FINISHED',
                    })}
                    disabled={updateStatus.isPending}
                  >
                    Finalizar mesa
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

#### 6.5 — Adicionar link no sidebar do dashboard
No `src/components/dashboard/sidebar.tsx`, adicionar item de menu "Hostess" apontando para `/dashboard/hostess`.

---

## FEATURE 7 — Visão "Hoje à noite" — painel do turno atual

### Contexto
A página default do dashboard é `/dashboard/reservas`. Queremos criar uma página `/dashboard` (index) que mostra um resumo do turno mais próximo.

### Alterações

#### 7.1 — `src/app/(dashboard)/dashboard/page.tsx`
Atualmente este arquivo provavelmente redireciona para `/dashboard/reservas`.
Substituir pelo painel "Hoje à noite":

```typescript
'use client'

import { useMemo } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Users, Clock, AlertTriangle, TrendingUp, CalendarCheck, XCircle, CheckCircle } from 'lucide-react'
import { api } from '@/trpc/react'
import { useDashboard } from './layout'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export default function DashboardHome() {
  const { restaurantId } = useDashboard()
  const dateStr = format(new Date(), 'yyyy-MM-dd')

  const { data: reservations } = api.reservations.list.useQuery({
    restaurantId: restaurantId!,
    date: dateStr,
  }, { enabled: !!restaurantId, refetchInterval: 30_000 })

  const { data: shifts } = api.shifts.list.useQuery(
    { restaurantId: restaurantId! },
    { enabled: !!restaurantId }
  )

  const stats = useMemo(() => {
    const all = reservations ?? []
    return {
      total: all.length,
      confirmed: all.filter(r => r.status === 'CONFIRMED').length,
      checkedIn: all.filter(r => r.status === 'CHECKED_IN').length,
      pending: all.filter(r => ['PENDING', 'PENDING_PAYMENT'].includes(r.status)).length,
      noShow: all.filter(r => r.status === 'NO_SHOW').length,
      cancelled: all.filter(r => r.status === 'CANCELLED').length,
      totalGuests: all
        .filter(r => ['CONFIRMED', 'CHECKED_IN', 'PENDING'].includes(r.status))
        .reduce((sum, r) => sum + r.partySize, 0),
      noShowRisk: all.filter(r =>
        ['CONFIRMED', 'PENDING'].includes(r.status) &&
        (r.customer?.noShowCount ?? 0) >= 2
      ),
      specialOccasions: all.filter(r =>
        r.occasion && ['CONFIRMED', 'CHECKED_IN'].includes(r.status)
      ),
      allergies: all.filter(r =>
        r.dietaryNotes && ['CONFIRMED', 'CHECKED_IN'].includes(r.status)
      ),
    }
  }, [reservations])

  if (!restaurantId) return null

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">
          {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visão geral do dia · {stats.total} reservas
        </p>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Confirmadas', value: stats.confirmed, icon: CheckCircle, color: 'text-blue-400' },
          { label: 'Check-in', value: stats.checkedIn, icon: CalendarCheck, color: 'text-green-400' },
          { label: 'Pendentes', value: stats.pending, icon: Clock, color: 'text-amber-400' },
          { label: 'Pessoas esperadas', value: stats.totalGuests, icon: Users, color: 'text-foreground' },
        ].map(m => (
          <div key={m.label} className="border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <m.icon className={cn('w-4 h-4', m.color)} />
              <span className="text-[11px] text-muted-foreground">{m.label}</span>
            </div>
            <p className="text-2xl font-bold">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Alertas */}
      {(stats.noShowRisk.length > 0 || stats.specialOccasions.length > 0 || stats.allergies.length > 0) && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">⚡ Atenção hoje</h3>

          {stats.noShowRisk.map(r => (
            <div key={r.id} className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.guestName}</p>
                <p className="text-[11px] text-muted-foreground">
                  {r.customer?.noShowCount} não-comparecimento(s) anteriores · {format(new Date(r.date), 'HH:mm')}
                </p>
              </div>
              <Link href="/dashboard/reservas" className="text-[11px] text-primary hover:underline shrink-0">
                Ver →
              </Link>
            </div>
          ))}

          {stats.specialOccasions.map(r => (
            <div key={r.id} className="flex items-center gap-3 p-3 bg-pink-500/10 border border-pink-500/20 rounded-lg">
              <span className="text-base">🎂</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.guestName} — {r.occasion}</p>
                <p className="text-[11px] text-muted-foreground">{format(new Date(r.date), 'HH:mm')} · {r.partySize} pessoas</p>
              </div>
            </div>
          ))}

          {stats.allergies.map(r => (
            <div key={r.id} className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <span className="text-base">⚠️</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.guestName}</p>
                <p className="text-[11px] text-muted-foreground">
                  Restrição: {r.dietaryNotes} · {format(new Date(r.date), 'HH:mm')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Link para lista completa */}
      <div className="pt-4 border-t border-border">
        <Link
          href="/dashboard/reservas"
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          Ver todas as reservas de hoje →
        </Link>
      </div>
    </div>
  )
}
```

**IMPORTANTE**: Se `/dashboard/page.tsx` atualmente faz redirect para `/dashboard/reservas`, remover o redirect e substituir pelo componente acima.

---

## FEATURE 8 — Alerta de cliente "no-show serial"

### Contexto
Quando um operador cria uma reserva manual para um cliente que já tem 2+ no-shows, mostrar alerta visual.

### Alterações

#### 8.1 — `src/components/reservas/reservation-form.tsx`
Ao preencher o campo de telefone e sair do campo (onBlur), fazer lookup do cliente:

Adicionar dentro do componente (hook):
```typescript
const [noShowWarning, setNoShowWarning] = useState<{ name: string; count: number } | null>(null)

const checkCustomer = api.customers.findByPhone.useQuery(
  { restaurantId, phone: watchedPhone },
  { enabled: !!watchedPhone && watchedPhone.length >= 13, retry: false }
)

useEffect(() => {
  if (checkCustomer.data && checkCustomer.data.noShowCount >= 2) {
    setNoShowWarning({ name: checkCustomer.data.name, count: checkCustomer.data.noShowCount })
  } else {
    setNoShowWarning(null)
  }
}, [checkCustomer.data])
```

Renderizar alerta visual acima do botão de submit:
```tsx
{noShowWarning && (
  <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
    <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
    <div>
      <p className="text-sm font-medium text-amber-300">Cliente com histórico de no-show</p>
      <p className="text-[11px] text-muted-foreground">
        {noShowWarning.name} já não compareceu {noShowWarning.count} vez(es).
        Considere exigir confirmação prévia ou sinal Pix.
      </p>
    </div>
  </div>
)}
```

#### 8.2 — `src/server/routers/customers.ts`
Adicionar query (se não existir) para buscar cliente por telefone:

```typescript
findByPhone: staffProcedure
  .input(z.object({ restaurantId: z.string(), phone: z.string() }))
  .query(async ({ ctx, input }) => {
    return ctx.prisma.customer.findUnique({
      where: { restaurantId_phone: { restaurantId: input.restaurantId, phone: input.phone } },
      select: { id: true, name: true, noShowCount: true, visitCount: true, reliabilityScore: true, tags: true },
    })
  }),
```

#### 8.3 — `src/components/reservas/reservation-card.tsx`
Adicionar badge visual no card de reserva para clientes com noShowCount >= 2:

Após renderizar o nome do hóspede, adicionar:
```tsx
{reservation.customer?.noShowCount >= 2 && (
  <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/15 text-amber-400 border border-amber-500/20 rounded-full ml-1">
    ⚠️ {reservation.customer.noShowCount} no-shows
  </span>
)}
```

---

## FEATURE 9 — Widget de reviews interno → Google Reviews

### Contexto
Após o status mudar para FINISHED, o cron envia mensagem POST_VISIT.
Queremos um fluxo de 2 etapas: primeiro feedback interno, depois (se positivo) redirecionar para Google Reviews.

### Alterações

#### 9.1 — Nova rota pública: `src/app/(public)/avaliar/[token]/page.tsx`

```typescript
'use client'

import { useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { api } from '@/trpc/react'

const EMOJIS = [
  { value: 1, emoji: '😞', label: 'Ruim' },
  { value: 2, emoji: '😐', label: 'Regular' },
  { value: 3, emoji: '🙂', label: 'Bom' },
  { value: 4, emoji: '😀', label: 'Ótimo' },
  { value: 5, emoji: '🤩', label: 'Incrível' },
]

export default function AvaliarPage() {
  const { token } = useParams<{ token: string }>()
  const [rating, setRating] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const { data: reservation } = api.widget.getReservationByToken.useQuery(
    { token },
    { enabled: !!token, retry: false }
  )

  const submitReview = api.widget.submitReview.useMutation({
    onSuccess: (data) => {
      setSubmitted(true)
      // Se avaliação >= 4 e tem Google Place ID, redirecionar para Google
      if (rating && rating >= 4 && data.googleReviewUrl) {
        setTimeout(() => {
          window.location.href = data.googleReviewUrl!
        }, 2000)
      }
    },
  })

  if (!reservation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
        <p className="text-sm text-zinc-400">Carregando...</p>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white p-6">
        <div className="text-center space-y-3 max-w-sm">
          <p className="text-4xl">🙏</p>
          <h2 className="text-xl font-bold">Obrigado pela avaliação!</h2>
          {rating && rating >= 4 && reservation.restaurant?.googlePlaceId && (
            <p className="text-sm text-zinc-400">
              Redirecionando para o Google Reviews...
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <p className="text-sm text-zinc-400">Como foi sua experiência no</p>
          <h1 className="text-xl font-bold mt-1">{reservation.restaurant?.name}</h1>
        </div>

        {/* Emoji rating */}
        <div className="flex justify-center gap-3">
          {EMOJIS.map(e => (
            <button
              key={e.value}
              onClick={() => setRating(e.value)}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
                rating === e.value
                  ? 'bg-white/10 ring-2 ring-white/30 scale-110'
                  : 'hover:bg-white/5'
              }`}
            >
              <span className="text-3xl">{e.emoji}</span>
              <span className="text-[10px] text-zinc-400">{e.label}</span>
            </button>
          ))}
        </div>

        {/* Comment (optional) */}
        {rating && (
          <div className="space-y-2">
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Quer deixar um comentário? (opcional)"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm text-white placeholder:text-zinc-500 resize-none h-20"
            />
            <button
              onClick={() => submitReview.mutate({ token, rating: rating!, comment: comment || undefined })}
              disabled={submitReview.isPending}
              className="w-full py-3 bg-white text-black font-semibold rounded-lg text-sm hover:bg-zinc-200 transition-colors disabled:opacity-50"
            >
              {submitReview.isPending ? 'Enviando...' : 'Enviar avaliação'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```

#### 9.2 — Adicionar ao widget router: `src/server/routers/widget.ts`
Adicionar estas duas procedures:

```typescript
getReservationByToken: publicProcedure
  .input(z.object({ token: z.string() }))
  .query(async ({ ctx, input }) => {
    const reservation = await ctx.prisma.reservation.findFirst({
      where: { confirmToken: input.token },
      include: { restaurant: { select: { name: true, googlePlaceId: true } } },
    })
    return reservation
  }),

submitReview: publicProcedure
  .input(z.object({
    token: z.string(),
    rating: z.number().int().min(1).max(5),
    comment: z.string().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    const reservation = await ctx.prisma.reservation.findFirst({
      where: { confirmToken: input.token },
      include: { restaurant: { select: { googlePlaceId: true } } },
    })
    if (!reservation) throw new TRPCError({ code: 'NOT_FOUND' })

    // Salvar review nos notes do customer (simples, sem nova tabela)
    if (reservation.customerId) {
      const existing = (await ctx.prisma.customer.findUnique({
        where: { id: reservation.customerId },
        select: { preferences: true },
      }))?.preferences as Record<string, unknown> | null ?? {}

      await ctx.prisma.customer.update({
        where: { id: reservation.customerId },
        data: {
          preferences: {
            ...existing,
            lastReview: { rating: input.rating, comment: input.comment, date: new Date().toISOString() },
          },
        },
      })
    }

    const googleReviewUrl = reservation.restaurant?.googlePlaceId
      ? `https://search.google.com/local/writereview?placeid=${reservation.restaurant.googlePlaceId}`
      : null

    return { ok: true, googleReviewUrl }
  }),
```

#### 9.3 — Atualizar `{{reviewUrl}}` em `src/lib/notifications.ts`
Alterar o reviewUrl no objeto `vars` para apontar para a nova página de avaliação:

**Localizar:**
```typescript
reviewUrl: reservation.restaurant.googlePlaceId
  ? `https://search.google.com/local/writereview?placeid=${reservation.restaurant.googlePlaceId}`
  : `${appUrl}`,
```

**Substituir por:**
```typescript
reviewUrl: reservation.confirmToken
  ? `${appUrl}/avaliar/${reservation.confirmToken}`
  : `${appUrl}`,
```

Isso faz o fluxo: WhatsApp → página de avaliação interna → (se positivo) → Google Reviews.

#### 9.4 — `middleware.ts`
Adicionar `/avaliar/(.*)` à lista `isPublicRoute`:
```typescript
'/avaliar/(.*)',
```

---

## FEATURE 10 — Instrumentar PostHog (analytics de uso)

### Contexto
Adicionar PostHog para rastrear uso do dashboard e conversão do widget.

### Alterações

#### 10.1 — Instalar dependência
```bash
pnpm add posthog-js
```

#### 10.2 — Criar provider: `src/lib/posthog.ts`

```typescript
import posthog from 'posthog-js'

export function initPostHog() {
  if (typeof window === 'undefined') return
  if (posthog.__loaded) return

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) {
    console.log('[PostHog] NEXT_PUBLIC_POSTHOG_KEY não configurado — analytics desabilitado')
    return
  }

  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
    loaded: (ph) => {
      if (process.env.NODE_ENV === 'development') ph.debug()
    },
  })
}

export { posthog }
```

#### 10.3 — `src/app/providers.tsx`
Adicionar chamada de inicialização do PostHog.
**NÃO remover** nenhum provider existente. Apenas adicionar:

```typescript
import { initPostHog } from '@/lib/posthog'
import { useEffect } from 'react'

// Dentro do componente Providers, adicionar:
useEffect(() => { initPostHog() }, [])
```

#### 10.4 — `.env` (desenvolvimento)
Adicionar (valores a serem preenchidos após criar conta no PostHog):
```env
# ── PostHog (analytics) ──────────────────────────────────────────────────────
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

#### 10.5 — Eventos customizados (opcionais, adicionar conforme necessidade)
No widget de reservas (`src/components/widget/booking-widget.tsx`), adicionar:
```typescript
import { posthog } from '@/lib/posthog'
// Nos pontos-chave:
posthog.capture('widget_step_completed', { step: currentStep, slug })
posthog.capture('reservation_created', { source: 'widget', slug })
```

No dashboard, no componente de login/carregamento:
```typescript
posthog.identify(userId, { email, restaurantId })
```

---

## NOTAS FINAIS PARA O AGENTE

### Ordem de implementação recomendada
1. Feature 10 (PostHog) — mais simples, não toca em nada existente
2. Feature 8 (Alerta no-show) — poucas alterações, alto valor
3. Feature 7 (Visão "Hoje à noite") — novo arquivo, não modifica existente
4. Feature 3 (Google Reviews link) — alteração mínima
5. Feature 1 (Confirmação WhatsApp) — nova rota, template changes
6. Feature 2 (Add-on no-show) — nova página + schema change
7. Feature 5 (Onboarding defaults) — modifica onboarding existente
8. Feature 9 (Widget reviews) — nova rota pública + widget router
9. Feature 6 (PWA hostess) — novo layout + manifest
10. Feature 4 (Reserva recorrente) — mais complexa, nova tabela + cron

### Checklist pós-implementação por feature
```
□ pnpm type-check passa sem erros
□ pnpm build --webpack completa (ou pnpm build se não usar webpack flag)
□ Feature testada localmente em http://localhost:3000
□ Nenhum import circular adicionado
□ Nenhum console.log esquecido (usar console.warn/error para logs de produção)
□ Se alterou schema.prisma: rodou prisma generate
□ Se adicionou SQL: documentou aqui neste arquivo
```

### Configurações externas necessárias (para o dono do projeto executar)
1. **PostHog**: criar conta gratuita em posthog.com, pegar API key
2. **WPPConnect webhook**: configurar no servidor WPPConnect para enviar eventos para `/api/webhooks/wppconnect`
3. **Cron para recorrentes**: configurar no cron-job.org um novo job diário para `/api/cron/recurring`
4. **SQL no Supabase**: rodar os ALTERs e CREATEs documentados nas features 2, 3 e 4

### O que NÃO alterar
- `src/lib/zapi.ts` — funciona com WPPConnect, NÃO renomear nem refatorar
- `src/lib/prisma.ts` — singleton do Prisma, não mexer
- `middleware.ts` — apenas adicionar rotas à lista isPublicRoute, nunca remover
- `next.config.js` — headers de segurança e turbopack config, não alterar
- `src/app/globals.css` — tema Tailwind v4, não simplificar
- Templates de e-mail — manter inalterados (só alterar WhatsApp onde indicado)
- Fluxo de pagamento Pix — não tocar, está opcional e configurável como deve ser

---

> **Documento gerado em abril 2026 pela auditoria estratégica do TeMesa.**
> Sempre que tiver dúvida sobre o escopo de uma alteração, pergunte antes de implementar.
