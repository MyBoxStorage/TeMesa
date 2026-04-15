'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/common/empty-state'
import { ShiftForm } from '@/components/configuracoes/shift-form'
import { api } from '@/trpc/react'
import { toast } from 'sonner'
import type { Shift } from '@prisma/client'

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export function ConfigTurnos({ restaurantId }: { restaurantId: string }) {
  const [formOpen, setFormOpen]       = useState(false)
  const [editShift, setEditShift]     = useState<Shift | null>(null)

  const { data: shifts, isLoading } = api.shifts.list.useQuery({ restaurantId })
  const utils = api.useUtils()

  const del = api.shifts.delete.useMutation({
    onSuccess: () => {
      utils.shifts.list.invalidate()
      toast.success('Turno removido')
    },
    onError: (e) => toast.error(e.message),
  })

  function handleEdit(shift: Shift) {
    setEditShift(shift)
    setFormOpen(true)
  }

  function handleClose() {
    setFormOpen(false)
    setEditShift(null)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold">Turnos</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Configure os horários de atendimento. O widget só mostra datas com turno ativo.
          </p>
        </div>
        <Button
          size="sm"
          className="h-8 text-[12px] gap-1.5"
          onClick={() => { setEditShift(null); setFormOpen(true) }}
        >
          <Plus className="w-3.5 h-3.5" />
          Novo turno
        </Button>
      </div>

      {isLoading ? (
        <p className="text-[12px] text-muted-foreground">Carregando...</p>
      ) : shifts?.length === 0 ? (
        <EmptyState
          title="Nenhum turno configurado"
          description="Sem turnos ativos o widget exibe 'Sem disponibilidade' para qualquer data."
          action={
            <Button size="sm" variant="outline" onClick={() => setFormOpen(true)}>
              Criar primeiro turno
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {shifts?.map((shift) => (
            <div
              key={shift.id}
              className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <p className="text-[13px] font-semibold">{shift.name}</p>
                  {!shift.isActive && (
                    <Badge variant="secondary" className="text-[10px] h-4">Inativo</Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-[12px] text-muted-foreground">
                  <span>{shift.startTime} – {shift.endTime}</span>
                  {shift.maxCapacity && (
                    <span>{shift.maxCapacity} pessoas máx.</span>
                  )}
                  <span>{shift.turnDuration ?? 90} min/mesa</span>
                </div>
                <div className="flex gap-1 mt-2">
                  {(shift.daysOfWeek as number[])?.map((d) => (
                    <span
                      key={d}
                      className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-medium"
                    >
                      {DAYS[d]}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex gap-1">
                <Button
                  size="icon" variant="ghost" className="h-7 w-7"
                  onClick={() => handleEdit(shift as Shift)}
                  title="Editar turno"
                >
                  <Pencil className="w-3 h-3" />
                </Button>
                <Button
                  size="icon" variant="ghost"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => del.mutate({ restaurantId, shiftId: shift.id })}
                  disabled={del.isPending}
                  title="Remover turno"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ShiftForm
        open={formOpen}
        onClose={handleClose}
        restaurantId={restaurantId}
        editShift={editShift}
      />
    </div>
  )
}
