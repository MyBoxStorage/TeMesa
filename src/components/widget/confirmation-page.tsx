'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CheckCircle2, XCircle, Clock, AlertCircle, Loader2 } from 'lucide-react'
import { api } from '@/trpc/react'
import { toast } from 'sonner'

type PageState =
  | 'idle'
  | 'confirmed'
  | 'cancelled'
  | 'expired'
  | 'not_found'
  | 'waitlist_idle'
  | 'waitlist_waiting'

function getInitialState(
  reservation: Record<string, unknown> | null | undefined,
  waitlistEntry: Record<string, unknown> | null | undefined,
): PageState {
  if (!reservation && !waitlistEntry) return 'not_found'

  if (waitlistEntry) {
    const now = new Date()
    const status = waitlistEntry.status as string
    const deadline = waitlistEntry.responseDeadline
      ? new Date(waitlistEntry.responseDeadline as string)
      : null

    if (status === 'EXPIRED') return 'expired'
    if (status === 'NOTIFIED' && deadline && deadline < now) return 'expired'
    if (status === 'DECLINED') return 'cancelled'
    if (status === 'CONFIRMED') return 'confirmed'
    if (status === 'WAITING') return 'waitlist_waiting'
    if (status === 'NOTIFIED') return 'waitlist_idle'
    return 'expired'
  }

  if (!reservation) return 'not_found'

  if (
    reservation.confirmTokenExpiresAt &&
    new Date(reservation.confirmTokenExpiresAt as string) < new Date()
  ) {
    return 'expired'
  }
  if (reservation.status === 'CANCELLED') return 'cancelled'
  if (['CHECKED_IN', 'FINISHED'].includes(reservation.status as string)) return 'confirmed'
  return 'idle'
}

interface Props {
  token: string
  reservation: Record<string, unknown> | null | undefined
  waitlistEntry: Record<string, unknown> | null | undefined
  restaurant: Record<string, unknown> | null | undefined
  urlIntent?: 'cancel' | null
}

