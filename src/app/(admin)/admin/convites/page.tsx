'use client'

import { useState } from 'react'
import { Mail, Plus, Clock, CheckCircle2, XCircle, RotateCcw, Trash2, Send } from 'lucide-react'
import { api } from '@/trpc/react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const STATUS_STYLE: Record<string, { label: string; color: string }> = {
  PENDING:  { label: 'Pendente',  color: 'bg-amber-500/20 text-amber-300'  },
  USED:     { label: 'Aceito',    color: 'bg-green-500/20 text-green-300'  },
  EXPIRED:  { label: 'Expirado',  color: 'bg-zinc-700 text-zinc-400'       },
  REVOKED:  { label: 'Revogado',  color: 'bg-red-500/20 text-red-400'      },
}

export default function ConvitesAdminPage() {
  const utils = api.useUtils()
  const [form, setForm] = useState({ email: '', restaurantName: '', notes: '' })
  const [showForm, setShowForm] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'USED' | 'EXPIRED' | 'REVOKED'>('ALL')

  const { data, isLoading } = api.admin.listInvitations.useQuery({ status: statusFilter })
  const invitations = data?.items ?? []

  const create = api.admin.createInvitation.useMutation({
    onSuccess: (inv) => {
      utils.admin.listInvitations.invalidate()
      utils.admin.getStats.invalidate()
      if (inv.emailSent) {
        toast.success('Convite criado e e-mail enviado!')
      } else {
        toast.warning('Convite criado, mas o e-mail não pôde ser enviado. Copie o link manualmente.', {
          duration: 6000,
        })
      }
      setForm({ email: '', restaurantName: '', notes: '' })
      setShowForm(false)
    },
    onError: (e) => toast.error(e.message),
  })

  const revoke = api.admin.revokeInvitation.useMutation({
    onSuccess: () => { utils.admin.listInvitations.invalidate(); toast.success('Convite revogado') },
    onError: (e) => toast.error(e.message),
  })

  const resend = api.admin.resendInvitation.useMutation({
    onSuccess: (inv) => {
      utils.admin.listInvitations.invalidate()
      if (inv.emailSent) {
        toast.success('Convite reenviado e e-mail enviado!')
      } else {
        toast.warning('Convite atualizado, mas o e-mail não pôde ser enviado. Copie o link manualmente.', {
          duration: 6000,
        })
      }
    },
    onError: (e) => toast.error(e.message),
  })

  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <div className="p-8 max-w-4xl mx-auto">

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Convites</h1>
          <p className="text-zinc-500 text-sm mt-1">Onboarding de novos parceiros</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg text-sm font-semibold hover:bg-zinc-100 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo convite
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 mb-6">
          <h2 className="text-[15px] font-semibold mb-4">Criar convite</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-zinc-500 block mb-1">E-mail do parceiro *</label>
                <input
                  type="email"
                  placeholder="contato@restaurante.com.br"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 focus:border-zinc-500 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-500 block mb-1">Nome do restaurante *</label>
                <input
                  type="text"
                  placeholder="Restaurante Bela Vista"
                  value={form.restaurantName}
                  onChange={e => setForm(p => ({ ...p, restaurantName: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 focus:border-zinc-500 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] text-zinc-500 block mb-1">Mensagem personalizada (opcional)</label>
              <input
                type="text"
                placeholder="Ex: Bem-vindo à nossa rede de parceiros!"
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 focus:border-zinc-500 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none transition-colors"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => create.mutate({ email: form.email, restaurantName: form.restaurantName, notes: form.notes || undefined })}
                disabled={create.isPending || !form.email || !form.restaurantName}
                className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" />
                {create.isPending ? 'Enviando...' : 'Criar e enviar convite'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-4 flex-wrap">
        {(['ALL', 'PENDING', 'USED', 'EXPIRED', 'REVOKED'] as const).map(s => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={cn(
              'px-3 py-1 rounded-full text-[11px] font-medium transition-colors',
              statusFilter === s
                ? 'bg-white text-black'
                : 'bg-zinc-800 text-zinc-400 hover:text-white'
            )}
          >
            {s === 'ALL' ? 'Todos' : STATUS_STYLE[s]?.label ?? s}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {invitations.map((inv: { id: string; email: string; restaurantName: string; token: string; status: string; expiresAt: Date; usedAt: Date | null; notes: string | null; createdAt: Date }) => {
            const isExpiredByDate = inv.expiresAt <= new Date()
            const effectiveStatus = isExpiredByDate && inv.status === 'PENDING' ? 'EXPIRED' : inv.status
            const style = STATUS_STYLE[effectiveStatus] ?? STATUS_STYLE.EXPIRED
            const inviteUrl = `${appUrl}/convite/${inv.token}`

            return (
              <div key={inv.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4 text-zinc-400" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="text-[14px] font-medium">{inv.restaurantName}</p>
                      <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium', style.color)}>
                        {style.label}
                      </span>
                    </div>
                    <p className="text-[12px] text-zinc-400">{inv.email}</p>
                    {inv.notes && <p className="text-[11px] text-zinc-600 mt-0.5">"{inv.notes}"</p>}
                    <div className="flex items-center gap-3 mt-1.5">
                      <p className="text-[11px] text-zinc-600">
                        <Clock className="w-3 h-3 inline mr-1" />
                        Criado {format(new Date(inv.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                      {effectiveStatus === 'PENDING' && (
                        <p className="text-[11px] text-zinc-600">
                          Expira {format(new Date(inv.expiresAt), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      )}
                      {effectiveStatus === 'USED' && inv.usedAt && (
                        <p className="text-[11px] text-green-600">
                          <CheckCircle2 className="w-3 h-3 inline mr-1" />
                          Aceito em {format(new Date(inv.usedAt), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      )}
                    </div>
                    {effectiveStatus === 'PENDING' && (
                      <button
                        onClick={() => { navigator.clipboard.writeText(inviteUrl); toast.success('Link copiado!') }}
                        className="text-[11px] text-zinc-500 hover:text-zinc-300 mt-1 transition-colors underline"
                      >
                        Copiar link do convite
                      </button>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {(effectiveStatus === 'PENDING' || effectiveStatus === 'EXPIRED') && (
                      <button
                        onClick={() => resend.mutate({ invitationId: inv.id })}
                        disabled={resend.isPending}
                        className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"
                        title="Reenviar convite"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                    {effectiveStatus === 'PENDING' && (
                      <button
                        onClick={() => revoke.mutate({ invitationId: inv.id })}
                        disabled={revoke.isPending}
                        className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-red-400 transition-colors"
                        title="Revogar convite"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {invitations.length === 0 && (
            <div className="text-center py-16 text-zinc-600">
              <Mail className="w-8 h-8 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Nenhum convite criado ainda.</p>
              <button onClick={() => setShowForm(true)} className="text-sm text-zinc-400 underline mt-2 hover:text-white">
                Criar primeiro convite
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
