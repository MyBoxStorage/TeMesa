'use client'

import { useState } from 'react'

import { trpc } from '@/trpc/react'

export function ConfirmClient(props: { token: string }) {
  const utils = trpc.useUtils()

  const getQuery = trpc.reservations.getByToken.useQuery({ token: props.token })
  const confirm = trpc.reservations.confirmByToken.useMutation({
    onSuccess: async () => {
      await utils.reservations.getByToken.invalidate({ token: props.token })
    },
  })
  const cancel = trpc.reservations.cancelByToken.useMutation({
    onSuccess: async () => {
      await utils.reservations.getByToken.invalidate({ token: props.token })
    },
  })

  const [message, setMessage] = useState<string | null>(null)

  return (
    <div className="mx-auto max-w-xl space-y-4 p-8">
      <h1 className="text-2xl font-semibold">Confirmar / cancelar reserva</h1>

      {getQuery.isLoading ? <p className="text-sm text-zinc-600">Carregando…</p> : null}
      {getQuery.error ? (
        <p className="text-sm text-red-600">Não foi possível carregar esta reserva.</p>
      ) : null}

      {getQuery.data ? (
        <div className="rounded-md border p-4 text-sm">
          <div>
            <span className="font-medium">Restaurante:</span> {getQuery.data.restaurant.name}
          </div>
          <div>
            <span className="font-medium">Convidado:</span> {getQuery.data.reservation.guestName}
          </div>
          <div>
            <span className="font-medium">Data:</span> {new Date(getQuery.data.reservation.date).toLocaleString('pt-BR')}
          </div>
        </div>
      ) : null}

      {message ? <p className="text-sm text-zinc-700">{message}</p> : null}

      <div className="flex gap-3">
        <button
          className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
          disabled={confirm.isPending || cancel.isPending}
          onClick={async () => {
            setMessage(null)
            await confirm.mutateAsync({ token: props.token })
            setMessage('Reserva confirmada.')
          }}
        >
          Confirmar
        </button>
        <button
          className="rounded-md border px-4 py-2 disabled:opacity-50"
          disabled={confirm.isPending || cancel.isPending}
          onClick={async () => {
            setMessage(null)
            await cancel.mutateAsync({ token: props.token })
            setMessage('Reserva cancelada.')
          }}
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
