# PROMPT CURSOR — Design Visual Overhaul | TeMesa

> **Agente**: este prompt trata EXCLUSIVAMENTE de melhorias visuais.
> NÃO alterar lógica, queries, mutations, routers ou schema.
> NÃO remover funcionalidades existentes — apenas melhorar a aparência.
> **Referência visual**: Linear, Vercel Dashboard, Cal.com — clean, profissional, fácil de ler.
> **Após cada bloco**: rode `pnpm type-check`. Se falhar, corrija antes de prosseguir.

---

## DIAGNÓSTICO — Problemas visuais atuais

1. **Paleta 100% acromática** — tudo é cinza, sem cor de identidade. O dashboard não tem personalidade.
2. **Ícones minúsculos** — sidebar `w-[15px]`, cards `w-3/w-3.5` — difíceis de identificar.
3. **Fonte muito pequena** — `text-[11px]`, `text-[12px]`, `text-[13px]` dominam. Difícil escanear.
4. **Sem hierarquia visual** — títulos, labels, valores e ações têm mesmo peso visual.
5. **Sidebar sem agrupamento** — 8 itens em lista flat, sem separação entre funções primárias e secundárias.
6. **Sidebar sem indicador ativo claro** — o item ativo tem bg sutil, quase invisível.
7. **Status badges muito sutis** — pills pequenas com cores claras em fundo escuro.
8. **Cards de reserva são flat** — botões sem estrutura visual, difícil localizar informação.
9. **Header apertado** — h-14 (56px) com 5 elementos comprimidos.
10. **Configurações: 9 tabs em lista vertical** — overwhelming, sem ícones.

---

## D1 — Cor de identidade: introduzir accent color âmbar

### Arquivo: `src/app/globals.css`

Atualmente `--primary` no dark mode é `oklch(0.96 0 0)` (branco). Isso faz todos os botões e highlights serem brancos — sem personalidade.

**Alterar no bloco `.dark`:**

```css
.dark {
  /* ── Manter tudo igual EXCETO: ── */
  --primary:                oklch(0.78 0.13 75);      /* âmbar dourado */
  --primary-foreground:     oklch(0.10 0.02 75);      /* texto escuro sobre âmbar */

  /* Novo: accent secundário para destaques sutis */
  --accent:                 oklch(0.20 0.02 75);      /* fundo accent com toque quente */
  --accent-foreground:      oklch(0.90 0.05 75);      /* texto sobre accent */

  /* Ring mais quente */
  --ring:                   oklch(0.55 0.10 75);
}
```

Isso transforma todos os botões `bg-primary`, badges, links e highlights para âmbar dourado — a cor do TeMesa (consistente com o `#C8A96E` do Porto Cabral).

**Adicionar também variável de accent-glow para usos especiais:**

```css
.dark {
  /* ... */
  --glow-primary: oklch(0.78 0.13 75 / 15%);
}

@theme inline {
  /* ... adicionar: */
  --color-glow-primary: var(--glow-primary);
}
```

**NÃO alterar** as cores do light theme — o dashboard usa dark fixo.
**NÃO alterar** as cores de status (green, blue, amber, red) — essas são semânticas.

---

## D2 — Sidebar: ícones maiores, grupos visuais, indicador ativo forte

### Arquivo: `src/components/dashboard/sidebar.tsx`

**Alterar o array NAV** para incluir grupos:

```typescript
const NAV_GROUPS = [
  {
    label: null, // grupo sem header = primário
    items: [
      { href: '/dashboard',          icon: LayoutDashboard, label: 'Visão geral' },
      { href: '/dashboard/reservas', icon: CalendarDays,    label: 'Reservas'     },
      { href: '/dashboard/hostess',  icon: UserCheck,       label: 'Hostess'      },
    ],
  },
  {
    label: 'GESTÃO',
    items: [
      { href: '/dashboard/mesas',     icon: LayoutGrid,      label: 'Mesas'     },
      { href: '/dashboard/waitlist',   icon: Clock,           label: 'Waitlist'  },
      { href: '/dashboard/clientes',   icon: Users,           label: 'Clientes'  },
      { href: '/dashboard/garcons',    icon: UtensilsCrossed, label: 'Garçons'   },
    ],
  },
  {
    label: 'ANÁLISE',
    items: [
      { href: '/dashboard/relatorios', icon: BarChart3, label: 'Relatórios' },
    ],
  },
]
```

