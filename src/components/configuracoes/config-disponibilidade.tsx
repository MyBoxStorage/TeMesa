'use client'

import { useState } from 'react'
import { format, parseISO, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Trash2, CalendarX, Plus, Save } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/trpc/react'
import { cn } from '@/lib/utils'

interface Props {
  restaurantId: string
}

export function ConfigDisponibilidade({ restaurantId }: Props) {
  const [newDate, setNewDate] = useState('')

  const { data: blockedDates = [], isLoading, refetch } = api.restaurant.getBlockedDates.useQuery(
    { restaurantId },
    { enabled: !!restaurantId },
  )

  const setBlocked = api.restaurant.setBlockedDates.useMutation({
    onSuccess: () => {
      toast.success('Datas bloqueadas atualizadas.')
      void refetch()
    },
    onError: (e) => toast.error(e.message),
  })

  const today = format(new Date(), 'yyyy-MM-dd')

  function handleAdd() {
    if (!newDate) return
    if (blockedDates.includes(newDate)) {
      toast.warning('Esta data já está bloqueada.')
      return
    }
    const updated = [...blockedDates, newDate].sort()
    setBlocked.mutate({ restaurantId, blockedDates: updated })
    setNewDate('')
  }

  function handleRemove(date: string) {
    const updated = blockedDates.filter((d) => d !== date)
    setBlocked.mutate({ restaurantId, blockedDates: updated })
  }

  function formatDate(iso: string) {
    try {
      const parsed = parseISO(iso)
      if (!isValid(parsed)) return iso
      return format(parsed, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    } catch {
      return iso
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[15px] font-semibold mb-1">Datas bloqueadas</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Datas bloqueadas impedem que o widget público exiba horários disponíveis,
          independentemente dos turnos configurados. Use para feriados, eventos privados
          ou qualquer dia em que o restaurante não receba reservas online.
        </p>
      </div>

      {/* Adicionar nova data */}
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={newDate}
          min={today}
          onChange={(e) => setNewDate(e.target.value)}
          className={cn(
            'flex-1 h-9 rounded-lg border border-input bg-background px-3 text-sm',
            'focus:outline-none focus:ring-2 focus:ring-ring',
          )}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!newDate || setBlocked.isPending}
          className={cn(
            'flex items-center gap-1.5 h-9 px-4 rounded-lg text-sm font-medium',
            'bg-primary text-primary-foreground hover:opacity-90 transition-opacity',
            'disabled:opacity-40 disabled:cursor-not-allowed',
          )}
        >
          <Plus className="w-4 h-4" />
          Adicionar
        </button>
      </div>

      {/* Lista de datas bloqueadas */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : blockedDates.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <CalendarX className="w-8 h-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Nenhuma data bloqueada.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {blockedDates.map((date) => (
            <li
              key={date}
              className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-border bg-muted/20"
            >
              <div className="flex items-center gap-2 text-sm">
                <CalendarX className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="font-medium capitalize">{formatDate(date)}</span>
                <span className="text-muted-foreground text-xs">({date})</span>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(date)}
                disabled={setBlocked.isPending}
                className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
                title="Remover bloqueio"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {setBlocked.isPending && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Save className="w-3 h-3 animate-pulse" />
          Salvando...
        </div>
      )}
    </div>
  )
}

