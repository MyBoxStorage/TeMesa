'use client'

import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Users, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ReservationStatusBadge } from '@/components/common/status-badges'
import type { Reservation, Customer, Table, Shift, Server } from '@prisma/client'

type ReservationWithRelations = Reservation & {
  customer?: Customer | null
  table?: Table | null
  shift?: Shift | null
  server?: Server | null
}

interface ReservationCardProps {
  reservation: ReservationWithRelations
  selected?: boolean
  onClick: () => void
}

export function ReservationCard({ reservation, selected, onClick }: ReservationCardProps) {
  const time = format(new Date(reservation.date), 'HH:mm')
  const initials = reservation.guestName
    .split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

  // Deterministic avatar color based on name
  const colors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-violet-500',
    'bg-rose-500', 'bg-amber-500', 'bg-teal-500', 'bg-indigo-500',
  ]
  const colorIdx = reservation.guestName.charCodeAt(0) % colors.length
  const avatarColor = colors[colorIdx]

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 border-b border-border/40 hover:bg-muted/40 transition-colors text-left',
        selected && 'bg-muted/60 border-l-2 border-l-primary border-b-border/40'
      )}
    >
      {/* Avatar */}
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0',
        avatarColor
      )}>
        {initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="text-[13px] font-medium truncate">{reservation.guestName}</span>
          <span className="text-[12px] font-semibold text-muted-foreground shrink-0">{time}</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {reservation.partySize} pessoas
          </span>
          {reservation.table && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {reservation.table.name}
            </span>
          )}
        </div>
      </div>

      {/* Status */}
      <ReservationStatusBadge status={reservation.status} />
    </button>
  )
}
