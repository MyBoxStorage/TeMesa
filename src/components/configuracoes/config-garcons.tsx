'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/common/empty-state'
import { ServerCreateModal } from '@/components/garcons/server-create-modal'
import { api, type RouterOutputs } from '@/trpc/react'
import { toast } from 'sonner'

type ServerItem = RouterOutputs['servers']['list'][number]

export function ConfigGarcons({ restaurantId }: { restaurantId: string }) {
  const [createOpen, setCreateOpen] = useState(false)
  const { data: servers, isLoading } = api.servers.list.useQuery({ restaurantId })
  const utils = api.useUtils()

  const deactivate = api.servers.update.useMutation({
    onSuccess: async () => {
      await utils.servers.list.invalidate()
      toast.success('Garçom desativado')
    },
    onError: (e) => toast.error(e.message),
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold">Garçons</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">Gerencie a equipe de atendimento.</p>
        </div>
        <Button size="sm" className="h-8 text-[12px] gap-1.5" onClick={() => setCreateOpen(true)}>
          <Plus className="w-3.5 h-3.5" />
          Novo garçom
        </Button>
      </div>

      <ServerCreateModal restaurantId={restaurantId} open={createOpen} onClose={() => setCreateOpen(false)} />

      {isLoading ? (
        <p className="text-[12px] text-muted-foreground">Carregando...</p>
      ) : servers?.length === 0 ? (
        <EmptyState title="Nenhum garçom" description="Adicione garçons para organizar o atendimento." />
      ) : (
        <div className="space-y-2">
          {servers?.map((s: ServerItem) => (
            <div key={s.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-[12px] font-bold shrink-0">
                {s.name[0].toUpperCase()}
              </div>
              <span className="flex-1 text-[13px] font-medium">{s.name}</span>
              {s.isActive
                ? <Badge className="status-available text-[10px] h-4 px-1.5">Ativo</Badge>
                : <Badge variant="secondary" className="text-[10px] h-4 px-1.5">Inativo</Badge>
              }
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => deactivate.mutate({ restaurantId, serverId: s.id, isActive: false })}
                disabled={deactivate.isPending}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
