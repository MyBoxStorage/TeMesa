'use client'

import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  X, Users, MapPin, Clock, Phone, Mail, MessageSquare,
  CheckCircle, XCircle, AlertTriangle, LogIn, Flag,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ReservationStatusBadge } from '@/components/common/status-badges'
import { api } from '@/trpc/react'
import { toast } from 'sonner'
import type { Reservation, Customer, Table, Shift, Server, ReservationStatus } from '@prisma/client'
import { cn } from '@/lib/utils'

const ORIGIN_LABELS: Record<string, string> = {
  LOCAL:       '📍 Morador local',
  TOURIST:     '✈️ Turista',
  SEASON:      '☀️ Temporada',
  SECOND_HOME: '🏠 Casa de veraneio',
}

const FREQUENCY_LABELS: Record<string, string> = {
  WEEKLY:     '🔥 Toda semana',
  BIWEEKLY:   '📅 Quinzenal',
  MONTHLY:    '🗓️ Mensal',
  RARELY:     '🕐 Raramente',
  FIRST_TIME: '⭐ Primeira vez',
}

const CONSUMPTION_LABELS: Record<string, string> = {
  CHOPP:    'Chopp',
  LONGNECK: 'Long Neck',
  DRINKS:   'Drinks',
  WHISKY:   'Whisky',
  VINHO:    'Vinho',
  PETISCOS: 'Petiscos',
  PRATOS:   'Pratos',
  COMBO:    'Combo completo',
}

