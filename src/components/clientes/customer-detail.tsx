'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { X, Tag, Phone, Mail, Calendar, Star, Trash2, Save, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { api } from '@/trpc/react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: 'Confirmada', CHECKED_IN: 'Check-in', FINISHED: 'Finalizada',
  NO_SHOW: 'No-show', CANCELLED: 'Cancelada', PENDING: 'Pendente', PENDING_PAYMENT: 'Aguard. pag.',
}
const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: 'bg-blue-500/15 text-blue-300', CHECKED_IN: 'bg-violet-500/15 text-violet-300',
  FINISHED: 'bg-green-500/15 text-green-300', NO_SHOW: 'bg-red-500/15 text-red-300',
  CANCELLED: 'bg-zinc-500/15 text-zinc-400', PENDING: 'bg-amber-500/15 text-amber-300',
  PENDING_PAYMENT: 'bg-amber-500/15 text-amber-300',
}

interface Props { customerId: string; restaurantId: string; onClose: () => void }

export function CustomerDetail({ customerId, restaurantId, onClose }: Props) {
  const { data: customer, isLoading } = api.customers.getById.useQuery({ restaurantId, customerId })
  const utils = api.useUtils()

  const [tagInput, setTagInput] = useState('')
  const [editTags, setEditTags] = useState<string[] | null>(null)
  const [editNotes, setEditNotes] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const update = api.customers.update.useMutation({
    onSuccess: () => { utils.customers.getById.invalidate(); utils.customers.list.invalidate(); toast.success('Cliente atualizado!') },
    onError: (e) => toast.error(e.message),
  })
  const deleteData = api.customers.deleteData.useMutation({
    onSuccess: () => { utils.customers.list.invalidate(); toast.success('Dados anonimizados (LGPD)'); onClose() },
    onError: (e) => toast.error(e.message),
  })

  const tags = editTags ?? customer?.tags ?? []
  const notes = editNotes ?? customer?.notes ?? ''
  const score = Math.round(customer?.reliabilityScore ?? 100)
  const scoreColor = score >= 90 ? 'text-green-400' : score >= 70 ? 'text-blue-400' : score >= 50 ? 'text-amber-400' : 'text-red-400'

  const addTag = () => {
    const t = tagInput.trim()
    if (!t || tags.includes(t)) return
    setEditTags([...tags, t])
    setTagInput('')
  }

  const removeTag = (t: string) => setEditTags(tags.filter(x => x !== t))

  const save = () => {
    if (!customer) return
    update.mutate({ restaurantId, customerId, tags: editTags ?? undefined, notes: editNotes ?? undefined })
    setEditTags(null); setEditNotes(null)
  }

  const isDirty = editTags !== null || editNotes !== null

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-[14px] font-bold text-primary">
              {isLoading ? '?' : customer?.name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()}
            </div>
            <div>
              <p className="text-[14px] font-semibold">{customer?.name ?? '...'}</p>
              <span className={cn('text-[12px] font-bold', scoreColor)}>Score {score}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>

        {isLoading ? <div className="h-40 flex items-center justify-center"><div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin" /></div> : customer && (
          <div className="p-5 space-y-5">

            {/* Contato */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground"><Phone className="w-3.5 h-3.5 shrink-0" />{customer.phone}</div>
              {customer.email && <div className="flex items-center gap-2 text-[12px] text-muted-foreground"><Mail className="w-3.5 h-3.5 shrink-0" />{customer.email}</div>}
              {customer.birthdate && <div className="flex items-center gap-2 text-[12px] text-muted-foreground"><Calendar className="w-3.5 h-3.5 shrink-0" />{format(new Date(customer.birthdate), 'dd/MM/yyyy')}</div>}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              {[['Visitas', customer.visitCount], ['No-shows', customer.noShowCount], ['Reservas', customer.reservations?.length ?? 0]].map(([l, v]) => (
                <div key={String(l)} className="bg-muted/30 rounded-lg p-3 text-center">
                  <p className="text-[18px] font-bold">{v}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{l}</p>
                </div>
              ))}
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label className="text-[12px] flex items-center gap-1.5"><Tag className="w-3 h-3" /> Tags</Label>
              <div className="flex flex-wrap gap-1.5 min-h-6">
                {tags.map(t => (
                  <Badge key={t} variant="secondary" className="text-[11px] gap-1 cursor-pointer" onClick={() => removeTag(t)}>
                    {t} <X className="w-2.5 h-2.5" />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input placeholder="Nova tag..." value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} className="h-8 text-[12px] flex-1" />
                <Button variant="outline" size="sm" className="h-8 text-[11px]" onClick={addTag}>Adicionar</Button>
              </div>
            </div>

            {/* Notas */}
            <div className="space-y-1.5">
              <Label className="text-[12px]">Notas internas</Label>
              <textarea className="w-full bg-muted/30 border border-border rounded-lg p-2.5 text-[12px] text-foreground placeholder-muted-foreground outline-none focus:ring-1 focus:ring-primary/50 resize-none"
                rows={3} placeholder="Preferências, observações..." value={notes}
                onChange={e => setEditNotes(e.target.value)} />
            </div>

            {isDirty && (
              <Button className="w-full h-8 text-[12px] gap-1.5" onClick={save} disabled={update.isPending}>
                <Save className="w-3.5 h-3.5" />{update.isPending ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            )}

            {/* Histórico de reservas */}
            {customer.reservations && customer.reservations.length > 0 && (
              <div className="space-y-2">
                <p className="text-[12px] font-medium">Histórico de reservas</p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {customer.reservations.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between p-2.5 bg-muted/20 rounded-lg">
                      <div>
                        <p className="text-[12px] font-medium">{format(new Date(r.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                        <p className="text-[11px] text-muted-foreground">{r.partySize} pessoa{r.partySize > 1 ? 's' : ''}</p>
                      </div>
                      <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[r.status] ?? 'bg-muted text-muted-foreground')}>{STATUS_LABELS[r.status] ?? r.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* LGPD */}
            <div className="border-t border-border pt-4">
              {!confirmDelete ? (
                <Button variant="ghost" size="sm" className="h-7 text-[11px] text-red-400 hover:text-red-300 gap-1.5" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="w-3 h-3" /> Anonimizar dados (LGPD)
                </Button>
              ) : (
                <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <p className="text-[11px] text-red-300 flex-1">Confirma anonimização? Ação irreversível.</p>
                  <Button variant="destructive" size="sm" className="h-7 text-[11px]" onClick={() => deleteData.mutate({ restaurantId, customerId })} disabled={deleteData.isPending}>Confirmar</Button>
                  <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => setConfirmDelete(false)}>Cancelar</Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
