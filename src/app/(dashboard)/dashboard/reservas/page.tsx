'use client'

import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { Plus, Search, SlidersHorizontal, List, Clock, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ReservationCard } from '@/components/reservas/reservation-card'
import { ReservationDetail } from '@/components/reservas/reservation-detail'
import { ReservationForm } from '@/components/reservas/reservation-form'
import { TimelineView } from '@/components/reservas/timeline-view'
import { EmptyState, SkeletonRow } from '@/components/common/empty-state'
import { api } from '@/trpc/react'
import { useDashboard } from '../layout'
import { cn } from '@/lib/utils'

const STATUS_FILTERS = [
  { value: 'all',        label: 'Todas'       },
  { value: 'CONFIRMED',  label: 'Confirmadas' },
  { value: 'CHECKED_IN', label: 'Check-in'    },
  { value: 'PENDING',    label: 'Pendentes'   },
  { value: 'NO_SHOW',    label: 'No-show'     },
]

export default function ReservasPage() {
  const { date: dashDate, restaurantId } = useDashboard()
  const dateStr = format(dashDate, 'yyyy-MM-dd')

  const [view, setView]             = useState<'list' | 'timeline'>('list')
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatus]   = useState('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [formOpen, setFormOpen]     = useState(false)

  const { data: reservations, isLoading } = api.reservations.list.useQuery({
    restaurantId: restaurantId!,
    date: dateStr,
    status: statusFilter !== 'all' ? (statusFilter as any) : undefined,
    search: search || undefined,
  }, { enabled: !!restaurantId, retry: false })

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
        <div className="px-4 py-3 border-b border-border space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou telefone..."
                className="pl-8 h-8 text-[13px] bg-muted/40 border-border/50"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0">
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" className="h-8 gap-1.5 text-[12px] shrink-0" onClick={() => setFormOpen(true)}>
              <Plus className="w-3.5 h-3.5" />
              Nova
            </Button>
          </div>

          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setStatus(f.value)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors',
                  statusFilter === f.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
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
              icon={<Clock className="w-5 h-5" />}
              title="Nenhuma reserva"
              description={`Não há reservas para ${dateStr} com os filtros selecionados.`}
              action={<Button size="sm" variant="outline" onClick={() => setFormOpen(true)}>Criar reserva</Button>}
            />
          ) : (
            <div>
              {groups.checkedIn.length > 0 && (
                <SectionGroup label="Check-in" count={groups.checkedIn.length} dot="bg-green-400">
                  {groups.checkedIn.map(r => <ReservationCard key={r.id} reservation={r as any} selected={selectedId === r.id} onClick={() => setSelectedId(r.id)} />)}
                </SectionGroup>
              )}
              {groups.confirmed.length > 0 && (
                <SectionGroup label="Confirmadas" count={groups.confirmed.length} dot="bg-blue-400">
                  {groups.confirmed.map(r => <ReservationCard key={r.id} reservation={r as any} selected={selectedId === r.id} onClick={() => setSelectedId(r.id)} />)}
                </SectionGroup>
              )}
              {groups.pending.length > 0 && (
                <SectionGroup label="Pendentes" count={groups.pending.length} dot="bg-amber-400">
                  {groups.pending.map(r => <ReservationCard key={r.id} reservation={r as any} selected={selectedId === r.id} onClick={() => setSelectedId(r.id)} />)}
                </SectionGroup>
              )}
              {groups.finished.length > 0 && (
                <SectionGroup label="Finalizadas" count={groups.finished.length} dot="bg-zinc-400">
                  {groups.finished.map(r => <ReservationCard key={r.id} reservation={r as any} selected={selectedId === r.id} onClick={() => setSelectedId(r.id)} />)}
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
      <div className="flex items-center gap-2 px-4 py-2 sticky top-0 bg-background/90 backdrop-blur-sm z-10 border-b border-border/40">
        <span className={cn('w-1.5 h-1.5 rounded-full', dot)} />
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
        <span className="text-[11px] text-muted-foreground">({count})</span>
      </div>
      {children}
    </div>
  )
}
