# PROMPT CURSOR — UX/UI Melhorias | TeMesa
> **Agente**: leia INTEGRALMENTE antes de qualquer alteração.
> **Regra zero**: nenhuma melhoria pode quebrar funcionalidade existente.
> **Após cada bloco de alterações**: rode `pnpm type-check`. Se falhar, corrija antes de prosseguir.
> **Ordem de implementação**: siga a numeração. Cada bloco é independente, mas a ordem minimiza conflitos.

---

## BLOCO 1 — Widget: eliminar step "Welcome" (U1)

### Arquivo: `src/components/widget/booking-widget.tsx`

**O que fazer:**

1. Remover `'welcome'` do array `STEPS_ORDERED`:
```typescript
const STEPS_ORDERED: Step[] = [
  'occasion', 'schedule',
  'identity', 'profile', 'preferences', 'referral',
]
```

2. No `useState` de `step`, inicializar com `'occasion'` em vez de `'welcome'`:
```typescript
const [step, setStep] = useState<Step>('occasion')
```

3. Remover inteiramente o bloco JSX `{step === 'welcome' && (...)}` — todo o `<motion.div key="welcome">` e seu conteúdo.

4. **Mover** o branding (logo + nome do restaurante) para um **header fixo** renderizado ACIMA do `<AnimatePresence>`, visível em TODOS os steps (exceto `success` e `pix`):

```tsx
{/* Header fixo com branding — visível em todos os steps */}
{step !== 'success' && step !== 'pix' && (
  <div className="flex items-center gap-3 mb-4">
    {restaurant.logoUrl ? (
      <img src={restaurant.logoUrl} alt="" className="w-8 h-8 rounded-lg object-cover" />
    ) : (
      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
        style={{ backgroundColor: primary, color: '#fff' }}>
        {restaurant.name.charAt(0)}
      </div>
    )}
    <div>
      <p className="text-sm font-bold text-white">{restaurant.name}</p>
      <p className="text-[10px] text-zinc-500">{t.onlineReservations}</p>
    </div>
  </div>
)}
```

Inserir este JSX logo antes do `<AnimatePresence>` existente.

**NÃO alterar** nenhuma lógica de formulário, apenas fluxo de steps.

---

## BLOCO 2 — Widget: progress bar contínua (U11)

### Arquivo: `src/components/widget/booking-widget.tsx`

Adicionar barra de progresso fina no topo de cada step card. Inserir logo ABAIXO do header fixo (Bloco 1) e ACIMA do `<AnimatePresence>`:

```tsx
{/* Progress bar */}
{step !== 'success' && step !== 'pix' && (
  <div className="w-full h-[2px] bg-zinc-800 rounded-full mb-4 overflow-hidden">
    <div
      className="h-full rounded-full transition-all duration-500 ease-out"
      style={{
        backgroundColor: primary,
        width: `${((STEPS_ORDERED.indexOf(step) + 1) / STEPS_ORDERED.length) * 100}%`,
      }}
    />
  </div>
)}
```

**NÃO remover** nenhum indicador de step existente — este é aditivo.

---

## BLOCO 3 — Widget: auto-advance em seleção única (U5)

### Arquivo: `src/components/widget/booking-widget.tsx`

Nos steps de **seleção única** (`occasion`, e dentro de `profile` os sub-selects `originType` e `visitFrequency`, e `referral`), fazer auto-advance 350ms após seleção.

**Step `occasion`** — localizar cada `SelectCard` na lista de ocasiões. Alterar o `onClick`:

Onde está:
```typescript
onClick={() => set('occasionType', o.value)}
```
Substituir por:
```typescript
onClick={() => {
  set('occasionType', o.value)
  setTimeout(() => setStep('schedule'), 350)
}}
```

**Step `referral`** — mesmo padrão nos `SelectCard` de referral source:
```typescript
onClick={() => {
  set('referralSource', o.value)
  // NÃO avançar automaticamente aqui — o referral é o último step,
  // o próximo passo é LGPD + botão confirmar que está no mesmo step
}}
```

