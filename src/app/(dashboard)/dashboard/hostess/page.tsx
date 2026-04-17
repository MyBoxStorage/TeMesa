'use client'

import { useMemo } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Users, MapPin, Clock, AlertTriangle, CheckCircle, Star, Cake } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { api } from '@/trpc/react'
import { useDashboard } from '../layout'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function HostessPage() {
  const { restaurantId } = useDashboard()
  const dateStr = format(new Date(), 'yyyy-MM-dd')
  const utils = api.useUtils()

  const { data: reservations } = api.reservations.list.useQuery(
    {
      restaurantId: restaurantId!,
      date: dateStr,
    },
    { enabled: !!restaurantId, refetchInterval: 15_000 }
  )

  const updateStatus = api.reservations.updateStatus.useMutation({
    onSuccess: () => {
      void utils.reservations.list.invalidate()
      toast.success('Status atualizado!')
    },
    onError: (e) => toast.error(e.message),
  })

  const now = new Date()
  const activeReservations = useMemo(
    () =>
      (reservations ?? [])
        .filter((r) => ['CONFIRMED', 'PENDING', 'CHECKED_IN'].includes(r.status))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [reservations]
  )

  if (!restaurantId) return null

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-bold">Hoje</p>
            <p className="text-xs text-muted-foreground">
              {format(now, "EEEE, dd 'de' MMMM", { locale: ptBR })} · {activeReservations.length} reservas
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold tabular-nums">{format(now, 'HH:mm')}</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {activeReservations.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhuma reserva ativa para hoje</p>
          </div>
        ) : (
          activeReservations.map((r) => {
            const isNoShowRisk = (r.customer?.noShowCount ?? 0) >= 2
            const isVIP = r.customer?.tags?.includes('VIP')
            const isBirthday = r.occasion === 'BIRTHDAY'
            const hasAllergy = Boolean(r.dietaryNotes)

            return (
              <div
                key={r.id}
                className={cn(
                  'border rounded-xl p-4 space-y-3',
                  r.status === 'CHECKED_IN'
                    ? 'border-green-500/30 bg-green-500/5'
                    : isNoShowRisk
                      ? 'border-amber-500/30 bg-amber-500/5'
                      : 'border-border'
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-base">{r.guestName}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5 flex-wrap">
                      <Clock className="w-3 h-3" />
                      {format(new Date(r.date), 'HH:mm')}
                      <Users className="w-3 h-3 ml-1" />
                      {r.partySize} pessoas
                      {r.table && (
                        <>
                          <MapPin className="w-3 h-3 ml-1" />
                          {r.table.name}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {isVIP && (
                      <Badge variant="outline" className="text-amber-400 border-amber-400/30 text-[10px]">
                        <Star className="w-2.5 h-2.5 mr-0.5" />
                        VIP
                      </Badge>
                    )}
                    {isBirthday && (
                      <Badge variant="outline" className="text-pink-400 border-pink-400/30 text-[10px]">
                        <Cake className="w-2.5 h-2.5 mr-0.5" />
                        Aniversário
                      </Badge>
                    )}
                  </div>
                </div>

                {(hasAllergy || isNoShowRisk) && (
                  <div className="flex gap-2 flex-wrap">
                    {hasAllergy && (
                      <span className="text-[10px] px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full">
                        ⚠️ {r.dietaryNotes}
                      </span>
                    )}
                    {isNoShowRisk && (
                      <span className="text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full">
                        <AlertTriangle className="w-2.5 h-2.5 inline mr-0.5" />
                        {r.customer?.noShowCount} no-shows
                      </span>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  {r.status === 'CONFIRMED' && (
                    <Button
                      className="flex-1 h-12 text-sm font-semibold"
                      onClick={() =>
                        updateStatus.mutate({
                          restaurantId,
                          reservationId: r.id,
                          status: 'CHECKED_IN',
                        })
                      }
                      disabled={updateStatus.isPending}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Check-in
                    </Button>
                  )}
                  {r.status === 'CHECKED_IN' && (
                    <Button
                      variant="outline"
                      className="flex-1 h-12 text-sm border-green-500/30 text-green-400"
                      onClick={() =>
                        updateStatus.mutate({
                          restaurantId,
                          reservationId: r.id,
                          status: 'FINISHED',
                        })
                      }
                      disabled={updateStatus.isPending}
                    >
                      Finalizar mesa
                    </Button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
