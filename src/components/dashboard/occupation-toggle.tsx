'use client'

import { api } from '@/trpc/react'
import { useDashboard } from '@/app/(dashboard)/dashboard/dashboard-ctx'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const OPTIONS = [
  { value: 'OPEN' as const, label: '🟢 Tranquilo', description: 'Várias mesas disponíveis' },
  { value: 'BUSY' as const, label: '🟡 Movimentado', description: 'Últimas mesas disponíveis' },
  { value: 'FULL' as const, label: '🔴 Lotado', description: 'Sem mesas no momento' },
]

export function OccupationToggle() {
  const { restaurantId } = useDashboard()
  const utils = api.useUtils()

  const { data: restaurant } = api.restaurant.getById.useQuery(
    { restaurantId: restaurantId! },
    { enabled: !!restaurantId, refetchInterval: 60_000 },
  )

  const update = api.restaurant.updateOccupationStatus.useMutation({
    onSuccess: () => {
      void utils.restaurant.getById.invalidate()
      toast.success('Status atualizado!')
    },
    onError: (e) => toast.error(e.message),
  })

  const current = (restaurant?.occupationStatus as 'OPEN' | 'BUSY' | 'FULL' | undefined) ?? 'OPEN'

  if (!restaurantId) return null

  return (
    <div className="rounded-xl border border-border bg-card/50 p-4 space-y-2">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        Status do restaurante agora
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => update.mutate({ restaurantId, status: opt.value })}
            disabled={update.isPending}
            className={cn(
              'p-3 rounded-xl border text-left transition-all',
              current === opt.value
                ? 'border-primary/40 bg-primary/10'
                : 'border-border hover:border-border/80 hover:bg-muted/40',
            )}
          >
            <p className="text-sm font-semibold">{opt.label}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{opt.description}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