export function ConfirmationPage({ token, reservation, waitlistEntry, restaurant, urlIntent }: Props) {
  const [state, setState] = useState<PageState>(() => getInitialState(reservation, waitlistEntry))

  const confirm = api.reservations.confirmByToken.useMutation({
    onSuccess: () => setState('confirmed'),
    onError: (e) => {
      if (e.message.includes('expirado')) setState('expired')
      else toast.error(e.message)
    },
  })

  const cancel = api.reservations.cancelByToken.useMutation({
    onSuccess: () => setState('cancelled'),
    onError: (e) => toast.error(e.message),
  })

  const confirmWaitlist = api.waitlist.confirmFromWaitlist.useMutation({
    onSuccess: () => setState('confirmed'),
    onError: (e) => {
      if (e.message.includes('expirado') || e.message.includes('Prazo')) setState('expired')
      else toast.error(e.message)
    },
  })

  const declineWaitlist = api.waitlist.declineFromWaitlist.useMutation({
    onSuccess: () => setState('cancelled'),
    onError: (e) => toast.error(e.message),
  })

  const primary =
    (restaurant?.themeConfig as { primaryColor?: string } | undefined)?.primaryColor ??
    (reservation?.restaurant as { themeConfig?: { primaryColor?: string } } | undefined)?.themeConfig
      ?.primaryColor ??
    '#000000'
  const name = (restaurant?.name as string) ?? 'Restaurante'
  const phone = restaurant?.phone as string | undefined

  const date = reservation?.date
    ? new Date(reservation.date as string)
    : waitlistEntry?.date
      ? new Date(waitlistEntry.date as string)
      : null
  const dateStr = date ? format(date, "EEEE, dd 'de' MMMM", { locale: ptBR }) : ''
  const timeStr = date ? format(date, 'HH:mm') : ''

  const isLoading =
    confirm.isPending || cancel.isPending || confirmWaitlist.isPending || declineWaitlist.isPending

  const waitDeadline = waitlistEntry?.responseDeadline
    ? format(new Date(waitlistEntry.responseDeadline as string), 'HH:mm', { locale: ptBR })
    : null

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-950">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          {restaurant?.logoUrl ? (
            <img
              src={restaurant.logoUrl as string}
              alt={name}
              className="w-10 h-10 rounded-full mx-auto mb-2 object-cover"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: primary }}
            >
              {name[0]}
            </div>
          )}
          <p className="text-[13px] font-semibold text-white">{name}</p>
        </div>

        <motion.div
          key={state}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden"
        >
          {/* ── Reserva: aguardando ação ── */}
          {state === 'idle' && reservation && (
            <div className="p-6 space-y-5">
              <div className="text-center">
                <p className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium mb-2">Sua reserva</p>
                <h2 className="text-[18px] font-bold text-white mb-1">{reservation?.guestName as string}</h2>
              </div>

              <div className="space-y-2 bg-zinc-800/60 rounded-xl p-4">
                {[
                  { icon: '📅', label: dateStr },
                  { icon: '⏰', label: `${timeStr} (± 2h)` },
                  { icon: '👥', label: `${reservation?.partySize} pessoas` },
                  (reservation?.table as { area?: string; name?: string } | undefined) && {
                    icon: '🪑',
                    label:
                      (reservation.table as { area?: string; name?: string }).area ??
                      (reservation.table as { name?: string }).name,
                  },
                ]
                  .filter(Boolean)
                  .map((item, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-[13px] text-zinc-300">
                      <span className="text-[16px]">{(item as { icon: string }).icon}</span>
                      {(item as { label: string }).label}
                    </div>
                  ))}
              </div>

              <p className="text-[11px] text-zinc-500 text-center">Confirme até 1 hora antes do horário da reserva</p>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => confirm.mutate({ token })}
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl font-bold text-[14px] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: primary }}
                >
                  {confirm.isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Confirmando...
                    </span>
                  ) : (
                    '✅ Confirmar minha presença'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => cancel.mutate({ token })}
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl font-medium text-[13px] text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                >
                  ❌ Cancelar reserva
                </button>
              </div>
            </div>
          )}

          {/* ── Waitlist: convite ativo ── */}
          {state === 'waitlist_idle' && waitlistEntry && (
            <div className="p-6 space-y-5">
              <div className="text-center">
                <p className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium mb-2">
                  Mesa disponível
                </p>
                <h2 className="text-[18px] font-bold text-white mb-1">{waitlistEntry.guestName as string}</h2>
              </div>

              <div className="space-y-2 bg-zinc-800/60 rounded-xl p-4">
                <div className="flex items-center gap-2.5 text-[13px] text-zinc-300">
                  <span className="text-[16px]">📅</span>
                  {dateStr}
                </div>
                <div className="flex items-center gap-2.5 text-[13px] text-zinc-300">
                  <span className="text-[16px]">👥</span>
                  {waitlistEntry.partySize as number} pessoas
                </div>
                {waitDeadline && (
                  <div className="flex items-center gap-2.5 text-[13px] text-amber-300/90">
                    <span className="text-[16px]">⏱️</span>
                    Responda até às {waitDeadline}
                  </div>
                )}
              </div>

              {urlIntent === 'cancel' && (
                <p className="text-[11px] text-zinc-500 text-center">
                  Toque em &quot;Recusar&quot; se não puder comparecer — a vaga passa para a próxima pessoa na fila.
                </p>
              )}

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => confirmWaitlist.mutate({ token })}
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl font-bold text-[14px] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: primary }}
                >
                  {confirmWaitlist.isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Confirmando...
                    </span>
                  ) : (
                    '✅ Confirmar mesa'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => declineWaitlist.mutate({ token })}
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl font-medium text-[13px] text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                >
                  ❌ Recusar / liberar vaga
                </button>
              </div>
            </div>
          )}

          {/* ── Waitlist: ainda na fila (sem convite) ── */}
          {state === 'waitlist_waiting' && (
            <div className="p-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center mx-auto">
                <Clock className="w-7 h-7 text-zinc-400" />
              </div>
              <div>
                <p className="text-[17px] font-bold text-white mb-1">Você está na fila</p>
                <p className="text-[12px] text-zinc-400">
                  Quando uma mesa abrir, enviaremos um link pelo WhatsApp para confirmar em minutos.
                </p>
              </div>
            </div>
          )}

          {/* Confirmed */}
          {state === 'confirmed' && (
            <div className="p-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7 text-green-400" />
              </div>
              <div>
                <p className="text-[17px] font-bold text-white mb-1">
                  {waitlistEntry ? 'Mesa garantida!' : 'Presença confirmada!'}
                </p>
                <p className="text-[12px] text-zinc-400">
                  {waitlistEntry
                    ? `Sua reserva no ${name} está confirmada. Te esperamos!`
                    : `Até logo, ${String(reservation?.guestName ?? '').split(' ')[0]}! Te esperamos às ${timeStr}.`}
                </p>
              </div>
            </div>
          )}

          {/* Cancelled */}
          {state === 'cancelled' && (
            <div className="p-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center mx-auto">
                <XCircle className="w-7 h-7 text-zinc-400" />
              </div>
              <div>
                <p className="text-[17px] font-bold text-white mb-1">
                  {waitlistEntry ? 'Vaga liberada' : 'Reserva cancelada'}
                </p>
                <p className="text-[12px] text-zinc-400">
                  {waitlistEntry
                    ? 'Sem problemas — a mesa pode ir para o próximo da fila.'
                    : `Esperamos vê-lo em breve no ${name}!`}
                </p>
              </div>
              {phone && (
                <a
                  href={`https://wa.me/${phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[12px] text-green-400 hover:text-green-300 transition-colors"
                >
                  💬 Entrar em contato
                </a>
              )}
            </div>
          )}

          {/* Expired */}
          {state === 'expired' && (
            <div className="p-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto">
                <Clock className="w-7 h-7 text-amber-400" />
              </div>
              <div>
                <p className="text-[17px] font-bold text-white mb-1">Prazo esgotado</p>
                <p className="text-[12px] text-zinc-400">Este link não é mais válido.</p>
              </div>
              {phone && (
                <a
                  href={`https://wa.me/${phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-4 py-2 rounded-lg bg-zinc-800 text-[12px] text-white hover:bg-zinc-700 transition-colors"
                >
                  Entrar em contato via WhatsApp
                </a>
              )}
            </div>
          )}

          {/* Not found */}
          {state === 'not_found' && (
            <div className="p-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center mx-auto">
                <AlertCircle className="w-7 h-7 text-zinc-400" />
              </div>
              <div>
                <p className="text-[17px] font-bold text-white mb-1">Link inválido</p>
                <p className="text-[12px] text-zinc-400">Não encontramos reserva ou convite para este link.</p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