const REFERRAL_LABELS: Record<string, string> = {
  INSTAGRAM: '📸 Instagram',
  GOOGLE:    '🔍 Google',
  REFERRAL:  '👥 Indicação',
  WALK_BY:   '🚶 Passou na frente',
  SOCIAL:    '📱 Outra rede social',
  OTHER:     '💬 Outro',
}

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

  const avatarColors = [
    'from-blue-600 to-blue-800', 'from-emerald-600 to-emerald-800', 'from-violet-600 to-violet-800',
    'from-rose-600 to-rose-800', 'from-amber-600 to-amber-800', 'from-teal-600 to-teal-800', 'from-indigo-600 to-indigo-800',
  ]
  const avatarGrad = avatarColors[reservation.guestName.charCodeAt(0) % avatarColors.length]

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Hero header */}
      <div className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/12 via-background to-background pointer-events-none" />
        <div className="relative px-5 pt-4 pb-4">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className={cn(
                'w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center text-lg font-bold text-white shrink-0 shadow-md',
                avatarGrad,
              )}>
                {initials}
              </div>
              <div className="min-w-0">
                <h2 className="text-[18px] font-bold tracking-tight truncate">{reservation.guestName}</h2>
                <div className="mt-1.5">
                  <ReservationStatusBadge status={reservation.status} />
                </div>
              </div>
            </div>
            <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0 rounded-xl" onClick={onClose} aria-label="Fechar">
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              {time}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 shrink-0" />
              {reservation.partySize} pessoas
            </span>
            {reservation.table && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                {reservation.table.area || reservation.table.name}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-3 mt-3">
            <a
              href={`tel:${reservation.guestPhone}`}
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-primary hover:underline"
            >
              <Phone className="w-3.5 h-3.5" />
              {reservation.guestPhone}
            </a>
            {reservation.guestEmail && (
              <a
                href={`mailto:${reservation.guestEmail}`}
                className="inline-flex items-center gap-1.5 text-[12px] font-medium text-primary hover:underline truncate max-w-full"
              >
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{reservation.guestEmail}</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── Barra de ações contextuais ──────────────────────────────────── */}
      {(() => {
        const actions: Array<{
          label: string
          status: ReservationStatus
          variant: 'default' | 'destructive' | 'outline'
          className?: string
        }> = []

        if (reservation.status === 'PENDING' || reservation.status === 'PENDING_PAYMENT') {
          actions.push(
            { label: 'Confirmar', status: 'CONFIRMED', variant: 'default', className: 'bg-blue-600 hover:bg-blue-700 text-white' },
            { label: 'Cancelar', status: 'CANCELLED', variant: 'destructive' },
          )
        } else if (reservation.status === 'CONFIRMED') {
          actions.push(
            { label: 'Check-in', status: 'CHECKED_IN', variant: 'default', className: 'bg-green-600 hover:bg-green-700 text-white' },
            { label: 'Cancelar', status: 'CANCELLED', variant: 'destructive' },
            { label: 'No-show', status: 'NO_SHOW', variant: 'outline', className: 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10' },
          )
        } else if (reservation.status === 'CHECKED_IN') {
          actions.push(
            { label: 'Finalizar', status: 'FINISHED', variant: 'default', className: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
          )
        }

        if (actions.length === 0) return null

        return (
          <div className="flex gap-2 px-5 py-3 border-b border-border bg-muted/10">
            {actions.map((a) => (
              <Button
                key={a.status}
                variant={a.variant}
                size="sm"
                className={cn('flex-1 h-11 gap-1.5 text-[13px] font-semibold', a.className)}
                onClick={() => {
                  if (a.status === 'CANCELLED' || a.status === 'NO_SHOW') {
                    if (!confirm(`Tem certeza que deseja marcar como ${a.label}?`)) return
                  }
                  updateStatus.mutate({
                    restaurantId,
                    reservationId: reservation.id,
                    status: a.status,
                  })
                }}
                disabled={updateStatus.isPending}
              >
                {a.status === 'CONFIRMED' && <CheckCircle className="w-4 h-4" />}
                {a.status === 'CANCELLED' && <XCircle className="w-4 h-4" />}
                {a.status === 'CHECKED_IN' && <LogIn className="w-4 h-4" />}
                {a.status === 'NO_SHOW' && <AlertTriangle className="w-4 h-4" />}
                {a.status === 'FINISHED' && <Flag className="w-4 h-4" />}
                {a.label}
              </Button>
            ))}
          </div>
        )
      })()}

      {/* Tabs */}
      <Tabs defaultValue="guest" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-4 mt-3 h-10 p-1 gap-0.5 rounded-xl bg-muted/50 text-[12px]">
          <TabsTrigger value="guest" className="flex-1 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Hóspede
          </TabsTrigger>
          <TabsTrigger value="reservation" className="flex-1 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Reserva
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Histórico
          </TabsTrigger>
        </TabsList>

        {/* GUEST TAB */}
        <TabsContent value="guest" className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {reservation.customer && (
            <div className="flex flex-wrap gap-1.5">
              {reservation.customer.visitCount > 5 && (
                <Badge variant="secondary" className="text-[10px] h-5 px-2">Cliente frequente</Badge>
              )}
              {reservation.customer.noShowCount > 1 && (
                <Badge variant="destructive" className="text-[10px] h-5 px-2">
                  {reservation.customer.noShowCount} no-shows
                </Badge>
              )}
              {reservation.customer.tags?.slice(0, 6).map(tag => (
                <Badge key={tag} variant="outline" className="text-[10px] h-5 px-2">{tag}</Badge>
              ))}
            </div>
          )}

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

          {/* Perfil do visitante — dados do quiz */}
          {(reservation.originType || reservation.visitFrequency || (reservation.consumptionPreferences as string[])?.length > 0 || reservation.referralSource) && (
            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wide font-semibold">Perfil do visitante</p>
              <div className="bg-muted/30 rounded-lg divide-y divide-border/40">
                {reservation.originType && (
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-[11px] text-muted-foreground">Origem</span>
                    <span className="text-[11px] font-medium">{ORIGIN_LABELS[reservation.originType] ?? reservation.originType}</span>
                  </div>
                )}
                {reservation.visitFrequency && (
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-[11px] text-muted-foreground">Frequência</span>
                    <span className="text-[11px] font-medium">{FREQUENCY_LABELS[reservation.visitFrequency] ?? reservation.visitFrequency}</span>
                  </div>
                )}
                {(reservation.consumptionPreferences as string[])?.filter(p => p !== 'NONE').length > 0 && (
                  <div className="px-3 py-2">
                    <span className="text-[11px] text-muted-foreground block mb-1.5">Costuma pedir</span>
                    <div className="flex flex-wrap gap-1">
                      {(reservation.consumptionPreferences as string[]).filter(p => p !== 'NONE').map(p => (
                        <span key={p} className="text-[10px] px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground">
                          {CONSUMPTION_LABELS[p] ?? p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {reservation.referralSource && (
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-[11px] text-muted-foreground">Como conheceu</span>
                    <span className="text-[11px] font-medium">{REFERRAL_LABELS[reservation.referralSource] ?? reservation.referralSource}</span>
                  </div>
                )}
              </div>
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
              <div key={label} className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0">
                <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
                <span className="text-[13px] font-semibold text-right max-w-[60%] truncate">{value}</span>
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
      <div className="px-4 py-3 border-t border-border bg-background/95 backdrop-blur-sm">
        <div className="flex gap-2 flex-wrap">
          {reservation.status === 'CONFIRMED' && (
            <Button size="sm" className="flex-1 h-11 text-[13px] gap-1.5 font-semibold bg-green-600 hover:bg-green-700 text-white"
              onClick={() => handleStatus('CHECKED_IN')} disabled={updateStatus.isPending}>
              <LogIn className="w-4 h-4" />Check-in
            </Button>
          )}
          {reservation.status === 'CHECKED_IN' && (
            <Button size="sm" className="flex-1 h-11 text-[13px] gap-1.5 font-semibold" variant="secondary"
              onClick={() => handleStatus('FINISHED')} disabled={updateStatus.isPending}>
              <CheckCircle className="w-4 h-4" />Finalizar
            </Button>
          )}
          {reservation.status === 'CONFIRMED' && (
            <Button size="sm" className="h-11 text-[13px] gap-1.5 font-semibold" variant="outline"
              onClick={() => handleStatus('NO_SHOW')} disabled={updateStatus.isPending}>
              <AlertTriangle className="w-4 h-4" />No-show
            </Button>
          )}
          {['PENDING', 'CONFIRMED', 'PENDING_PAYMENT'].includes(reservation.status) && (
            <Button size="sm" className="h-11 text-[13px] gap-1.5 font-semibold" variant="outline"
              onClick={() => handleStatus('CANCELLED')} disabled={updateStatus.isPending}>
              <XCircle className="w-4 h-4" />Cancelar
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
