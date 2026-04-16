'use client'

import { useMemo, useState } from 'react'
import { Plus, Trash2, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EmptyState } from '@/components/common/empty-state'
import { api } from '@/trpc/react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const OPERATORS: Record<string, string> = {
  gte: '≥', lte: '≤', eq: '=', contains: 'contém',
}

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ef4444', '#06b6d4', '#ec4899', '#64748b']
const FIELDS = ['visitCount', 'noShowCount', 'reliabilityScore', 'tags'] as const
const OPS = ['gte', 'lte', 'eq', 'contains'] as const

export function ConfigAutoTags({ restaurantId }: { restaurantId: string }) {
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLORS[0]!)
  const [conditions, setConditions] = useState<Array<{ field: string; operator: string; value: string }>>([
    { field: 'visitCount', operator: 'gte', value: '1' },
  ])

  const { data: tags, isLoading } = api.autoTags.list.useQuery({ restaurantId })
  const utils = api.useUtils()

  const createTag = api.autoTags.create.useMutation({
    onSuccess: async () => {
      await utils.autoTags.list.invalidate()
      toast.success('Tag criada!')
      setCreateOpen(false)
    },
    onError: (e) => toast.error(e.message),
  })

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
          <Button size="sm" className="h-8 text-[12px] gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="w-3.5 h-3.5" />
            Nova tag
          </Button>
        </div>
      </div>

      {createOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setCreateOpen(false)}
        >
          <div
            className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-[15px] font-semibold">Nova auto-tag</h3>
                <p className="text-[12px] text-muted-foreground mt-0.5">Crie uma regra e aplique automaticamente.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[12px]">Nome *</Label>
                <Input
                  className="h-9 text-[13px]"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Cliente frequente"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[12px]">Cor</Label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={cn(
                        'w-7 h-7 rounded-full border transition-all',
                        color === c ? 'border-white scale-110' : 'border-border hover:scale-105'
                      )}
                      style={{ backgroundColor: c }}
                      aria-label={`Selecionar cor ${c}`}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[12px]">Condições *</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px]"
                    onClick={() => setConditions((prev) => [...prev, { field: 'visitCount', operator: 'gte', value: '1' }])}
                  >
                    + condição
                  </Button>
                </div>

                <div className="space-y-2">
                  {conditions.map((c, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2">
                      <select
                        className="col-span-4 h-9 bg-muted/30 border border-border rounded-lg px-2 text-[12px] outline-none"
                        value={c.field}
                        onChange={(e) =>
                          setConditions((prev) => prev.map((x, i) => (i === idx ? { ...x, field: e.target.value } : x)))
                        }
                      >
                        {FIELDS.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                      <select
                        className="col-span-3 h-9 bg-muted/30 border border-border rounded-lg px-2 text-[12px] outline-none"
                        value={c.operator}
                        onChange={(e) =>
                          setConditions((prev) => prev.map((x, i) => (i === idx ? { ...x, operator: e.target.value } : x)))
                        }
                      >
                        {OPS.map((op) => (
                          <option key={op} value={op}>
                            {op}
                          </option>
                        ))}
                      </select>
                      <Input
                        className="col-span-4 h-9 text-[13px]"
                        value={c.value}
                        onChange={(e) =>
                          setConditions((prev) => prev.map((x, i) => (i === idx ? { ...x, value: e.target.value } : x)))
                        }
                        placeholder="Valor"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="col-span-1 h-9 text-[12px] text-destructive hover:text-destructive"
                        onClick={() => setConditions((prev) => prev.filter((_, i) => i !== idx))}
                        disabled={conditions.length === 1}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-9 text-[13px]"
                  onClick={() => setCreateOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  className="flex-1 h-9 text-[13px]"
                  disabled={createTag.isPending || name.trim().length < 1 || conditions.length < 1}
                  onClick={() => {
                    createTag.mutate({
                      restaurantId,
                      name: name.trim(),
                      color,
                      conditions: conditions.map((c) => ({
                        field: c.field,
                        operator: c.operator,
                        value: c.value,
                      })) as any,
                    })
                  }}
                >
                  {createTag.isPending ? 'Criando...' : 'Criar'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

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