**Step `profile`** — os selects de `originType` e `visitFrequency`:
- Para `originType`: após seleção, fazer scroll smooth até a seção `visitFrequency` (não mudar de step, pois estão no mesmo step)
- Para `visitFrequency`: após seleção, auto-advance para o step seguinte:
```typescript
onClick={() => {
  set('visitFrequency', o.value)
  setTimeout(() => setStep('preferences'), 350)
}}
```

**NÃO aplicar** auto-advance em seleções múltiplas (consumptionPreferences, dietaryRestrictions).

---

## BLOCO 4 — Widget: máscara de telefone (U4)

### Arquivo: `src/components/widget/booking-widget.tsx`

No step `identity`, localizar o input de telefone (campo `phone`).

**Criar helper no topo do arquivo** (fora do componente, junto das funções utilitárias):

```typescript
function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length === 0) return ''
  if (digits.length <= 2) return `(${digits}`
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

function phoneToE164(masked: string): string {
  const digits = masked.replace(/\D/g, '')
  if (digits.length < 10) return ''
  return `+55${digits}`
}
```

**Alterar o campo de telefone** — localizar o input de phone no step `identity`.
O `onChange` deve aplicar máscara:

```typescript
onChange={(e) => set('phone', maskPhone(e.target.value))}
```

O `placeholder` deve ser: `(47) 99999-0000`

**No `handleSubmit`** — antes de chamar a mutation `create`, converter o telefone:

```typescript
const e164Phone = phoneToE164(form.phone)
if (!e164Phone) {
  toast.error(t.enterPhone)
  return
}
// usar e164Phone no lugar de form.phone no payload da mutation
```

Localizar onde o payload da mutation é montado (provavelmente `create.mutate({...})`) e substituir `guestPhone: form.phone` por `guestPhone: e164Phone`.

---

## BLOCO 5 — Widget: data grid com indicador de dia fechado (U3)

### Arquivo: `src/components/widget/booking-widget.tsx`

No step `schedule`, a grade de 14 dias renderiza botões para cada dia.

**Buscar os shifts ativos** — o componente provavelmente já tem uma query de shifts ou slots.
Localizar a query que busca turnos/disponibilidade. Se não tiver, adicionar:

```typescript
const { data: shifts } = api.widget.getShifts.useQuery(
  { restaurantId: restaurant.id },
  { enabled: !!restaurant.id }
)
```

(Se essa query já existir com outro nome, usar a existente.)

**Criar helper** para verificar se um dia tem turno ativo:

```typescript
function isDayOpen(dateStr: string, shifts: Array<{ daysOfWeek: number[]; isActive: boolean }> | undefined): boolean {
  if (!shifts) return true // assume aberto se não carregou ainda
  const dayOfWeek = new Date(dateStr + 'T12:00:00').getDay()
  return shifts.some(s => s.isActive && s.daysOfWeek.includes(dayOfWeek))
}
```

**Alterar renderização** de cada dia na grade:

- Se `isDayOpen(dateStr, shifts)` retorna `false`:
  - Adicionar `opacity-30 pointer-events-none` no botão
  - Mostrar texto "Fechado" ou label `t.closed` em tamanho `text-[8px]` abaixo da data
- Se retorna `true`:
  - Adicionar dot verde (`🟢`) de 4px abaixo do número do dia

```tsx
<div className="relative">
  <button
    disabled={!isDayOpen(dayStr, shifts)}
    className={cn(
      // classes existentes
      !isDayOpen(dayStr, shifts) && 'opacity-30 cursor-not-allowed'
    )}
    // onClick existente
  >
    {/* conteúdo existente */}
  </button>
  {isDayOpen(dayStr, shifts) ? (
    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-green-500" />
  ) : (
    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[7px] text-zinc-600 whitespace-nowrap">
      {t.closed}
    </span>
  )}
</div>
```

---

## BLOCO 6 — Widget: confetti no sucesso (U18) + share CTA (U12)

### Arquivo: `src/components/widget/booking-widget.tsx`

**Confetti** — no step `success`, dentro do `useEffect` ou na transição para success, adicionar:

```typescript
import confetti from 'canvas-confetti'
```

Dentro do bloco que transiciona para `success` (provavelmente no `onSuccess` da mutation), adicionar:

```typescript
confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 }, colors: [primary, '#ffffff', '#fbbf24'] })
```

Se `canvas-confetti` já está sendo importado em outro lugar do arquivo, reutilizar. Se não, adicionar o import. O pacote já está instalado no `package.json`.

**Share CTA** — no step `success`, após o resumo da reserva e antes do "Fazer outra reserva":

```tsx
{/* Share */}
<button
  onClick={() => {
    const shareData = {
      title: `Reservei no ${restaurant.name}!`,
      text: `Reserve também no ${restaurant.name}:`,
      url: window.location.href,
    }
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share(shareData).catch(() => {})
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href)
      toast.success('Link copiado!')
    }
  }}
  className="flex items-center justify-center gap-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors py-2"
>
  <Share2 className="w-3.5 h-3.5" />
  Compartilhar com amigos
</button>
```

`Share2` já está importado dos lucide-react.

---

## BLOCO 7 — Widget: haptic feedback (U16)

### Arquivo: `src/components/widget/booking-widget.tsx`

No componente `SelectCard` (definido inline no arquivo), adicionar vibração no `onClick`:

Localizar:
```typescript
function SelectCard({ icon, label, selected, onClick, primary }: { ... }) {
  return (
    <button
      type="button"
      onClick={onClick}
```

Substituir `onClick={onClick}` por:
```typescript
onClick={() => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(10)
  }
  onClick()
}}
```

---

## BLOCO 8 — Dashboard: ações contextuais no topo do painel de detalhe (U9)

### Arquivo: `src/components/reservas/reservation-detail.tsx`

Localizar o componente principal (provavelmente `ReservationDetail`).
Logo após o header (nome do cliente + botão fechar), e ANTES das tabs/conteúdo, inserir barra de ações contextuais:

```tsx
{/* ── Barra de ações contextuais ──────────────────────────────────── */}
{(() => {
  const actions: Array<{
    label: string
    status: ReservationStatus
    variant: 'default' | 'destructive' | 'outline'
    icon: React.ReactNode
    className?: string
  }> = []

  if (reservation.status === 'PENDING') {
    actions.push(
      { label: 'Confirmar', status: 'CONFIRMED', variant: 'default', icon: <CheckCircle className="w-4 h-4" />, className: 'bg-blue-600 hover:bg-blue-700 text-white' },
      { label: 'Cancelar', status: 'CANCELLED', variant: 'destructive', icon: <XCircle className="w-4 h-4" /> },
    )
  } else if (reservation.status === 'CONFIRMED') {
    actions.push(
      { label: 'Check-in', status: 'CHECKED_IN', variant: 'default', icon: <LogIn className="w-4 h-4" />, className: 'bg-green-600 hover:bg-green-700 text-white' },
      { label: 'Cancelar', status: 'CANCELLED', variant: 'destructive', icon: <XCircle className="w-4 h-4" /> },
      { label: 'No-show', status: 'NO_SHOW', variant: 'outline', icon: <AlertTriangle className="w-4 h-4" />, className: 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10' },
    )
  } else if (reservation.status === 'CHECKED_IN') {
    actions.push(
      { label: 'Finalizar', status: 'FINISHED', variant: 'default', icon: <Flag className="w-4 h-4" />, className: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
    )
  }

  if (actions.length === 0) return null

  return (
    <div className="flex gap-2 px-5 py-3 border-b border-border">
      {actions.map(a => (
        <Button
          key={a.status}
          variant={a.variant}
          size="sm"
          className={cn('flex-1 h-10 gap-1.5 text-xs font-semibold', a.className)}
          onClick={() => {
            if (a.status === 'CANCELLED' || a.status === 'NO_SHOW') {
              if (!confirm(`Tem certeza que deseja marcar como ${a.label}?`)) return
            }
            updateStatus.mutate({
              restaurantId,
              reservationId: reservation.id,
              status: a.status,
            })
          }}
          disabled={updateStatus.isPending}
        >
          {a.icon}
          {a.label}
        </Button>
      ))}
    </div>
  )
})()}
```

O componente provavelmente já tem `updateStatus` como mutation do tRPC. Se não, verificar como as transições de status são feitas atualmente e usar o mesmo padrão.

Importar `ReservationStatus` do Prisma se necessário:
```typescript
import type { Reservation, Customer, Table, Shift, Server, ReservationStatus } from '@prisma/client'
```

**NÃO remover** as ações existentes dentro das tabs (elas servem como fallback). Apenas adicionar esta barra no topo como atalho.

---

## BLOCO 9 — Dashboard: horário relativo nos cards (U13)

### Arquivo: `src/components/reservas/reservation-card.tsx`

Adicionar imports:
```typescript
import { useState, useEffect } from 'react'
import { differenceInMinutes } from 'date-fns'
```

Dentro do componente `ReservationCard`, adicionar hook de tempo relativo:

```typescript
const [relativeLabel, setRelativeLabel] = useState('')

useEffect(() => {
  function update() {
    const now = new Date()
    const resTime = new Date(reservation.date)
    const diff = differenceInMinutes(resTime, now)

    if (reservation.status === 'FINISHED' || reservation.status === 'CANCELLED' || reservation.status === 'NO_SHOW') {
      setRelativeLabel('')
    } else if (diff < -5) {
      setRelativeLabel(`⏰ ${Math.abs(diff)} min atrás`)
    } else if (diff <= 0) {
      setRelativeLabel('🔴 agora')
    } else if (diff <= 30) {
      setRelativeLabel(`🔴 em ${diff} min`)
    } else if (diff <= 60) {
      setRelativeLabel(`🟡 em ${diff} min`)
    } else {
      setRelativeLabel('')
    }
  }
  update()
  const interval = setInterval(update, 60_000)
  return () => clearInterval(interval)
}, [reservation.date, reservation.status])
```

Renderizar o label ao lado do horário. Localizar onde o `time` é exibido (atualmente: `<span className="text-[12px] font-semibold text-muted-foreground shrink-0">{time}</span>`).

Substituir por:
```tsx
<div className="flex items-center gap-1.5 shrink-0">
  {relativeLabel && (
    <span className={cn(
      'text-[9px] font-medium px-1.5 py-0.5 rounded-full',
      relativeLabel.includes('🔴') ? 'bg-red-500/15 text-red-400' :
      relativeLabel.includes('🟡') ? 'bg-amber-500/15 text-amber-400' :
      relativeLabel.includes('⏰') ? 'bg-red-500/15 text-red-400 animate-pulse' :
      'text-muted-foreground'
    )}>
      {relativeLabel}
    </span>
  )}
  <span className="text-[12px] font-semibold text-muted-foreground">{time}</span>
</div>
```

---

## BLOCO 10 — Dashboard header: botão "Hoje" destacado (U7)

### Arquivo: `src/components/dashboard/header.tsx`

Localizar o bloco de navegação de datas. Quando a data selecionada NÃO é hoje, adicionar botão-pílula "Hoje" antes do navegador `< data >`.

Localizar:
```tsx
{/* Date navigator */}
<div className="flex items-center gap-1">
```

Substituir por:
```tsx
{/* Date navigator */}
<div className="flex items-center gap-1">
  {!isToday && (
    <button
      onClick={() => onDateChange(new Date())}
      className="px-2 py-1 text-[10px] font-bold rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-all animate-pulse mr-1"
    >
      Hoje
    </button>
  )}
```

O fechamento do `<div>` e o resto do JSX permanecem inalterados.

---

## BLOCO 11 — Sidebar: badge de contagem pendentes (U14)

### Arquivo: `src/components/dashboard/sidebar.tsx`

Adicionar uma query de contagem. No componente `Sidebar`, adicionar:

```typescript
import { api } from '@/trpc/react'
import { format } from 'date-fns'
import { useDashboard } from '@/app/(dashboard)/dashboard/layout'
```

Dentro do componente `Sidebar`:

```typescript
// Buscar contagem de reservas ativas para hoje
const { restaurantId } = useDashboard()
const dateStr = format(new Date(), 'yyyy-MM-dd')
const { data: todayReservations } = api.reservations.list.useQuery(
  { restaurantId: restaurantId!, date: dateStr },
  { enabled: !!restaurantId, refetchInterval: 30_000, retry: false }
)
const pendingCount = (todayReservations ?? []).filter(
  r => ['PENDING', 'PENDING_PAYMENT', 'CONFIRMED'].includes(r.status)
).length
```

No array `NAV`, localizar o item `Reservas`. Na renderização do label, adicionar badge:

Onde renderiza o `<motion.span>` com o label, para o item "Reservas" (quando `href === '/dashboard/reservas'`):

```tsx
<motion.span
  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
  exit={{ opacity: 0 }} transition={{ duration: 0.12 }}
  className="text-[13px] whitespace-nowrap leading-none flex items-center gap-2"
>
  {label}
  {href === '/dashboard/reservas' && pendingCount > 0 && (
    <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-primary text-primary-foreground leading-none">
      {pendingCount}
    </span>
  )}
</motion.span>
```

**Ajustar:** essa lógica deve ser adicionada apenas para o item cujo `href` é `/dashboard/reservas`. A forma mais limpa é verificar dentro do `.map()`:

```tsx
{NAV.map(({ href, icon: Icon, label }) => {
  const active = pathname.startsWith(href)
  const showBadge = href === '/dashboard/reservas' && pendingCount > 0 && !collapsed
  return (
    <Link key={href} href={href}>
      <div className={cn(/* classes existentes */)}>
        <Icon className="w-[15px] h-[15px] shrink-0" />
        <AnimatePresence>
          {!collapsed && (
            <motion.span /* props existentes */ className="text-[13px] whitespace-nowrap leading-none flex items-center gap-2">
              {label}
              {showBadge && (
                <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-primary text-primary-foreground leading-none">
                  {pendingCount}
                </span>
              )}
            </motion.span>
          )}
        </AnimatePresence>
        {/* Badge para sidebar colapsado */}
        {collapsed && href === '/dashboard/reservas' && pendingCount > 0 && (
          <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-primary" />
        )}
      </div>
    </Link>
  )
})}
```

Para o badge no modo colapsado funcionar, adicionar `relative` à className do `<div>` do nav item.

---

## BLOCO 12 — Dashboard: notificação realtime de nova reserva (U10)

### Arquivo: `src/app/(dashboard)/dashboard/layout.tsx`

Adicionar import do Supabase client:
```typescript
import { getSupabaseAnonClient } from '@/lib/supabase'
import { toast } from 'sonner'
```

Dentro do componente `DashboardLayout`, adicionar `useEffect` para Supabase Realtime:

```typescript
// Realtime: nova reserva → toast
useEffect(() => {
  if (!restaurantId) return

  let channel: ReturnType<ReturnType<typeof getSupabaseAnonClient>['channel']> | null = null

  try {
    const supabase = getSupabaseAnonClient()
    channel = supabase
      .channel(`new-reservations-${restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'Reservation',
          filter: `restaurantId=eq.${restaurantId}`,
        },
        (payload: { new: { guestName?: string; partySize?: number } }) => {
          const name = payload.new?.guestName ?? 'Novo cliente'
          const size = payload.new?.partySize ?? 0
          toast.info(`🍽️ Nova reserva: ${name} — ${size} pessoa${size !== 1 ? 's' : ''}`, {
            duration: 5000,
          })
        }
      )
      .subscribe()
  } catch {
    // Supabase Realtime é opcional — não quebrar o dashboard se falhar
  }

  return () => {
    if (channel) {
      try { getSupabaseAnonClient().removeChannel(channel) } catch { /* ok */ }
    }
  }
}, [restaurantId])
```

**IMPORTANTE**: Para funcionar, o Realtime precisa estar habilitado na tabela `Reservation` no Supabase:
1. Supabase Dashboard → Database → Replication
2. Adicionar tabela `Reservation` à publicação `supabase_realtime`

Isso é configuração no painel do Supabase — não é código.

---

## BLOCO 13 — Dashboard mobile: bottom nav (U6)

### Arquivo: `src/components/dashboard/sidebar.tsx`

Não alterar o sidebar existente para desktop. Adicionar bottom nav para mobile.

No final do arquivo, exportar um novo componente:

```typescript
export function MobileBottomNav() {
  const pathname = usePathname()
  const MOBILE_NAV = [
    { href: '/dashboard',          icon: CalendarDays, label: 'Hoje' },
    { href: '/dashboard/reservas', icon: CalendarDays, label: 'Reservas' },
    { href: '/dashboard/mesas',    icon: LayoutGrid,   label: 'Mesas' },
    { href: '/dashboard/clientes', icon: Users,        label: 'Clientes' },
    { href: '/dashboard/configuracoes', icon: Settings, label: 'Config' },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border flex items-center justify-around h-14 px-1 safe-area-pb">
      {MOBILE_NAV.map(({ href, icon: Icon, label }) => {
        const active = href === '/dashboard'
          ? pathname === '/dashboard'
          : pathname.startsWith(href)
        return (
          <Link key={href} href={href} className="flex flex-col items-center gap-0.5 py-1 px-2">
            <Icon className={cn('w-5 h-5', active ? 'text-primary' : 'text-muted-foreground')} />
            <span className={cn('text-[9px]', active ? 'text-primary font-semibold' : 'text-muted-foreground')}>
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
```

### Arquivo: `src/app/(dashboard)/dashboard/layout.tsx`

Importar e renderizar:
```typescript
import { Sidebar, MobileBottomNav } from '@/components/dashboard/sidebar'
```

No JSX, ajustar o layout:

1. O `<Sidebar />` deve ter `className="hidden md:flex"` (esconder em mobile):

Localizar `<Sidebar />` e wrappá-lo:
```tsx
<div className="hidden md:flex h-full">
  <Sidebar />
</div>
```

2. Adicionar `<MobileBottomNav />` APÓS o `</main>` e ANTES do fechamento do `</div>` principal:
```tsx
<MobileBottomNav />
```

3. Adicionar padding-bottom no `<main>` para mobile (evitar conteúdo sob o bottom nav):
```tsx
<main className="flex-1 overflow-y-auto pb-14 md:pb-0">
```

---

## BLOCO 14 — Skeleton loading melhorado (U17)

### Arquivo: `src/components/common/empty-state.tsx`

Substituir o componente `SkeletonRow` existente por versão que imita o layout real do card de reserva:

```typescript
export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40 animate-pulse">
      {/* Avatar circular */}
      <div className="w-8 h-8 rounded-full bg-muted shrink-0" />
      {/* Info */}
      <div className="flex-1 space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="h-3.5 w-28 bg-muted rounded" />
          <div className="h-3 w-10 bg-muted rounded" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-16 bg-muted rounded" />
          <div className="h-2.5 w-14 bg-muted rounded" />
        </div>
      </div>
      {/* Status badge */}
      <div className="h-5 w-20 bg-muted rounded-full" />
    </div>
  )
}
```

---

## BLOCO 15 — Empty states ricos e contextuais (U15)

### Arquivo: `src/app/(dashboard)/dashboard/reservas/page.tsx`

Localizar o `<EmptyState>` existente (renderizado quando `filtered.length === 0`).

Substituir por versão contextual:

```tsx
<EmptyState
  icon={<CalendarDays className="w-6 h-6" />}
  title="Nenhuma reserva para este dia"
  description={
    statusFilter !== 'all'
      ? `Não há reservas com status "${STATUS_FILTERS.find(f => f.value === statusFilter)?.label}" em ${dateStr}.`
      : `Não há reservas agendadas para ${dateStr}. Que tal compartilhar o link do widget?`
  }
  action={
    <div className="flex flex-col items-center gap-2">
      <Button size="sm" variant="default" onClick={() => setFormOpen(true)}>
        <Plus className="w-3.5 h-3.5 mr-1.5" />
        Nova reserva
      </Button>
      <button
        onClick={() => {
          const widgetUrl = `${window.location.origin}/r/${/* slug precisa vir do context */''}`
          navigator.clipboard?.writeText(widgetUrl)
          toast.success('Link do widget copiado!')
        }}
        className="text-[11px] text-muted-foreground hover:text-foreground transition-colors underline"
      >
        Copiar link do widget
      </button>
    </div>
  }
/>
```

**Nota:** Se o `slug` do restaurante não estiver disponível no contexto da página de reservas, adicionar query:
```typescript
const { data: restaurant } = api.restaurant.getById.useQuery(
  { restaurantId: restaurantId! },
  { enabled: !!restaurantId, select: (d) => ({ slug: d.slug }) }
)
```
E usar `restaurant?.slug` no link do widget.

Para o `CalendarDays` import, ele provavelmente já está importado. Se não, adicionar.

---

## BLOCO 16 — Swipe-actions nos cards de reserva mobile (U8)

### Arquivo: `src/components/reservas/reservation-card.tsx`

Wrappear o card em componente com drag horizontal via `framer-motion` (já instalado).

Adicionar imports:
```typescript
import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion'
```

Wrappear o `<button>` existente do card em um container com swipe:

```tsx
export function ReservationCard({ reservation, selected, onClick }: ReservationCardProps) {
  const x = useMotionValue(0)
  const bgOpacity = useTransform(x, [-100, 0, 100], [1, 0, 1])
  const bgColor = useTransform(x, [-100, 0, 100], [
    'rgba(239, 68, 68, 0.15)',  // vermelho para no-show (swipe esquerda)
    'transparent',
    'rgba(34, 197, 94, 0.15)',  // verde para check-in (swipe direita)
  ])

  const canCheckIn = reservation.status === 'CONFIRMED'
  const canNoShow = reservation.status === 'CONFIRMED'

  function handleDragEnd(_: unknown, info: PanInfo) {
    const threshold = 80
    if (info.offset.x > threshold && canCheckIn) {
      // Dispatch check-in (via callback prop)
      onSwipeAction?.('CHECKED_IN')
    } else if (info.offset.x < -threshold && canNoShow) {
      onSwipeAction?.('NO_SHOW')
    }
  }

  // ... resto do componente
```

**ATENÇÃO**: Isso requer adicionar uma prop `onSwipeAction` à interface:

```typescript
interface ReservationCardProps {
  reservation: ReservationWithRelations
  selected?: boolean
  onClick: () => void
  onSwipeAction?: (status: 'CHECKED_IN' | 'NO_SHOW') => void
}
```

E na page de reservas (`reservas/page.tsx`), passar o handler:

```tsx
<ReservationCard
  key={r.id}
  reservation={r as any}
  selected={selectedId === r.id}
  onClick={() => setSelectedId(r.id)}
  onSwipeAction={(status) => {
    if (confirm(`Confirma ${status === 'CHECKED_IN' ? 'Check-in' : 'No-show'}?`)) {
      updateStatus.mutate({ restaurantId: restaurantId!, reservationId: r.id, status })
    }
  }}
/>
```

O `updateStatus` mutation provavelmente precisa ser adicionado na page:
```typescript
const updateStatus = api.reservations.updateStatus.useMutation({
  onSuccess: () => utils.reservations.list.invalidate(),
  onError: (e) => toast.error(e.message),
})
```

O card renderiza assim:

```tsx
return (
  <div className="relative overflow-hidden">
    {/* Fundo revelado pelo swipe */}
    <motion.div
      className="absolute inset-0 flex items-center justify-between px-6 pointer-events-none"
      style={{ backgroundColor: bgColor, opacity: bgOpacity }}
    >
      <span className="text-xs font-medium text-red-400">No-show ←</span>
      <span className="text-xs font-medium text-green-400">→ Check-in</span>
    </motion.div>

    {/* Card arrastável */}
    <motion.div
      drag={canCheckIn || canNoShow ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.3}
      onDragEnd={handleDragEnd}
      style={{ x }}
      className="relative bg-background"
    >
      <button
        onClick={onClick}
        className={cn(
          // classes existentes do card
        )}
      >
        {/* conteúdo existente do card */}
      </button>
    </motion.div>
  </div>
)
```

Mostrar swipe actions **apenas em telas touch** (mobile). Verificar com media query ou `'ontouchstart' in window`.

---

## BLOCO 17 — Transições de page no dashboard (U19)

### Arquivo: `src/app/(dashboard)/dashboard/layout.tsx`

Wrappear o `children` do `<main>` com fade-in suave.

Substituir:
```tsx
<main className="flex-1 overflow-y-auto pb-14 md:pb-0">
  {isLoading ? (...) : !restaurantId ? (...) : children}
</main>
```

Por:
```tsx
<main className="flex-1 overflow-y-auto pb-14 md:pb-0">
  {isLoading ? (...) : !restaurantId ? (...) : (
    <motion.div
      key={typeof window !== 'undefined' ? window.location.pathname : undefined}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
    >
      {children}
    </motion.div>
  )}
</main>
```

Adicionar imports se não existirem:
```typescript
import { motion } from 'framer-motion'
```

**NÃO usar** `AnimatePresence mode="wait"` aqui — causa flash branco entre pages.
Usar apenas fade-in sem fade-out.

---

## NOTAS FINAIS

### Checklist após implementar todos os blocos
```
□ pnpm type-check — zero erros
□ Widget: abrir /r/[slug] → inicia direto na Ocasião (sem Welcome)
□ Widget: progress bar visível e avançando
□ Widget: selecionar ocasião → avança sozinho após 350ms
□ Widget: telefone com máscara (47) 99999-0000
□ Widget: dias fechados esmaecidos na grade
□ Widget: confetti na tela de sucesso
□ Widget: botão compartilhar no sucesso
□ Dashboard: barra de ações no topo do detalhe de reserva
□ Dashboard: "🔴 em 15 min" nos cards de reserva próximos
□ Dashboard: botão "Hoje" pulsa quando não é hoje
□ Dashboard: badge no sidebar "Reservas"
□ Dashboard: toast "Nova reserva" quando chega pelo widget
□ Dashboard: bottom nav em mobile (< 768px)
□ Dashboard: skeleton dos cards imita layout real
□ Dashboard: empty state de reservas tem CTA útil
□ Dashboard: swipe funciona em mobile nos cards
□ Dashboard: fade-in suave ao trocar de página
```

### O que NÃO alterar
- `src/lib/zapi.ts` — client WPPConnect, não mexer
- `src/lib/notifications.ts` — lógica de envio, não mexer
- `src/server/routers/*` — routers tRPC, não mexer (exceto se precisar adicionar query de contagem)
- `prisma/schema.prisma` — nenhuma alteração de schema neste prompt
- `middleware.ts` — nenhuma alteração
- Templates de notificação — nenhuma alteração
- Lógica de pagamento Pix — nenhuma alteração
- `next.config.js` — nenhuma alteração

### Configurações externas necessárias (para o dono executar)
1. **Supabase Realtime** (Bloco 12): Dashboard → Database → Replication → adicionar tabela `Reservation` ao publication `supabase_realtime`
2. **Ícones PWA**: gerar `public/icon-192.png` e `public/icon-512.png` se o manifest.json já existir (feature anterior)

---

> Prompt gerado em abril 2026. Todas as alterações são de frontend/UI — nenhuma mudança de schema, API ou backend.