Adicionar import: `import { LayoutDashboard } from 'lucide-react'`

**Alterar a renderização dos itens** — aumentar ícones, melhorar indicador ativo:

```tsx
<nav className="flex-1 py-3 px-2.5 overflow-y-auto scrollbar-hide space-y-4">
  {NAV_GROUPS.map((group, gi) => (
    <div key={gi}>
      {/* Label do grupo */}
      {group.label && !collapsed && (
        <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-[0.15em] px-3 mb-1.5">
          {group.label}
        </p>
      )}
      {/* Separador visual sutil entre grupos (exceto o primeiro) */}
      {gi > 0 && collapsed && <div className="mx-3 my-2 h-px bg-border/50" />}

      <div className="space-y-0.5">
        {group.items.map(({ href, icon: Icon, label }) => {
          const active = href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(href)
          // ... badge de contagem (do prompt anterior)
          return (
            <Link key={href} href={href}>
              <div className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 cursor-pointer relative',
                active
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}>
                {/* Barra lateral ativa */}
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-primary" />
                )}
                <Icon className={cn(
                  'shrink-0 transition-colors',
                  collapsed ? 'w-5 h-5' : 'w-[18px] h-[18px]',
                  active ? 'text-primary' : ''
                )} />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }} transition={{ duration: 0.12 }}
                      className="text-[13px] whitespace-nowrap leading-none"
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  ))}
</nav>
```

Mudanças chave:
- Ícones: `w-[15px]` → `w-[18px]` (expandido `w-5` = 20px no colapsado)
- Item ativo: fundo `bg-primary/10` + texto `text-primary` + barra lateral âmbar de 3px
- Grupos com header em CAPS 9px tracking wide
- Padding: `px-2.5 py-2` → `px-3 py-2` (mais espaço)
- Separador entre grupos

**Logo do sidebar** — aumentar tamanho e dar identidade:

```tsx
<div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border shrink-0">
  <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shrink-0">
    <UtensilsCrossed className="w-4 h-4 text-primary-foreground" />
  </div>
  <AnimatePresence>
    {!collapsed && (
      <motion.span
        initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -6 }} transition={{ duration: 0.14 }}
        className="font-bold text-[15px] tracking-tight whitespace-nowrap text-sidebar-foreground"
      >
        TeMesa
      </motion.span>
    )}
  </AnimatePresence>
</div>
```

Mudanças: `w-7 h-7 rounded-md` → `w-8 h-8 rounded-xl`, logo `text-[13px]` → `text-[15px] font-bold`, header `h-14` → `h-16`.

---

## D3 — Header: mais espaçoso, hierarquia clara

### Arquivo: `src/components/dashboard/header.tsx`

Aumentar altura de `h-14` para `h-16`:

```tsx
<header className="h-16 flex items-center gap-4 px-5 border-b border-border bg-background/80 backdrop-blur-sm shrink-0">
```

Mudanças:
- `h-14` → `h-16`
- `gap-3` → `gap-4`
- `px-4` → `px-5`

**Nome do restaurante** — dar mais destaque:

```tsx
<span className="text-[14px] font-semibold text-foreground hidden sm:block truncate max-w-[160px]">
  {currentRestaurant?.name ?? 'Meu Restaurante'}
</span>
```

Mudanças: `text-[13px] text-muted-foreground` → `text-[14px] font-semibold text-foreground`

**Botão de data** — aumentar:

```tsx
<button
  onClick={() => onDateChange(new Date())}
  className={cn(
    'px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors min-w-[130px] text-center',
    isToday ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted'
  )}
>
```

Mudanças: `px-2.5 py-1 rounded-md text-[12px] min-w-[120px]` → `px-3 py-1.5 rounded-lg text-[13px] min-w-[130px]`

**Setas de navegação** — tornar mais visíveis:

```tsx
<Button size="icon" variant="ghost" className="h-8 w-8" onClick={...}>
  <ChevronLeft className="w-4 h-4" />
</Button>
```

Mudanças: `h-7 w-7` → `h-8 w-8`, ícone `w-3.5` → `w-4`

**UserButton e notificações** — aumentar:

```tsx
<Button size="icon" variant="ghost" className="h-8 w-8 relative">
  <Bell className="w-4 h-4" />
</Button>
<UserButton appearance={{ elements: { avatarBox: 'w-8 h-8', userButtonTrigger: 'focus:shadow-none' } }} />
```

