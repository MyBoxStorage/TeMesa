# CURSOR TASK — Implementação do step `schedule` no BookingWidget

> Leia este documento integralmente antes de tocar em qualquer arquivo.
> Execute as mudanças na ordem indicada. Não altere nada fora do escopo descrito.

---

## Contexto do estado atual do repositório

### O que JÁ ESTÁ pronto e funcionando (não mexa):
- `src/server/routers/widget.ts` → `getRestaurantInfo` já retorna `activeDaysOfWeek: number[]` e `blockedDates: string[]`
- `src/server/routers/restaurant.ts` → já tem `getBlockedDates` (staffProcedure) e `setBlockedDates` (ownerProcedure) ao final do router
- `src/components/widget/booking-widget.tsx` → tipo `Step` já não tem `'config'` nem `'slots'`, já tem `'schedule'`; traduções já têm todas as chaves novas; `getAvailableSlots` já tem `enabled: step === 'schedule' && ...`

### O que está QUEBRADO e precisa ser corrigido:

**Problema 1 — `booking-widget.tsx`:**
O arquivo ainda contém dois blocos de render que jamais serão exibidos (dead code que causa confusão e pode causar erro de TypeScript dependendo da versão):
- `{step === 'config' && ( ... )}` — bloco com ~68 linhas que precisa ser REMOVIDO
- `{step === 'slots' && ( ... )}` — bloco com ~63 linhas que precisa ser REMOVIDO

Além disso, o step `identity` tem o botão voltar apontando para `setStep('slots')` — precisa apontar para `setStep('schedule')`.

O step `{step === 'schedule' && ...}` **não existe ainda** — precisa ser CRIADO no lugar dos dois blocos removidos.

**Problema 2 — `/r/[slug]/page.tsx`:**
Faz query direta ao Prisma sem buscar shifts nem `settings.blockedDates`, então o `restaurant` passado ao `<BookingWidget>` não tem `activeDaysOfWeek` nem `blockedDates`.

**Problema 3 — `config-disponibilidade.tsx`:**
Arquivo não existe. Precisa ser criado em `src/components/configuracoes/`.

**Problema 4 — `configuracoes/page.tsx`:**
Não tem a aba "Disponibilidade" nem importa `ConfigDisponibilidade`.

---

## ARQUIVO 1: `src/components/widget/booking-widget.tsx`

### 1A — Remover o bloco `step === 'config'` inteiro

Localize o comentário e bloco abaixo e DELETE tudo, do comentário até o `)}` de fechamento do bloco (inclusive):

```
          {/* ── CONFIG (grupo + data) ────────────────────────────────────── */}
          {step === 'config' && (
            <motion.div key="config" {...anim}>
              ...
            </motion.div>
          )}
```

O bloco começa em `{/* ── CONFIG (grupo + data)` e termina no `)}` antes do comentário `{/* ── SLOTS`.
Ele contém seções de "Pessoas" (com `GUEST_OPTIONS.map`), "Data" (com `quickDates.map`), e um botão que chama `setStep('slots')`.

### 1B — Remover o bloco `step === 'slots'` inteiro

Logo após o bloco removido acima, localize e DELETE o bloco:

```
          {/* ── SLOTS ───────────────────────────────────────────────────── */}
          {step === 'slots' && (
            <motion.div key="slots" {...anim}>
              ...
            </motion.div>
          )}
```

Vai do comentário `{/* ── SLOTS` até o `)}` antes do comentário `{/* ── IDENTITY`.

### 1C — Inserir o novo bloco `step === 'schedule'`

No lugar exato onde estavam os dois blocos removidos (entre o bloco `occasion` e o bloco `identity`), insira o seguinte bloco completo:

