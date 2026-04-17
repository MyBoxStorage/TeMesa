import { cn } from '@/lib/utils'
import type { ReservationStatus, TableStatus } from '@prisma/client'

/* ── TABLE STATUS ─────────────────────────────────────────────────────────── */
const TABLE_LABEL: Record<TableStatus, string> = {
  AVAILABLE: 'Disponível',
  RESERVED:  'Reservada',
  OCCUPIED:  'Ocupada',
  WAITING:   'Aguardando',
  BLOCKED:   'Bloqueada',
}
const TABLE_CLASS: Record<TableStatus, string> = {
  AVAILABLE: 'status-available',
  RESERVED:  'status-reserved',
  OCCUPIED:  'status-occupied',
  WAITING:   'status-waiting',
  BLOCKED:   'status-blocked',
}
const TABLE_DOT: Record<TableStatus, string> = {
  AVAILABLE: 'bg-green-400',
  RESERVED:  'bg-blue-400',
  OCCUPIED:  'bg-amber-400',
  WAITING:   'bg-purple-400',
  BLOCKED:   'bg-red-400',
}

export function TableStatusBadge({ status }: { status: TableStatus }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium', TABLE_CLASS[status])}>
      <span className={cn('w-1.5 h-1.5 rounded-full', TABLE_DOT[status])} />
      {TABLE_LABEL[status]}
    </span>
  )
}

export function TableStatusDot({ status, size = 'md' }: { status: TableStatus; size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: 'w-1.5 h-1.5', md: 'w-2 h-2', lg: 'w-2.5 h-2.5' }[size]
  return <span className={cn('rounded-full shrink-0', TABLE_DOT[status], s)} />
}

/* ── RESERVATION STATUS ───────────────────────────────────────────────────── */
const RES_LABEL: Record<ReservationStatus, string> = {
  PENDING:         'Pendente',
  PENDING_PAYMENT: 'Ag. Pagamento',
  CONFIRMED:       'Confirmada',
  CHECKED_IN:      'Check-in',
  FINISHED:        'Finalizada',
  NO_SHOW:         'Não compareceu',
  CANCELLED:       'Cancelada',
}
const RES_CLASS: Record<ReservationStatus, string> = {
  PENDING:         'res-pending',
  PENDING_PAYMENT: 'res-pending-payment',
  CONFIRMED:       'res-confirmed',
  CHECKED_IN:      'res-checked-in',
  FINISHED:        'res-finished',
  NO_SHOW:         'res-no-show',
  CANCELLED:       'res-cancelled',
}
const RES_DOT: Record<ReservationStatus, string> = {
  PENDING:         'bg-amber-400',
  PENDING_PAYMENT: 'bg-amber-500',
  CONFIRMED:       'bg-blue-400',
  CHECKED_IN:      'bg-green-400',
  FINISHED:        'bg-zinc-400',
  NO_SHOW:         'bg-orange-400',
  CANCELLED:       'bg-red-400',
}

export function ReservationStatusBadge({ status }: { status: ReservationStatus }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-semibold',
      RES_CLASS[status],
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', RES_DOT[status])} />
      {RES_LABEL[status]}
    </span>
  )
}

export { RES_LABEL, TABLE_LABEL, RES_DOT }
