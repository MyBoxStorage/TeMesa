'use client'

import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import type { Reservation } from '@prisma/client'

const HOURS = Array.from({ length: 14 }, (_, i) => i + 10) // 10:00–23:00
const SLOT_W = 80 // pixels per hour

interface Props {
  reservations: Reservation[]
  onSelect: (id: string) => void
}

const STATUS_COLOR: Record<string, string> = {
  CONFIRMED:       'bg-blue-500/20 border-blue-500/40 text-blue-300',
  CHECKED_IN:      'bg-green-500/20 border-green-500/40 text-green-300',
  PENDING:         'bg-zinc-500/20 border-zinc-500/30 text-zinc-400',
  PENDING_PAYMENT: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
  FINISHED:        'bg-zinc-700/30 border-zinc-600/30 text-zinc-500',
  NO_SHOW:         'bg-red-500/20 border-red-500/30 text-red-400',
  CANCELLED:       'bg-zinc-700/20 border-zinc-600/20 text-zinc-600',
}

export function TimelineView({ reservations, onSelect }: Props) {
  // Get unique table names
  const tables = [...new Set(reservations.map(r => (r as any).table?.name ?? 'Sem mesa'))]

  const getLeft = (date: Date) => {
    const h = date.getHours() + date.getMinutes() / 60
    return Math.max(0, (h - 10) * SLOT_W)
  }

  const getWidth = (duration = 90) => (duration / 60) * SLOT_W

  return (
    <div className="overflow-x-auto">
      {/* Hour headers */}
      <div className="flex sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
        <div className="w-24 shrink-0 px-3 py-2 text-[11px] text-muted-foreground font-medium border-r border-border">
          Mesa
        </div>
        <div className="flex" style={{ minWidth: HOURS.length * SLOT_W }}>
          {HOURS.map(h => (
            <div key={h} className="shrink-0 border-r border-border/30 text-center py-2"
              style={{ width: SLOT_W }}>
              <span className="text-[11px] text-muted-foreground font-medium">
                {h.toString().padStart(2, '0')}:00
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Rows per table */}
      {tables.map((tableName, rowIdx) => {
        const tableReservations = reservations.filter(
          r => ((r as any).table?.name ?? 'Sem mesa') === tableName
        )
        return (
          <div key={tableName} className={cn('flex border-b border-border/30', rowIdx % 2 === 0 ? 'bg-muted/10' : '')}>
            <div className="w-24 shrink-0 px-3 py-3 border-r border-border/30 flex items-center">
              <span className="text-[12px] font-medium truncate">{tableName}</span>
            </div>
            <div className="relative flex-1" style={{ minWidth: HOURS.length * SLOT_W, height: 44 }}>
              {/* Grid lines */}
              {HOURS.map(h => (
                <div key={h} className="absolute top-0 bottom-0 border-r border-border/20"
                  style={{ left: (h - 10) * SLOT_W }} />
              ))}
              {/* Reservation blocks */}
              {tableReservations.map(r => {
                const left = getLeft(new Date(r.date))
                const width = getWidth((r as any).shift?.turnDuration ?? 90)
                return (
                  <button
                    key={r.id}
                    onClick={() => onSelect(r.id)}
                    style={{ left, width: width - 2, top: 4, height: 36 }}
                    className={cn(
                      'absolute rounded border text-left px-2 py-1 hover:brightness-110 transition-all cursor-pointer',
                      STATUS_COLOR[r.status] ?? STATUS_COLOR['CONFIRMED']
                    )}
                  >
                    <p className="text-[11px] font-medium truncate leading-tight">{r.guestName}</p>
                    <p className="text-[10px] opacity-70">{r.partySize} 👤</p>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
