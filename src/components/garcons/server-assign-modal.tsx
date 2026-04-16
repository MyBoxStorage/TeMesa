'use client'

import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { api } from '@/trpc/react'
import { cn } from '@/lib/utils'

export function ServerAssignModal(props: {
  restaurantId: string
  server: { id: string; name: string } | null
  open: boolean
  onClose: () => void
}) {
  const utils = api.useUtils()
  const { data: tables, isLoading } = api.tables.list.useQuery(
    { restaurantId: props.restaurantId },
    { enabled: props.open }
  )

  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([])

  const assign = api.servers.assignTables.useMutation({
    onSuccess: async () => {
      await utils.servers.getTodayAssignments.invalidate()
      toast.success('Mesas atribuídas!')
      props.onClose()
    },
    onError: (e) => toast.error(e.message),
  })

  const today = useMemo(() => {
    const d = new Date()
    d.setUTCHours(0, 0, 0, 0)
    return d
  }, [])

  useEffect(() => {
    if (props.open) setSelectedTableIds([])
  }, [props.open])

  if (!props.open || !props.server) return null

  const server = props.server

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={props.onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-[15px] font-semibold">Atribuir mesas</h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Garçom: <span className="text-foreground font-medium">{props.server.name}</span>
            </p>
          </div>
          <button
            onClick={props.onClose}
            className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[320px] overflow-y-auto pr-1 space-y-2">
          {isLoading ? (
            <p className="text-[12px] text-muted-foreground">Carregando mesas...</p>
          ) : (tables?.length ?? 0) === 0 ? (
            <p className="text-[12px] text-muted-foreground">Nenhuma mesa cadastrada.</p>
          ) : (
            tables?.map((t) => {
              const checked = selectedTableIds.includes(t.id)
              return (
                <label
                  key={t.id}
                  className={cn(
                    'flex items-center justify-between gap-3 p-3 rounded-xl border cursor-pointer',
                    checked ? 'bg-muted/40 border-border' : 'bg-card border-border hover:bg-muted/20'
                  )}
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium">{t.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Capacidade: {t.capacity}
                      {t.area ? ` • ${t.area}` : ''}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      setSelectedTableIds((prev) =>
                        prev.includes(t.id) ? prev.filter((id) => id !== t.id) : [...prev, t.id]
                      )
                    }}
                    className="h-4 w-4 accent-primary"
                  />
                </label>
              )
            })
          )}
        </div>

        <div className="flex gap-2 pt-5">
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-9 text-[13px]"
            onClick={props.onClose}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className="flex-1 h-9 text-[13px]"
            disabled={assign.isPending || selectedTableIds.length === 0}
            onClick={() =>
              assign.mutate({
                restaurantId: props.restaurantId,
                serverId: server.id,
                tableIds: selectedTableIds,
                date: today,
              })
            }
          >
            {assign.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>
    </div>
  )
}