Mudanças: `h-7 w-7` → `h-8 w-8`, ícones `w-3.5` → `w-4`, avatar `w-7` → `w-8`

---

## D4 — Cards de reserva: mais estruturados e legíveis

### Arquivo: `src/components/reservas/reservation-card.tsx`

Aumentar todo o card: avatar, fontes, ícones, espaçamento.

**Avatar**: `w-8 h-8` → `w-10 h-10`, fonte `text-[11px]` → `text-[12px]`

```tsx
<div className={cn(
  'w-10 h-10 rounded-xl flex items-center justify-center text-[12px] font-bold text-white shrink-0',
  avatarColor
)}>
  {initials}
</div>
```

Mudanças: `w-8 h-8 rounded-full text-[11px]` → `w-10 h-10 rounded-xl text-[12px]` (rounded-xl em vez de full dá aparência mais moderna)

**Nome**: `text-[13px]` → `text-[14px]`

```tsx
<span className="text-[14px] font-semibold truncate flex items-center gap-1.5 min-w-0">
```

**Detalhes (pessoas, mesa)**: `text-[11px]` → `text-[12px]`, ícones `w-3` → `w-3.5`

```tsx
<div className="flex items-center gap-3 text-[12px] text-muted-foreground mt-0.5">
  <span className="flex items-center gap-1">
    <Users className="w-3.5 h-3.5" />
    {reservation.partySize} pessoas
  </span>
  {reservation.table && (
    <span className="flex items-center gap-1">
      <MapPin className="w-3.5 h-3.5" />
      {reservation.table.name}
    </span>
  )}
</div>
```

**Horário**: `text-[12px]` → `text-[13px]`

**Padding do card**: `px-4 py-3` → `px-4 py-3.5`

**Hover**: adicionar transição mais perceptível:

```tsx
className={cn(
  'w-full flex items-center gap-3.5 px-4 py-3.5 border-b border-border/30 transition-all duration-150 text-left',
  'hover:bg-muted/30',
  selected && 'bg-primary/5 border-l-[3px] border-l-primary'
)}
```

Mudanças: `border-l-2` → `border-l-[3px]`, `bg-muted/60` → `bg-primary/5` (usa a cor accent)

---

## D5 — Status badges: maiores, com dot colorido, mais legíveis

### Arquivo: `src/components/common/status-badges.tsx`

Substituir o componente `ReservationStatusBadge`:

```tsx
const RES_DOT: Record<ReservationStatus, string> = {
  PENDING:         'bg-zinc-400',
  PENDING_PAYMENT: 'bg-amber-400',
  CONFIRMED:       'bg-blue-400',
  CHECKED_IN:      'bg-green-400',
  FINISHED:        'bg-emerald-400',
  NO_SHOW:         'bg-red-400',
  CANCELLED:       'bg-zinc-500',
}

export function ReservationStatusBadge({ status }: { status: ReservationStatus }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold',
      RES_CLASS[status]
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', RES_DOT[status])} />
      {RES_LABEL[status]}
    </span>
  )
}
```

Mudanças:
- Adicionado dot colorido antes do texto (mesmo padrão do `TableStatusBadge`)
- `px-2 py-0.5 rounded-full` → `px-2.5 py-1 rounded-lg` (maior, mais fácil de clicar/ler)
- `font-medium` → `font-semibold`
- Exportar `RES_DOT` para uso em outros componentes

---

## D6 — Detalhe da reserva: header mais impactante

### Arquivo: `src/components/reservas/reservation-detail.tsx`

O topo do painel lateral deve criar impacto visual imediato. Localizar o header (área com nome + botão fechar).

**Redesenhar o header** — substituir o bloco de header existente:

