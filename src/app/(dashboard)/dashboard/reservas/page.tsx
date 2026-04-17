'use client'

import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { Plus, Search, SlidersHorizontal, List, Clock, Zap, CalendarDays } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ReservationCard } from '@/components/reservas/reservation-card'
import { ReservationDetail } from '@/components/reservas/reservation-detail'
import { ReservationForm } from '@/components/reservas/reservation-form'
import { TimelineView } from '@/components/reservas/timeline-view'
import { EmptyState, SkeletonRow } from '@/components/common/empty-state'
import { RES_DOT } from '@/components/common/status-badges'
import { api } from '@/trpc/react'
import { toast } from 'sonner'
import { useDashboard } from '../dashboard-ctx'
import { cn } from '@/lib/utils'

const STATUS_FILTERS = [
  { value: 'all',        label: 'Todas',        dot: 'bg-muted-foreground/35' },
  { value: 'CONFIRMED',  label: 'Confirmadas', dot: RES_DOT.CONFIRMED },
  { value: 'CHECKED_IN', label: 'Check-in',    dot: RES_DOT.CHECKED_IN },
  { value: 'PENDING',    label: 'Pendentes',   dot: RES_DOT.PENDING },
  { value: 'NO_SHOW',    label: 'No-show',     dot: RES_DOT.NO_SHOW },
] as const