```tsx
          {/* ── SCHEDULE (grupo + data + horários) ─────────────────────── */}
          {step === 'schedule' && (
            <motion.div key="schedule" {...anim}>
              <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">

                {/* Header */}
                <div className="flex items-center gap-3 p-4 border-b border-zinc-800">
                  <button
                    onClick={() => setStep('occasion')}
                    className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <p className="text-sm font-semibold text-white flex-1 text-center pr-8">
                    {t.step_config}
                  </p>
                </div>

                <div className="overflow-y-auto max-h-[70vh] divide-y divide-zinc-800">

                  {/* ── Seção A: Tamanho do grupo ── */}
                  <div className="p-4">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">
                      {t.lbl_partysize}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {/* Só eu */}
                      <button
                        type="button"
                        onClick={() => set('partySize', 1)}
                        className={cn(
                          'flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 text-center transition-all hover:scale-[1.03] active:scale-[0.97]',
                          form.partySize === 1
                            ? 'text-white scale-[1.03] shadow-lg'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-500',
                        )}
                        style={form.partySize === 1 ? { backgroundColor: primary, borderColor: primary } : {}}
                      >
                        <Users className="w-5 h-5 opacity-90" />
                        <span className="text-[11px] font-semibold leading-tight">{t.ps_solo}</span>
                      </button>

                      {/* 2 pessoas */}
                      <button
                        type="button"
                        onClick={() => set('partySize', 2)}
                        className={cn(
                          'flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 text-center transition-all hover:scale-[1.03] active:scale-[0.97]',
                          form.partySize === 2
                            ? 'text-white scale-[1.03] shadow-lg'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-500',
                        )}
                        style={form.partySize === 2 ? { backgroundColor: primary, borderColor: primary } : {}}
                      >
                        <Users className="w-5 h-5 opacity-90" />
                        <span className="text-[11px] font-semibold leading-tight">{t.ps_two}</span>
                      </button>

                      {/* 3-4 pessoas */}
                      <button
                        type="button"
                        onClick={() => set('partySize', 4)}
                        className={cn(
                          'flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 text-center transition-all hover:scale-[1.03] active:scale-[0.97]',
                          form.partySize === 4
                            ? 'text-white scale-[1.03] shadow-lg'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-500',
                        )}
                        style={form.partySize === 4 ? { backgroundColor: primary, borderColor: primary } : {}}
                      >
                        <Users className="w-5 h-5 opacity-90" />
                        <span className="text-[11px] font-semibold leading-tight">{t.ps_small}</span>
                      </button>

                      {/* 5-6 pessoas */}
                      <button
                        type="button"
                        onClick={() => set('partySize', 6)}
                        className={cn(
                          'flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 text-center transition-all hover:scale-[1.03] active:scale-[0.97]',
                          form.partySize === 6
                            ? 'text-white scale-[1.03] shadow-lg'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-500',
                        )}
                        style={form.partySize === 6 ? { backgroundColor: primary, borderColor: primary } : {}}
                      >
                        <Users className="w-5 h-5 opacity-90" />
                        <span className="text-[11px] font-semibold leading-tight">{t.ps_medium}</span>
                      </button>

                      {/* 7-10 pessoas */}
                      <button
                        type="button"
                        onClick={() => set('partySize', 10)}
                        className={cn(
                          'flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 text-center transition-all hover:scale-[1.03] active:scale-[0.97]',
                          form.partySize === 10
                            ? 'text-white scale-[1.03] shadow-lg'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-500',
                        )}
                        style={form.partySize === 10 ? { backgroundColor: primary, borderColor: primary } : {}}
                      >
                        <Users className="w-5 h-5 opacity-90" />
                        <span className="text-[11px] font-semibold leading-tight">{t.ps_large}</span>
                      </button>

                      {/* Grande grupo — desabilitado */}
                      <div className="flex flex-col items-center justify-center gap-1 p-3 rounded-xl border-2 border-zinc-800 text-center opacity-40 cursor-not-allowed bg-zinc-900">
                        <Users className="w-5 h-5 text-zinc-600" />
                        <span className="text-[11px] font-semibold text-zinc-500 leading-tight">{t.ps_xl}</span>
                        <span className="text-[9px] text-zinc-600 leading-tight">{t.ps_xl_sub}</span>
                      </div>
                    </div>
                  </div>

                  {/* ── Seção B: Grade de 14 dias ── */}
                  <div className="p-4">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">
                      {t.lbl_date}
                    </p>
                    <div className="grid grid-cols-7 gap-1.5">
                      {Array.from({ length: 14 }, (_, i) => {
                        const d        = addDays(new Date(), i)
                        const iso      = format(d, 'yyyy-MM-dd')
                        const dayOfWeek = d.getDay() // 0=Dom … 6=Sáb
                        const weekLabel = format(d, 'EEE', { locale: ptBR }).slice(0, 3)
                        const dayNum    = format(d, 'd')

                        const isClosed  = restaurant.activeDaysOfWeek
                          ? !restaurant.activeDaysOfWeek.includes(dayOfWeek)
                          : false
                        const isBlocked = (restaurant.blockedDates ?? []).includes(iso)
                        const isDisabled = isClosed || isBlocked
                        const isSelected = form.date === iso

                        return (
                          <button
                            key={iso}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => {
                              set('date', iso)
                              set('selectedSlot', null)
                            }}
                            title={isClosed ? t.closed : isBlocked ? t.blocked : undefined}
                            className={cn(
                              'flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl border text-center transition-all',
                              isDisabled
                                ? 'border-zinc-800 bg-zinc-900 opacity-30 cursor-not-allowed'
                                : isSelected
                                  ? 'border-transparent text-white scale-105 shadow-lg'
                                  : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-500 hover:scale-[1.04]',
                            )}
                            style={isSelected && !isDisabled ? { backgroundColor: primary, borderColor: primary } : {}}
                          >
                            <span className="text-[9px] font-medium capitalize opacity-70">{weekLabel}</span>
                            <span className="text-sm font-bold leading-none">{dayNum}</span>
                            {isBlocked && !isClosed && (
                              <span className="text-[7px] leading-none opacity-60">●</span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* ── Seção C: Horários por turno ── */}
                  <div className="p-4">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">
                      {t.lbl_time}
                    </p>

                    {!form.date ? (
                      <p className="text-xs text-zinc-500 text-center py-4">{t.pick_date_first}</p>
                    ) : slotsLoading ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
                      </div>
                    ) : !slots?.length ? (
                      <p className="text-xs text-zinc-500 text-center py-4">{t.no_slots_date}</p>
                    ) : (
                      // Agrupar por shiftName
                      (() => {
                        const byShift = slots.reduce<Record<string, typeof slots>>((acc, s) => {
                          if (!acc[s.shiftName]) acc[s.shiftName] = []
                          acc[s.shiftName].push(s)
                          return acc
                        }, {})

                        return (
                          <div className="space-y-4">
                            {Object.entries(byShift).map(([shiftName, shiftSlots]) => (
                              <div key={shiftName}>
                                <p className="text-[11px] font-semibold text-zinc-400 mb-2">{shiftName}</p>
                                <div className="flex flex-wrap gap-2">
                                  {shiftSlots.map((slot) => {
                                    const isSel =
                                      form.selectedSlot?.shiftId === slot.shiftId &&
                                      form.selectedSlot?.startTime === slot.startTime
                                    return (
                                      <button
                                        key={`${slot.shiftId}-${slot.startTime}`}
                                        type="button"
                                        onClick={() =>
                                          set('selectedSlot', {
                                            shiftId: slot.shiftId,
                                            shiftName: slot.shiftName,
                                            startTime: slot.startTime,
                                            availableSeats: slot.availableSeats,
                                          })
                                        }
                                        className={cn(
                                          'px-3 py-2 rounded-xl border text-sm font-semibold transition-all hover:scale-[1.03]',
                                          isSel
                                            ? 'text-white border-transparent shadow-md'
                                            : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-500',
                                        )}
                                        style={isSel ? { backgroundColor: primary, borderColor: primary } : {}}
                                      >
                                        {slot.startTime}
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      })()
                    )}
                  </div>
                </div>

                {/* Botão avançar */}
                <div className="p-4 border-t border-zinc-800">
                  <button
                    onClick={() => setStep('identity')}
                    disabled={form.partySize <= 0 || !form.selectedSlot}
                    className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ backgroundColor: primary, borderRadius: radius }}
                  >
                    {t.next}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
```