```tsx
{/* Header do detalhe */}
<div className="px-5 py-5 border-b border-border bg-gradient-to-b from-muted/30 to-transparent">
  <div className="flex items-start justify-between mb-3">
    <div className="flex items-center gap-3">
      {/* Avatar grande */}
      <div className={cn(
        'w-12 h-12 rounded-xl flex items-center justify-center text-[14px] font-bold text-white shrink-0',
        // Usar a mesma lógica de cor do card
        avatarColor
      )}>
        {initials}
      </div>
      <div>
        <h2 className="text-[16px] font-bold leading-tight">{reservation.guestName}</h2>
        <div className="flex items-center gap-2 mt-1">
          <ReservationStatusBadge status={reservation.status} />
          {reservation.customer?.tags?.includes('VIP') && (
            <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/15 text-amber-400 border border-amber-500/20 rounded font-bold">
              ⭐ VIP
            </span>
          )}
        </div>
      </div>
    </div>
    <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
      <X className="w-4 h-4 text-muted-foreground" />
    </button>
  </div>

  {/* Info rápida */}
  <div className="flex items-center gap-4 text-[13px] text-muted-foreground">
    <span className="flex items-center gap-1.5">
      <Clock className="w-4 h-4" />
      {time}
    </span>
    <span className="flex items-center gap-1.5">
      <Users className="w-4 h-4" />
      {reservation.partySize}
    </span>
    {reservation.table && (
      <span className="flex items-center gap-1.5">
        <MapPin className="w-4 h-4" />
        {reservation.table.name}
      </span>
    )}
    <a href={`tel:${reservation.guestPhone}`} className="flex items-center gap-1.5 hover:text-primary transition-colors ml-auto">
      <Phone className="w-4 h-4" />
    </a>
    {reservation.guestEmail && (
      <a href={`mailto:${reservation.guestEmail}`} className="flex items-center gap-1.5 hover:text-primary transition-colors">
        <Mail className="w-4 h-4" />
      </a>
    )}
  </div>
</div>
```

Mudanças chave:
- Avatar `w-12 h-12 rounded-xl` (grande)
- Nome `text-[16px] font-bold` (destaque)
- Info rápida com ícones `w-4 h-4` (legíveis)
- Gradiente sutil `from-muted/30` no header
- Botões de contato (telefone, email) como ícones clicáveis

Criar variáveis `initials` e `avatarColor` no topo do componente (replicar a lógica do card):
```typescript
const initials = reservation.guestName
  .split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
const colors = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500',
  'bg-rose-500', 'bg-amber-500', 'bg-teal-500', 'bg-indigo-500',
]
const avatarColor = colors[reservation.guestName.charCodeAt(0) % colors.length]
```

---

## D7 — Botões de ação no detalhe: maiores e mais claros

### Arquivo: `src/components/reservas/reservation-detail.tsx`

Localizar o bloco de action buttons no final do componente (área com `<div className="px-4 py-3 border-t">`).

Substituir por:

```tsx
<div className="px-4 py-4 border-t border-border bg-background">
  <div className="flex gap-2">
    {reservation.status === 'CONFIRMED' && (
      <Button className="flex-1 h-11 text-[13px] gap-2 font-semibold bg-green-600 hover:bg-green-700 text-white shadow-sm"
        onClick={() => handleStatus('CHECKED_IN')} disabled={updateStatus.isPending}>
        <LogIn className="w-4 h-4" />Check-in
      </Button>
    )}
    {reservation.status === 'CHECKED_IN' && (
      <Button className="flex-1 h-11 text-[13px] gap-2 font-semibold" variant="secondary"
        onClick={() => handleStatus('FINISHED')} disabled={updateStatus.isPending}>
        <CheckCircle className="w-4 h-4" />Finalizar
      </Button>
    )}
    {reservation.status === 'PENDING' && (
      <Button className="flex-1 h-11 text-[13px] gap-2 font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
        onClick={() => handleStatus('CONFIRMED')} disabled={updateStatus.isPending}>
        <CheckCircle className="w-4 h-4" />Confirmar
      </Button>
    )}
    {reservation.status === 'CONFIRMED' && (
      <Button className="h-11 text-[13px] gap-2 px-4" variant="outline"
        onClick={() => handleStatus('NO_SHOW')} disabled={updateStatus.isPending}>
        <AlertTriangle className="w-4 h-4" />No-show
      </Button>
    )}
    {['PENDING', 'CONFIRMED', 'PENDING_PAYMENT'].includes(reservation.status) && (
      <Button className="h-11 text-[13px] gap-2 px-4" variant="outline"
        onClick={() => handleStatus('CANCELLED')} disabled={updateStatus.isPending}>
        <XCircle className="w-4 h-4" />
      </Button>
    )}
  </div>
</div>
```

Mudanças: `h-8` → `h-11`, ícones `w-3.5` → `w-4`, `text-[12px]` → `text-[13px]`, `shadow-sm` nos primários, `font-semibold`.

---

## D8 — Configurações: ícones nos tabs + grid em mobile

### Arquivo: `src/app/(dashboard)/dashboard/configuracoes/page.tsx`

Adicionar ícones ao array de tabs:

