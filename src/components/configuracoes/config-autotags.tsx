'use client'

import { Plus, Trash2, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/common/empty-state'
import { api } from '@/trpc/react'
import { toast } from 'sonner'

const OPERATORS: Record<string, string> = {
  gte: '≥', lte: '≤', eq: '=', contains: 'contém',
}

export function ConfigAutoTags({ restaurantId }: { restaurantId: string }) {
  const { data: tags, isLoading } = api.autoTags.list.useQuery({ restaurantId })
  const utils = api.useUtils()

  // tRPC usa 'delete' como nome de método — acesso via colchetes para evitar conflito
  const removeTag = api.autoTags['delete'].useMutation({
    onSuccess: () => { utils.autoTags.list.invalidate(); toast.success('Tag removida') },
    onError: (e) => toast.error(e.message),
  })

  const runAll = api.autoTags.runAll.useMutation({
    onSuccess: (r) => toast.success(`Auto-tags aplicadas a ${r.customers} clientes!`),
    onError: (e) => toast.error(e.message),
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold">Auto-Tags</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Tags aplicadas automaticamente com base no comportamento do cliente.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm" variant="outline" className="h-8 text-[12px] gap-1.5"
            onClick={() => runAll.mutate({ restaurantId })}
            disabled={runAll.isPending}
          >
            <Zap className="w-3.5 h-3.5" />
            {runAll.isPending ? 'Aplicando...' : 'Aplicar tudo'}
          </Button>
          <Button size="sm" className="h-8 text-[12px] gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            Nova tag
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-[12px] text-muted-foreground">Carregando...</p>
      ) : tags?.length === 0 ? (
        <EmptyState
          icon={<Zap className="w-4 h-4" />}
          title="Nenhuma auto-tag"
          description="Crie regras para etiquetar clientes automaticamente."
        />
      ) : (
        <div className="space-y-2">
          {tags?.map(tag => {
            const conditions = tag.conditions as any[]
            return (
              <div key={tag.id} className="flex items-start gap-4 p-4 bg-card border border-border rounded-xl">
                <div
                  className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
                  style={{ backgroundColor: tag.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="px-2 py-0.5 rounded-full text-[11px] font-medium text-white"
                      style={{ backgroundColor: tag.color }}
                    >
                      {tag.name}
                    </span>
                    {!tag.isActive && (
                      <Badge variant="secondary" className="text-[10px] h-4">Inativo</Badge>
                    )}
                  </div>
                  <div className="space-y-1">
                    {conditions?.map((c: any, i: number) => (
                      <p key={i} className="text-[11px] text-muted-foreground">
                        {i > 0 && (
                          <span className="text-[10px] font-semibold text-foreground/40 mr-1">E</span>
                        )}
                        <span className="font-medium text-foreground/70">{c.field}</span>
                        {' '}{OPERATORS[c.operator] ?? c.operator}{' '}
                        <span className="font-medium text-foreground/70">{String(c.value)}</span>
                      </p>
                    ))}
                  </div>
                </div>
                <Button
                  size="icon" variant="ghost"
                  className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                  onClick={() => removeTag.mutate({ restaurantId, autoTagId: tag.id })}
                  disabled={removeTag.isPending}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