### 1D — Corrigir o botão voltar do step `identity`

Localize dentro do bloco `{step === 'identity' && ...}` o botão:

```tsx
                  <button onClick={() => setStep('slots')} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
```

Substitua **apenas** `setStep('slots')` por `setStep('schedule')`:

```tsx
                  <button onClick={() => setStep('schedule')} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
```

### 1E — Verificar se há outras referências a `'config'` ou `'slots'` como Step

Faça uma busca no arquivo por `'config'` e `'slots'` (entre aspas simples). Se encontrar qualquer referência ao valor do tipo `Step` (ex: `setStep('config')`, `step === 'config'`, `setStep('slots')`, `step === 'slots'`), remova ou corrija para o equivalente correto. **Não** confundir com chaves de tradução como `t.step_config` — essas ficam.

---

## ARQUIVO 2: `src/app/(public)/r/[slug]/page.tsx`

O arquivo atual faz uma query Prisma que não inclui shifts nem `settings`. Substitua o arquivo completo pelo seguinte:

```tsx
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { BookingWidget } from '@/components/widget/booking-widget'

export default async function WidgetPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      coverUrl: true,
      themeConfig: true,
      operatingHours: true,
      settings: true,
      shifts: {
        where: { isActive: true },
        select: { daysOfWeek: true },
      },
    },
  })

  if (!restaurant) notFound()

  const theme = (restaurant.themeConfig as Record<string, string> | null) ?? {
    primaryColor: '#000000',
    accentColor: '#000000',
    fontFamily: 'Figtree',
    borderRadius: '0.5rem',
  }

  // Derivar dias da semana ativos a partir dos turnos ativos
  const activeDaysOfWeek = [
    ...new Set(restaurant.shifts.flatMap((s) => s.daysOfWeek as number[])),
  ]

  // Datas bloqueadas armazenadas em restaurant.settings.blockedDates
  const settings = (restaurant.settings ?? {}) as Record<string, unknown>
  const blockedDates = (settings.blockedDates ?? []) as string[]

  const restaurantProps = {
    id: restaurant.id,
    name: restaurant.name,
    slug: restaurant.slug,
    logoUrl: restaurant.logoUrl,
    coverUrl: restaurant.coverUrl,
    themeConfig: restaurant.themeConfig as Record<string, unknown> | null,
    activeDaysOfWeek,
    blockedDates,
  }

  return (
    <>
      <style>{`
        :root {
          --widget-primary: ${theme.primaryColor};
          --widget-accent:  ${theme.accentColor ?? theme.primaryColor};
          --widget-radius:  ${theme.borderRadius ?? '0.5rem'};
          --widget-font:    ${theme.fontFamily ?? 'Figtree'};
        }
        body { font-family: var(--widget-font), sans-serif; background: #0a0a0a; }
      `}</style>
      <BookingWidget restaurant={restaurantProps} />
    </>
  )
}
```

---

## ARQUIVO 3: `src/components/configuracoes/config-disponibilidade.tsx` (CRIAR)

Crie este arquivo do zero:

```tsx
'use client'

import { useState } from 'react'
import { format, parseISO, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Trash2, CalendarX, Plus, Save } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/trpc/react'
import { cn } from '@/lib/utils'

interface Props {
  restaurantId: string
}

export function ConfigDisponibilidade({ restaurantId }: Props) {
  const [newDate, setNewDate] = useState('')

  const { data: blockedDates = [], isLoading, refetch } = api.restaurant.getBlockedDates.useQuery(
    { restaurantId },
    { enabled: !!restaurantId },
  )

  const setBlocked = api.restaurant.setBlockedDates.useMutation({
    onSuccess: () => {
      toast.success('Datas bloqueadas atualizadas.')
      void refetch()
    },
    onError: (e) => toast.error(e.message),
  })

  const today = format(new Date(), 'yyyy-MM-dd')

  function handleAdd() {
    if (!newDate) return
    if (blockedDates.includes(newDate)) {
      toast.warning('Esta data já está bloqueada.')
      return
    }
    const updated = [...blockedDates, newDate].sort()
    setBlocked.mutate({ restaurantId, blockedDates: updated })
    setNewDate('')
  }

  function handleRemove(date: string) {
    const updated = blockedDates.filter((d) => d !== date)
    setBlocked.mutate({ restaurantId, blockedDates: updated })
  }

  function formatDate(iso: string) {
    try {
      const parsed = parseISO(iso)
      if (!isValid(parsed)) return iso
      return format(parsed, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    } catch {
      return iso
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[15px] font-semibold mb-1">Datas bloqueadas</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Datas bloqueadas impedem que o widget público exiba horários disponíveis,
          independentemente dos turnos configurados. Use para feriados, eventos privados
          ou qualquer dia em que o restaurante não receba reservas online.
        </p>
      </div>

      {/* Adicionar nova data */}
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={newDate}
          min={today}
          onChange={(e) => setNewDate(e.target.value)}
          className={cn(
            'flex-1 h-9 rounded-lg border border-input bg-background px-3 text-sm',
            'focus:outline-none focus:ring-2 focus:ring-ring',
          )}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!newDate || setBlocked.isPending}
          className={cn(
            'flex items-center gap-1.5 h-9 px-4 rounded-lg text-sm font-medium',
            'bg-primary text-primary-foreground hover:opacity-90 transition-opacity',
            'disabled:opacity-40 disabled:cursor-not-allowed',
          )}
        >
          <Plus className="w-4 h-4" />
          Adicionar
        </button>
      </div>

      {/* Lista de datas bloqueadas */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : blockedDates.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <CalendarX className="w-8 h-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Nenhuma data bloqueada.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {blockedDates.map((date) => (
            <li
              key={date}
              className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-border bg-muted/20"
            >
              <div className="flex items-center gap-2 text-sm">
                <CalendarX className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="font-medium capitalize">{formatDate(date)}</span>
                <span className="text-muted-foreground text-xs">({date})</span>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(date)}
                disabled={setBlocked.isPending}
                className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
                title="Remover bloqueio"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {setBlocked.isPending && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Save className="w-3 h-3 animate-pulse" />
          Salvando...
        </div>
      )}
    </div>
  )
}
```

---

## ARQUIVO 4: `src/app/(dashboard)/dashboard/configuracoes/page.tsx`

Faça **duas** mudanças cirúrgicas neste arquivo:

### 4A — Adicionar o import

Logo após a última linha de imports de componentes `config-*`, adicione:

```tsx
import { ConfigDisponibilidade } from '@/components/configuracoes/config-disponibilidade'
```

### 4B — Adicionar ao array TABS

O array `TABS` atual tem este formato:
```ts
const TABS = [
  ['geral',        'Geral'],
  ['tema',         'Tema'],
  ['turnos',       'Turnos'],
  ['notificacoes', 'Notificações'],
  ['pagamento',    'Pagamento'],
  ['autotags',     'Auto-Tags'],
  ['garcons',      'Garçons'],
  ['integracao',   'Integração'],
] as const
```

Adicione `['disponibilidade', 'Disponibilidade']` entre `'turnos'` e `'notificacoes'`:

```ts
const TABS = [
  ['geral',           'Geral'],
  ['tema',            'Tema'],
  ['turnos',          'Turnos'],
  ['disponibilidade', 'Disponibilidade'],
  ['notificacoes',    'Notificações'],
  ['pagamento',       'Pagamento'],
  ['autotags',        'Auto-Tags'],
  ['garcons',         'Garçons'],
  ['integracao',      'Integração'],
] as const
```

### 4C — Adicionar o TabsContent

No bloco `<div className="flex-1 min-w-0">`, após o `TabsContent` de `turnos`, adicione:

```tsx
          <TabsContent value="disponibilidade">
            <ConfigDisponibilidade restaurantId={restaurantId} />
          </TabsContent>
```

---

## Checklist de verificação após as mudanças

Antes de concluir, verifique:

- [ ] `booking-widget.tsx` não contém mais nenhuma referência a `step === 'config'` ou `step === 'slots'` como valores de Step
- [ ] `booking-widget.tsx` contém exatamente um bloco `step === 'schedule'` com seções A, B e C
- [ ] O back button do step `identity` chama `setStep('schedule')`
- [ ] O arquivo `/r/[slug]/page.tsx` passa `activeDaysOfWeek` e `blockedDates` para `<BookingWidget>`
- [ ] `config-disponibilidade.tsx` existe e exporta `ConfigDisponibilidade`
- [ ] `configuracoes/page.tsx` importa e renderiza `ConfigDisponibilidade` na aba `disponibilidade`
- [ ] `pnpm build` passa sem erros de TypeScript

## O que NÃO alterar

- `src/server/routers/widget.ts` — já está correto
- `src/server/routers/restaurant.ts` — já está correto
- `src/lib/widgetPublic.ts` — já está correto
- Qualquer outro step do widget (`welcome`, `occasion`, `identity`, `profile`, `preferences`, `referral`, `pix`, `success`)
- O schema Prisma