```typescript
import {
  Shield, Building2, Palette, Clock, CalendarOff, Bell,
  CreditCard, Tag, UserCog, Plug,
} from 'lucide-react'

const TABS = [
  { value: 'geral',           label: 'Geral',           icon: Building2   },
  { value: 'tema',            label: 'Tema',            icon: Palette     },
  { value: 'turnos',          label: 'Turnos',          icon: Clock       },
  { value: 'disponibilidade', label: 'Disponibilidade', icon: CalendarOff },
  { value: 'notificacoes',    label: 'Notificações',    icon: Bell        },
  { value: 'pagamento',       label: 'Pagamento',       icon: CreditCard  },
  { value: 'autotags',        label: 'Auto-Tags',       icon: Tag         },
  { value: 'garcons',         label: 'Garçons',         icon: UserCog     },
  { value: 'integracao',      label: 'Integração',      icon: Plug        },
] as const
```

Renderizar tabs com ícone:

```tsx
<TabsList className="flex flex-col h-auto w-48 shrink-0 bg-muted/20 p-2 rounded-xl items-start gap-0.5">
  {TABS.map(({ value, label, icon: Icon }) => (
    <TabsTrigger
      key={value}
      value={value}
      className="w-full justify-start text-[13px] px-3 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg gap-2.5"
    >
      <Icon className="w-4 h-4 shrink-0" />
      {label}
    </TabsTrigger>
  ))}
</TabsList>
```

Mudanças: `w-44` → `w-48`, `p-1.5` → `p-2`, `py-2` → `py-2.5`, ícone `w-4 h-4` adicionado, `gap-2.5`.

---

## D9 — Dashboard home: cards de métricas com ícone colorido e borda sutil

### Arquivo: `src/app/(dashboard)/dashboard/page.tsx`

Melhorar os cards de métricas da visão "Hoje à noite":

```tsx
<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
  {[
    { label: 'Confirmadas', value: stats.confirmed, icon: CheckCircle, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    { label: 'Check-in', value: stats.checkedIn, icon: CalendarCheck, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
    { label: 'Pendentes', value: stats.pending, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    { label: 'Pessoas', value: stats.totalGuests, icon: Users, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
  ].map(m => (
    <div key={m.label} className={cn('border rounded-xl p-4', m.border)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-muted-foreground font-medium">{m.label}</span>
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', m.bg)}>
          <m.icon className={cn('w-4 h-4', m.color)} />
        </div>
      </div>
      <p className="text-3xl font-bold tracking-tight">{m.value}</p>
    </div>
  ))}
</div>
```

Mudanças:
- Ícone dentro de `w-8 h-8 rounded-lg` com background colorido (destaque visual)
- Layout: ícone no canto superior direito, valor grande embaixo
- `text-2xl` → `text-3xl`
- Borda com cor semântica em vez de `border-border` genérico
- `tracking-tight` no número grande

---

## D10 — Página de reservas: título com contagem e indicadores visuais

### Arquivo: `src/app/(dashboard)/dashboard/reservas/page.tsx`

A barra de filtros no topo pode ficar mais organizada.

**Status filter pills** — adicionar dot colorido:

```tsx
{STATUS_FILTERS.map(f => {
  const dotColors: Record<string, string> = {
    all: '',
    CONFIRMED: 'bg-blue-400',
    CHECKED_IN: 'bg-green-400',
    PENDING: 'bg-amber-400',
    NO_SHOW: 'bg-red-400',
  }
  return (
    <button
      key={f.value}
      onClick={() => setStatus(f.value)}
      className={cn(
        'px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all flex items-center gap-1.5',
        statusFilter === f.value
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
      )}
    >
      {dotColors[f.value] && (
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColors[f.value])} />
      )}
      {f.label}
    </button>
  )
})}
```

Mudanças: `rounded-full px-2.5 py-1 text-[11px] font-medium` → `rounded-lg px-3 py-1.5 text-[11px] font-semibold`, dot colorido adicionado, `shadow-sm` no ativo.

**Botão "Nova"** — mais destaque:

```tsx
<Button size="sm" className="h-9 gap-2 text-[12px] font-semibold shrink-0 shadow-sm" onClick={() => setFormOpen(true)}>
  <Plus className="w-4 h-4" />
  Nova reserva
</Button>
```

Mudanças: `h-8 gap-1.5 text-[12px]` → `h-9 gap-2 text-[12px] font-semibold shadow-sm`, label "Nova" → "Nova reserva" (mais claro), ícone `w-3.5` → `w-4`.

