'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CheckCircle2, XCircle, Clock, AlertCircle, Loader2 } from 'lucide-react'
import { api } from '@/trpc/react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type PageState = 'idle' | 'confirmed' | 'cancelled' | 'expired' | 'not_found' | 'loading'

interface Props {
  token: string
  reservation: any
  restaurant: any
}

export function ConfirmationPage({ token, reservation, restaurant }: Props) {
  const [state, setState] = useState<PageState>(
    !reservation ? 'not_found' :
    reservation.confirmTokenExpiresAt && new Date(reservation.confirmTokenExpiresAt) < new Date() ? 'expired' :
    reservation.status === 'CANCELLED' ? 'cancelled' :
    ['CHECKED_IN', 'FINISHED'].includes(reservation.status) ? 'confirmed' :
    'idle'
  )

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

  const primary = reservation?.restaurant?.themeConfig?.primaryColor ?? '#000000'
  const name = restaurant?.name ?? 'Restaurante'
  const phone = restaurant?.phone

  const date = reservation?.date ? new Date(reservation.date) : null
  const dateStr = date ? format(date, "EEEE, dd 'de' MMMM", { locale: ptBR }) : ''
  const timeStr = date ? format(date, 'HH:mm') : ''

  const isLoading = confirm.isPending || cancel.isPending

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-950">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-6">
          {restaurant?.logoUrl ? (
            <img src={restaurant.logoUrl} alt={name} className="w-10 h-10 rounded-full mx-auto mb-2 object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: primary }}>
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
          {/* Idle — action required */}
          {state === 'idle' && (
            <div className="p-6 space-y-5">
              <div className="text-center">
                <p className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium mb-2">Sua reserva</p>
                <h2 className="text-[18px] font-bold text-white mb-1">{reservation?.guestName}</h2>
              </div>

              {/* Reservation details */}
              <div className="space-y-2 bg-zinc-800/60 rounded-xl p-4">
                {[
                  { icon: '📅', label: dateStr },
                  { icon: '⏰', label: `${timeStr} (± 2h)` },
                  { icon: '👥', label: `${reservation?.partySize} pessoas` },
                  reservation?.table && { icon: '🪑', label: reservation.table.area ?? reservation.table.name },
                ].filter(Boolean).map((item: any, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-[13px] text-zinc-300">
                    <span className="text-[16px]">{item.icon}</span>
                    {item.label}
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-zinc-500 text-center">
                Confirme até 1 hora antes do horário da reserva
              </p>

              {/* Actions */}
              <div className="space-y-2">
                <button
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
                  ) : '✅ Confirmar minha presença'}
                </button>
                <button
                  onClick={() => cancel.mutate({ token })}
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl font-medium text-[13px] text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                >
                  ❌ Cancelar reserva
                </button>
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
                <p className="text-[17px] font-bold text-white mb-1">Presença confirmada!</p>
                <p className="text-[12px] text-zinc-400">
                  Até logo, {reservation?.guestName?.split(' ')[0]}! Te esperamos às {timeStr}.
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
                <p className="text-[17px] font-bold text-white mb-1">Reserva cancelada</p>
                <p className="text-[12px] text-zinc-400">Esperamos vê-lo em breve no {name}!</p>
              </div>
              {phone && (
                <a
                  href={`https://wa.me/${phone.replace(/\D/g, '')}`}
                  target="_blank" rel="noopener noreferrer"
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
                <p className="text-[17px] font-bold text-white mb-1">Link expirado</p>
                <p className="text-[12px] text-zinc-400">Este link não é mais válido.</p>
              </div>
              {phone && (
                <a
                  href={`https://wa.me/${phone.replace(/\D/g, '')}`}
                  target="_blank" rel="noopener noreferrer"
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
                <p className="text-[17px] font-bold text-white mb-1">Reserva não encontrada</p>
                <p className="text-[12px] text-zinc-400">Link inválido ou reserva não existe.</p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
