'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { api } from '@/trpc/react'

const EMOJIS = [
  { value: 1, emoji: '😞', label: 'Ruim' },
  { value: 2, emoji: '😐', label: 'Regular' },
  { value: 3, emoji: '🙂', label: 'Bom' },
  { value: 4, emoji: '😀', label: 'Ótimo' },
  { value: 5, emoji: '🤩', label: 'Incrível' },
]

export default function AvaliarPage() {
  const params = useParams()
  const token = typeof params?.token === 'string' ? params.token : ''
  const [rating, setRating] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const { data: reservation, isLoading, isFetched } = api.widget.getReservationByToken.useQuery(
    { token },
    { enabled: !!token, retry: false }
  )

  const submitReview = api.widget.submitReview.useMutation({
    onSuccess: (data) => {
      setSubmitted(true)
      if (rating && rating >= 4 && data.googleReviewUrl) {
        setTimeout(() => {
          window.location.href = data.googleReviewUrl!
        }, 2000)
      }
    },
  })

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white p-6">
        <p className="text-sm text-zinc-400">Link inválido.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
        <p className="text-sm text-zinc-400">Carregando...</p>
      </div>
    )
  }

  if (isFetched && !reservation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white p-6">
        <p className="text-sm text-zinc-400">Reserva não encontrada.</p>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white p-6">
        <div className="text-center space-y-3 max-w-sm">
          <p className="text-4xl">🙏</p>
          <h2 className="text-xl font-bold">Obrigado pela avaliação!</h2>
          {rating && rating >= 4 && reservation?.restaurant?.googlePlaceId && (
            <p className="text-sm text-zinc-400">Redirecionando para o Google Reviews...</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <p className="text-sm text-zinc-400">Como foi sua experiência no</p>
          <h1 className="text-xl font-bold mt-1">{reservation?.restaurant?.name}</h1>
        </div>

        <div className="flex justify-center gap-3">
          {EMOJIS.map((e) => (
            <button
              key={e.value}
              type="button"
              onClick={() => setRating(e.value)}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
                rating === e.value
                  ? 'bg-white/10 ring-2 ring-white/30 scale-110'
                  : 'hover:bg-white/5'
              }`}
            >
              <span className="text-3xl">{e.emoji}</span>
              <span className="text-[10px] text-zinc-400">{e.label}</span>
            </button>
          ))}
        </div>

        {rating && (
          <div className="space-y-2">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Quer deixar um comentário? (opcional)"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm text-white placeholder:text-zinc-500 resize-none h-20"
            />
            <button
              type="button"
              onClick={() => submitReview.mutate({ token, rating: rating!, comment: comment || undefined })}
              disabled={submitReview.isPending}
              className="w-full py-3 bg-white text-black font-semibold rounded-lg text-sm hover:bg-zinc-200 transition-colors disabled:opacity-50"
            >
              {submitReview.isPending ? 'Enviando...' : 'Enviar avaliação'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
