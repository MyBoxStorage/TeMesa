'use client'

import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  X, Users, MapPin, Clock, Phone, Mail, MessageSquare,
  CheckCircle, XCircle, AlertTriangle, LogIn, Flag, MoreHorizontal,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ReservationStatusBadge } from '@/components/common/status-badges'
import { api } from '@/trpc/react'
import { toast } from 'sonner'
import type { Reservation, Customer, Table, Shift, Server } from '@prisma/client'

const OCCASION_LABELS: Record<string, string> = {
  BIRTHDAY:    '🎂 Aniversário',
  ANNIVERSARY: '💍 Aniversário de Casal',
  BUSINESS:    '💼 Reunião de Negócios',
  DATE:        '💑 Encontro Romântico',
  OTHER:       '🎉 Ocasião Especial',
}

const DIETARY_LABELS: Record<string, string> = {
  VEGETARIAN:  '🥗 Vegetariano',
  VEGAN:       '🌱 Vegano',
  GLUTEN_FREE: '🌾 Sem Glúten',
  LACTOSE:     '🥛 Intolerante a Lactose',
  NUT_ALLERGY: '🥜 Alergia a Amendoim/Nozes',
  HALAL:       '☪️ Halal',
  KOSHER:      '✡️ Kosher',
  OTHER:       '⚠️ Restrição Alimentar',
}

type R = Reservation & {
  customer?: Customer | null
  table?: Table | null
  shift?: Shift | null
  server?: Server | null
}

interface Props {
  reservation: R
  restaurantId: string
  onClose: () => void
}

