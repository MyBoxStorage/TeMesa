'use client'

import { useState, useEffect } from 'react'
import { format, differenceInMinutes } from 'date-fns'
import { Users, MapPin } from 'lucide-react'
import { motion, useMotionValue, type PanInfo } from 'framer-motion'
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
  onSwipeAction?: (status: 'CHECKED_IN' | 'NO_SHOW') => void
}

export function ReservationCard({ reservation, selected, onClick, onSwipeAction }: ReservationCardProps) {
  const time = format(new Date(reservation.date), 'HH:mm')
  const initials = reservation.guestName
    .split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

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

  const [swipeEnabled, setSwipeEnabled] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const fn = () => setSwipeEnabled(mq.matches)
    fn()
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])

  const x = useMotionValue(0)
  const canCheckIn = reservation.status === 'CONFIRMED'
  const canNoShow = reservation.status === 'CONFIRMED'

  function handleDragEnd(_: unknown, info: PanInfo) {
    const threshold = 80
    if (info.offset.x > threshold && canCheckIn) {
      onSwipeAction?.('CHECKED_IN')
    } else if (info.offset.x < -threshold && canNoShow) {
      onSwipeAction?.('NO_SHOW')
    }
  }

  // Deterministic avatar color based on name
  const colors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-violet-500',
    'bg-rose-500', 'bg-amber-500', 'bg-teal-500', 'bg-indigo-500',
  ]
  const colorIdx = reservation.guestName.charCodeAt(0) % colors.length
  const avatarColor = colors[colorIdx]

  const cardInner = (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3.5 px-4 py-3.5 border-b border-border/40 hover:bg-muted/30 transition-all text-left',
        selected && 'bg-primary/5 border-l-[3px] border-l-primary border-b-border/40'
      )}
    >
      {/* Avatar */}
      <div className={cn(
        'w-10 h-10 rounded-xl flex items-center justify-center text-[12px] font-bold text-white shrink-0 shadow-sm',
        avatarColor
      )}>
        {initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="text-[14px] font-semibold truncate flex items-center gap-1 min-w-0">
            {reservation.guestName}
            {(reservation.customer?.noShowCount ?? 0) >= 2 && (
              <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/15 text-amber-400 border border-amber-500/20 rounded-full shrink-0">
                ⚠️ {reservation.customer!.noShowCount} no-shows
              </span>
            )}
          </span>
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
        </div>
        <div className="flex items-center gap-3 text-[12px] text-muted-foreground">
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

  if (!swipeEnabled || !(canCheckIn || canNoShow) || !onSwipeAction) {
    return cardInner
  }

  return (
    <div className="relative overflow-hidden">
      <div
        className="absolute inset-0 flex items-center justify-between px-6 pointer-events-none text-[10px]"
        aria-hidden
      >
        <span className="font-medium text-red-400/90">No-show ←</span>
        <span className="font-medium text-green-400/90">→ Check-in</span>
      </div>
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.3}
        dragSnapToOrigin
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="relative bg-background"
      >
        {cardInner}
      </motion.div>
    </div>
  )
}