**Input de busca** — aumentar:

```tsx
<div className="relative flex-1">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
  <Input
    placeholder="Buscar por nome ou telefone..."
    className="pl-9 h-9 text-[13px] bg-muted/30 border-border/50"
    value={search}
    onChange={e => setSearch(e.target.value)}
  />
</div>
```

Mudanças: `pl-8 h-8 text-[13px]` → `pl-9 h-9 text-[13px]`, ícone `w-3.5 left-2.5` → `w-4 left-3`

**Section group headers** (Confirmadas, Pendentes, etc.):

```tsx
function SectionGroup({ label, count, dot, children }: {
  label: string; count: number; dot: string; children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-2.5 px-4 py-2.5 sticky top-0 bg-background/95 backdrop-blur-sm z-10 border-b border-border/30">
        <span className={cn('w-2 h-2 rounded-full', dot)} />
        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{label}</span>
        <span className="text-[11px] text-muted-foreground/60 font-medium">{count}</span>
      </div>
      {children}
    </div>
  )
}
```

Mudanças: dot `w-1.5` → `w-2`, `gap-2` → `gap-2.5`, `py-2` → `py-2.5`, `font-semibold` → `font-bold`, contagem sem parênteses.

---

## D11 — Tabs do detalhe de reserva: mais clean

### Arquivo: `src/components/reservas/reservation-detail.tsx`

Localizar o `<Tabs>` com `<TabsList>` que tem os triggers "Hóspede" / "Reserva" / "Histórico".

Melhorar visualmente:

```tsx
<TabsList className="flex w-full bg-muted/30 p-1 rounded-lg h-auto">
  <TabsTrigger value="guest" className="flex-1 text-[12px] py-2 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm font-medium">
    Hóspede
  </TabsTrigger>
  <TabsTrigger value="reservation" className="flex-1 text-[12px] py-2 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm font-medium">
    Reserva
  </TabsTrigger>
  <TabsTrigger value="history" className="flex-1 text-[12px] py-2 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm font-medium">
    Histórico
  </TabsTrigger>
</TabsList>
```

**Dentro das tabs** — aumentar fontes dos labels:

Localizar os `<dl>` com `text-[12px]` e alterar para `text-[13px]`:

```tsx
<div className="flex items-center justify-between py-2.5 border-b border-border/30">
  <span className="text-[12px] text-muted-foreground">{label}</span>
  <span className="text-[13px] font-medium">{value}</span>
</div>
```

Mudanças: `py-2` → `py-2.5`, valor `text-[12px]` → `text-[13px]`

---

## D12 — Onboarding: visual mais premium

### Arquivo: `src/app/onboarding/page.tsx`

**Step indicators** — usar a cor primary (âmbar agora):

No passo ativo, usar `bg-primary text-primary-foreground ring-4 ring-primary/20` (já está assim, mas agora primary é âmbar).

**Card do onboarding** — adicionar borda sutil com glow:

```tsx
className="bg-card border border-border/50 rounded-2xl p-8 shadow-lg shadow-primary/5"
```

Mudanças: `border-border` → `border-border/50`, adicionar `shadow-lg shadow-primary/5` (glow âmbar sutil).

---

## CHECKLIST FINAL

```
□ pnpm type-check — zero erros
□ Sidebar: ícones 18px, grupos com labels, barra ativa âmbar
□ Header: h-16, elementos maiores
□ Cards de reserva: avatar 40px, fontes +1 tamanho
□ Status badges: dot colorido, rounded-lg, font-semibold
□ Detalhe: header com avatar grande, info rápida, ícones clicáveis
□ Botões de ação: h-11, ícones 16px, cores semânticas
□ Configurações: ícones nos tabs
□ Dashboard home: cards com ícone em box colorido
□ Filtros de status: dots coloridos, rounded-lg
□ Primary color é âmbar/dourado (#C8A96E aprox) em todo o dark theme
□ NÃO houve alteração de lógica, queries ou schema
```

### O que NÃO foi alterado
- Nenhum arquivo de backend/router/lib
- Nenhum schema Prisma
- Nenhum template de notificação
- Nenhuma rota API
- Lógica de pagamento Pix
- Widget público (cores vêm do `themeConfig` do restaurante)
- Tema light (dashboard é dark-only)

---

> Prompt de design gerado em abril 2026.
> Todas as alterações são CSS/JSX — zero impacto em funcionalidade.