export function ReservationDetail({ reservation, restaurantId, onClose }: Props) {
  const utils = api.useUtils()
  const updateStatus = api.reservations.updateStatus.useMutation({
    onSuccess: () => {
      utils.reservations.list.invalidate()
      toast.success('Status atualizado')
    },
    onError: (e) => toast.error(e.message),
  })

  const handleStatus = (status: string) => {
    updateStatus.mutate({ restaurantId, reservationId: reservation.id, status: status as any })
  }

  const time = format(new Date(reservation.date), 'HH:mm')
  const dateStr = format(new Date(reservation.date), "EEEE, dd 'de' MMMM", { locale: ptBR })
  const initials = reservation.guestName.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <ReservationStatusBadge status={reservation.status} />
          {reservation.table && (
            <span className="text-[12px] text-muted-foreground">{reservation.table.name}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7">
            <MoreHorizontal className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Quick info bar */}
      <div className="flex items-center gap-4 px-5 py-3 border-b border-border bg-muted/20">
        <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />{time}
        </span>
        <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <Users className="w-3.5 h-3.5" />{reservation.partySize} pessoas
        </span>
        {reservation.table && (
          <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <MapPin className="w-3.5 h-3.5" />{reservation.table.area || reservation.table.name}
          </span>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="guest" className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-3 h-8 text-[12px] bg-muted/40">
          <TabsTrigger value="guest" className="text-[12px]">Hóspede</TabsTrigger>
          <TabsTrigger value="reservation" className="text-[12px]">Reserva</TabsTrigger>
          <TabsTrigger value="history" className="text-[12px]">Histórico</TabsTrigger>
        </TabsList>

        {/* GUEST TAB */}
        <TabsContent value="guest" className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Profile */}
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center text-lg font-bold text-white shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[15px] font-semibold leading-tight mb-1">{reservation.guestName}</h3>
              {reservation.customer && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {reservation.customer.visitCount > 5 && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5">Cliente frequente</Badge>
                  )}
                  {reservation.customer.noShowCount > 1 && (
                    <Badge variant="destructive" className="text-[10px] h-4 px-1.5">
                      {reservation.customer.noShowCount} no-shows
                    </Badge>
                  )}
                  {reservation.customer.tags?.slice(0, 3).map(tag => (
                    <Badge key={tag} variant="outline" className="text-[10px] h-4 px-1.5">{tag}</Badge>
                  ))}
                </div>
              )}
              <div className="space-y-1">
                <a href={`tel:${reservation.guestPhone}`} className="flex items-center gap-2 text-[12px] text-muted-foreground hover:text-foreground transition-colors">
                  <Phone className="w-3 h-3" />{reservation.guestPhone}
                </a>
                {reservation.guestEmail && (
                  <a href={`mailto:${reservation.guestEmail}`} className="flex items-center gap-2 text-[12px] text-muted-foreground hover:text-foreground transition-colors">
                    <Mail className="w-3 h-3" />{reservation.guestEmail}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Customer stats */}
          {reservation.customer && (
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Visitas',   value: reservation.customer.visitCount },
                { label: 'No-shows',  value: reservation.customer.noShowCount },
                { label: 'Score',     value: Math.round(reservation.customer.reliabilityScore) },
              ].map(stat => (
                <div key={stat.label} className="bg-muted/40 rounded-lg p-3 text-center">
                  <p className="text-[18px] font-bold leading-none mb-1">{stat.value}</p>
                  <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Occasion + Dietary + Notes */}
          {(reservation.occasion || reservation.dietaryNotes || reservation.notes) && (
            <div className="space-y-2">
              {reservation.occasion && (
                <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <Flag className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-amber-400/70 uppercase tracking-wide mb-0.5">Ocasião especial</p>
                    <p className="text-[12px] text-amber-300">
                      {OCCASION_LABELS[reservation.occasion] ?? reservation.occasion}
                    </p>
                  </div>
                </div>
              )}
              {reservation.dietaryNotes && (
                <div className="flex items-start gap-2 p-3 bg-muted/40 rounded-lg">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wide mb-0.5">Restrição alimentar</p>
                    <p className="text-[12px] text-muted-foreground">
                      {DIETARY_LABELS[reservation.dietaryNotes] ?? reservation.dietaryNotes}
                    </p>
                  </div>
                </div>
              )}
              {reservation.notes && (
                <div className="flex items-start gap-2 p-3 bg-muted/40 rounded-lg">
                  <MessageSquare className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wide mb-0.5">Observações</p>
                    <p className="text-[12px] text-muted-foreground">{reservation.notes}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* RESERVATION TAB */}
        <TabsContent value="reservation" className="flex-1 overflow-y-auto px-5 py-4">
          <dl className="space-y-3">
            {[
              { label: 'Data',    value: dateStr },
              { label: 'Horário', value: time },
              { label: 'Pessoas', value: `${reservation.partySize} pessoas` },
              { label: 'Mesa',    value: reservation.table?.name ?? '—' },
              { label: 'Turno',   value: reservation.shift?.name ?? '—' },
              { label: 'Garçom',  value: reservation.server?.name ?? '—' },
              { label: 'Origem',  value: reservation.source },
              { label: 'LGPD',    value: reservation.lgpdConsent ? 'Aceito' : 'Não aceito' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-border/40">
                <span className="text-[12px] text-muted-foreground">{label}</span>
                <span className="text-[12px] font-medium">{value}</span>
              </div>
            ))}
          </dl>
        </TabsContent>

        {/* HISTORY TAB */}
        <TabsContent value="history" className="flex-1 overflow-y-auto px-5 py-4">
          <p className="text-[12px] text-muted-foreground">Histórico de alterações</p>
        </TabsContent>
      </Tabs>

      {/* Action buttons */}
      <div className="px-4 py-3 border-t border-border bg-background">
        <div className="flex gap-2 flex-wrap">
          {reservation.status === 'CONFIRMED' && (
            <Button size="sm" className="flex-1 h-8 text-[12px] gap-1.5 bg-green-500 hover:bg-green-600 text-white"
              onClick={() => handleStatus('CHECKED_IN')} disabled={updateStatus.isPending}>
              <LogIn className="w-3.5 h-3.5" />Check-in
            </Button>
          )}
          {reservation.status === 'CHECKED_IN' && (
            <Button size="sm" className="flex-1 h-8 text-[12px] gap-1.5" variant="secondary"
              onClick={() => handleStatus('FINISHED')} disabled={updateStatus.isPending}>
              <CheckCircle className="w-3.5 h-3.5" />Finalizar
            </Button>
          )}
          {reservation.status === 'CONFIRMED' && (
            <Button size="sm" className="h-8 text-[12px] gap-1.5" variant="outline"
              onClick={() => handleStatus('NO_SHOW')} disabled={updateStatus.isPending}>
              <AlertTriangle className="w-3.5 h-3.5" />No-show
            </Button>
          )}
          {['PENDING', 'CONFIRMED', 'PENDING_PAYMENT'].includes(reservation.status) && (
            <Button size="sm" className="h-8 text-[12px] gap-1.5" variant="outline"
              onClick={() => handleStatus('CANCELLED')} disabled={updateStatus.isPending}>
              <XCircle className="w-3.5 h-3.5" />Cancelar
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
