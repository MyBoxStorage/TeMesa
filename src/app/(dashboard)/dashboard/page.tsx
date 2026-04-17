'use client'

import { useMemo } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Users, Clock, AlertTriangle, CalendarCheck, XCircle, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { api } from '@/trpc/react'
import { useDashboard } from './dashboard-ctx'
import { cn } from '@/lib/utils'

export default function DashboardHome() {
  const { restaurantId } = useDashboard()
  const dateStr = format(new Date(), 'yyyy-MM-dd')

  const { data: reservations } = api.reservations.list.useQuery(
    {
      restaurantId: restaurantId!,
      date: dateStr,
    },
    { enabled: !!restaurantId, refetchInterval: 30_000 }
  )

  const stats = useMemo(() => {
    const all = reservations ?? []
    return {
      total: all.length,
      confirmed: all.filter((r) => r.status === 'CONFIRMED').length,
      checkedIn: all.filter((r) => r.status === 'CHECKED_IN').length,
      pending: all.filter((r) => ['PENDING', 'PENDING_PAYMENT'].includes(r.status)).length,
      noShow: all.filter((r) => r.status === 'NO_SHOW').length,
      cancelled: all.filter((r) => r.status === 'CANCELLED').length,
      totalGuests: all
        .filter((r) => ['CONFIRMED', 'CHECKED_IN', 'PENDING'].includes(r.status))
        .reduce((sum, r) => sum + r.partySize, 0),
      noShowRisk: all.filter(
        (r) =>
          ['CONFIRMED', 'PENDING'].includes(r.status) && (r.customer?.noShowCount ?? 0) >= 2
      ),
      specialOccasions: all.filter(
        (r) => Boolean(r.occasion) && ['CONFIRMED', 'CHECKED_IN'].includes(r.status)
      ),
      allergies: all.filter(
        (r) => Boolean(r.dietaryNotes) && ['CONFIRMED', 'CHECKED_IN'].includes(r.status)
      ),
    }
  }, [reservations])

  if (!restaurantId) return null

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}</h1>
        <p className="text-sm text-muted-foreground mt-1">Visão geral do dia · {stats.total} reservas</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Confirmadas', value: stats.confirmed, icon: CheckCircle, box: 'bg-blue-500/10 border-blue-500/20', ic: 'text-blue-400' },
          { label: 'Check-in', value: stats.checkedIn, icon: CalendarCheck, box: 'bg-green-500/10 border-green-500/20', ic: 'text-green-400' },
          { label: 'Pendentes', value: stats.pending, icon: Clock, box: 'bg-amber-500/10 border-amber-500/20', ic: 'text-amber-400' },
          { label: 'Pessoas esperadas', value: stats.totalGuests, icon: Users, box: 'bg-primary/10 border-primary/20', ic: 'text-primary' },
        ].map((m) => (
          <div key={m.label} className={cn('rounded-xl border p-4', m.box)}>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center border border-border/50 bg-background/70">
                <m.icon className={cn('w-4 h-4', m.ic)} />
              </div>
              <span className="text-[11px] font-medium text-muted-foreground leading-tight">{m.label}</span>
            </div>
            <p className="text-3xl font-bold tracking-tight tabular-nums">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-red-500/15 bg-red-500/5 p-4">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center border border-red-500/20 bg-background/60">
              <XCircle className="w-4 h-4 text-red-400" />
            </div>
            <span className="text-[11px] font-medium text-muted-foreground">Canceladas</span>
          </div>
          <p className="text-3xl font-bold tracking-tight tabular-nums">{stats.cancelled}</p>
        </div>
        <div className="rounded-xl border border-orange-500/15 bg-orange-500/5 p-4">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center border border-orange-500/20 bg-background/60">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
            </div>
            <span className="text-[11px] font-medium text-muted-foreground">No-show</span>
          </div>
          <p className="text-3xl font-bold tracking-tight tabular-nums">{stats.noShow}</p>
        </div>
      </div>

      {(stats.noShowRisk.length > 0 || stats.specialOccasions.length > 0 || stats.allergies.length > 0) && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">⚡ Atenção hoje</h3>

          {stats.noShowRisk.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg"
            >
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

          {stats.specialOccasions.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-3 p-3 bg-pink-500/10 border border-pink-500/20 rounded-lg"
            >
              <span className="text-base">🎂</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {r.guestName} — {r.occasion}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {format(new Date(r.date), 'HH:mm')} · {r.partySize} pessoas
                </p>
              </div>
            </div>
          ))}

          {stats.allergies.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg"
            >
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

      <div className="pt-4 border-t border-border">
        <Link href="/dashboard/reservas" className="text-sm text-primary hover:underline flex items-center gap-1">
          Ver todas as reservas de hoje →
        </Link>
      </div>
    </div>
  )
}