export default function ReservasPage() {
  const { date: dashDate, restaurantId } = useDashboard()
  const dateStr = format(dashDate, 'yyyy-MM-dd')

  const [view, setView]             = useState<'list' | 'timeline'>('list')
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatus]   = useState('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [formOpen, setFormOpen]     = useState(false)

  const utils = api.useUtils()
  const updateStatus = api.reservations.updateStatus.useMutation({
    onSuccess: () => {
      void utils.reservations.list.invalidate()
    },
    onError: (e) => toast.error(e.message),
  })

  const { data: reservations, isLoading } = api.reservations.list.useQuery({
    restaurantId: restaurantId!,
    date: dateStr,
    status: statusFilter !== 'all' ? (statusFilter as any) : undefined,
    search: search || undefined,
  }, { enabled: !!restaurantId, retry: false })

  const { data: restaurantMeta } = api.restaurant.getById.useQuery(
    { restaurantId: restaurantId! },
    { enabled: !!restaurantId }
  )
  const widgetSlug = restaurantMeta?.slug ?? ''

  // Verifica silenciosamente se o sinal Pix está ativo — usado só para o badge informativo
  const { data: paymentCfg } = api.restaurant.getPrepaymentConfig.useQuery(
    { restaurantId: restaurantId! },
    { enabled: !!restaurantId }
  )
  const pixAtivo = (paymentCfg?.config as Record<string, unknown> | null)?.prepayment_enabled === true

  const filtered = reservations ?? []

  const groups = useMemo(() => ({
    checkedIn: filtered.filter(r => r.status === 'CHECKED_IN'),
    confirmed: filtered.filter(r => r.status === 'CONFIRMED'),
    pending:   filtered.filter(r => ['PENDING','PENDING_PAYMENT'].includes(r.status)),
    finished:  filtered.filter(r => r.status === 'FINISHED'),
  }), [filtered])

  const selectedReservation = filtered.find(r => r.id === selectedId)

  if (!restaurantId) return null

  return (
    <div className="flex h-full">
      <div className={cn(
        'flex flex-col border-r border-border bg-background transition-all duration-200',
        selectedId ? 'w-[380px] shrink-0' : 'flex-1'
      )}>
        <div className="px-4 py-3.5 border-b border-border space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Buscar por nome ou telefone..."
                className="pl-10 h-10 text-[14px] bg-muted/30 border-border/60 rounded-xl"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Button size="icon" variant="ghost" className="h-10 w-10 shrink-0 rounded-xl">
              <SlidersHorizontal className="w-4 h-4" />
            </Button>
            <Button className="h-10 gap-2 text-[13px] font-semibold px-4 shrink-0 rounded-xl shadow-sm" onClick={() => setFormOpen(true)}>
              <Plus className="w-4 h-4" />
              Nova reserva
            </Button>
          </div>

          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                type="button"
                onClick={() => setStatus(f.value)}
                className={cn(
                  'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap transition-colors border',
                  statusFilter === f.value
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-muted/50 text-muted-foreground border-transparent hover:text-foreground hover:bg-muted',
                )}
              >
                <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', f.dot)} />
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-muted-foreground">
                {filtered.length} reserva{filtered.length !== 1 ? 's' : ''} · {dateStr}
              </span>
              {pixAtivo && (
                <a
                  href="/dashboard/configuracoes?tab=pagamento"
                  title="Sinal Pix ativo — clique para configurar"
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/15 border border-green-500/30 text-green-400 text-[10px] font-medium hover:bg-green-500/25 transition-colors"
                >
                  <Zap className="w-2.5 h-2.5" /> Sinal Pix ativo
                </a>
              )}
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant={view === 'list' ? 'secondary' : 'ghost'} className="h-6 w-6" onClick={() => setView('list')}>
                <List className="w-3 h-3" />
              </Button>
              <Button size="icon" variant={view === 'timeline' ? 'secondary' : 'ghost'} className="h-6 w-6" onClick={() => setView('timeline')}>
                <Clock className="w-3 h-3" />
              </Button>
            </div>
          </div>        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
          ) : view === 'timeline' ? (
            <TimelineView reservations={filtered} onSelect={setSelectedId} />
          ) : filtered.length === 0 ? (
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
                    type="button"
                    onClick={() => {
                      if (!widgetSlug) return
                      const widgetUrl = `${window.location.origin}/r/${widgetSlug}`
                      void navigator.clipboard?.writeText(widgetUrl)
                      toast.success('Link do widget copiado!')
                    }}
                    className="text-[11px] text-muted-foreground hover:text-foreground transition-colors underline"
                  >
                    Copiar link do widget
                  </button>
                </div>
              }
            />
          ) : (
            <div>
              {groups.checkedIn.length > 0 && (
                <SectionGroup label="Check-in" count={groups.checkedIn.length} dot="bg-green-400">
                  {groups.checkedIn.map(r => (
                    <ReservationCard
                      key={r.id}
                      reservation={r as any}
                      selected={selectedId === r.id}
                      onClick={() => setSelectedId(r.id)}
                      onSwipeAction={(status) => {
                        if (!restaurantId) return
                        if (confirm(`Confirma ${status === 'CHECKED_IN' ? 'Check-in' : 'No-show'}?`)) {
                          updateStatus.mutate({ restaurantId, reservationId: r.id, status })
                        }
                      }}
                    />
                  ))}
                </SectionGroup>
              )}
              {groups.confirmed.length > 0 && (
                <SectionGroup label="Confirmadas" count={groups.confirmed.length} dot="bg-blue-400">
                  {groups.confirmed.map(r => (
                    <ReservationCard
                      key={r.id}
                      reservation={r as any}
                      selected={selectedId === r.id}
                      onClick={() => setSelectedId(r.id)}
                      onSwipeAction={(status) => {
                        if (!restaurantId) return
                        if (confirm(`Confirma ${status === 'CHECKED_IN' ? 'Check-in' : 'No-show'}?`)) {
                          updateStatus.mutate({ restaurantId, reservationId: r.id, status })
                        }
                      }}
                    />
                  ))}
                </SectionGroup>
              )}
              {groups.pending.length > 0 && (
                <SectionGroup label="Pendentes" count={groups.pending.length} dot="bg-amber-400">
                  {groups.pending.map(r => (
                    <ReservationCard
                      key={r.id}
                      reservation={r as any}
                      selected={selectedId === r.id}
                      onClick={() => setSelectedId(r.id)}
                    />
                  ))}
                </SectionGroup>
              )}
              {groups.finished.length > 0 && (
                <SectionGroup label="Finalizadas" count={groups.finished.length} dot="bg-zinc-400">
                  {groups.finished.map(r => (
                    <ReservationCard
                      key={r.id}
                      reservation={r as any}
                      selected={selectedId === r.id}
                      onClick={() => setSelectedId(r.id)}
                    />
                  ))}
                </SectionGroup>
              )}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {selectedId && selectedReservation && (
          <motion.div
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.18 }}
            className="flex-1 overflow-y-auto"
          >
            <ReservationDetail
              reservation={selectedReservation as any}
              restaurantId={restaurantId}
              onClose={() => setSelectedId(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <ReservationForm open={formOpen} onClose={() => setFormOpen(false)} restaurantId={restaurantId} />
    </div>
  )
}

function SectionGroup({ label, count, dot, children }: {
  label: string; count: number; dot: string; children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-2.5 px-4 py-2.5 sticky top-0 bg-background/95 backdrop-blur-md z-10 border-b border-border/50">
        <span className={cn('w-2 h-2 rounded-full ring-2 ring-background', dot)} />
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.12em]">{label}</span>
        <span className="text-[11px] font-semibold text-muted-foreground/80 tabular-nums">{count}</span>
      </div>
      {children}
    </div>
  )
}
