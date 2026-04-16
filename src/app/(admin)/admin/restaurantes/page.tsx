'use client'

import { useState, useEffect } from 'react'
import { Building2, Users, Calendar, ToggleLeft, ToggleRight, ChevronDown, Search } from 'lucide-react'
import { api } from '@/trpc/react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Prisma } from '@prisma/client'

type RestaurantListItem = Prisma.RestaurantGetPayload<{
  include: {
    users: {
      include: { user: { select: { id: true; name: true; email: true } } }
      where: { role: 'OWNER' }
    }
    _count: { select: { reservations: true; customers: true } }
  }
}>

const PLANS = ['GRATUITO', 'ESSENCIAL', 'PROFISSIONAL', 'REDE', 'ENTERPRISE'] as const
const PLAN_COLOR: Record<string, string> = {
  GRATUITO:     'bg-zinc-700 text-zinc-300',
  ESSENCIAL:    'bg-blue-500/20 text-blue-300',
  PROFISSIONAL: 'bg-purple-500/20 text-purple-300',
  REDE:         'bg-amber-500/20 text-amber-300',
  ENTERPRISE:   'bg-green-500/20 text-green-300',
}

export default function RestaurantesAdminPage() {
  const utils = api.useUtils()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [confirmSuspend, setConfirmSuspend] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const { data, isLoading } = api.admin.listRestaurants.useQuery({
    search: debouncedSearch || undefined,
  })
  const restaurants = data?.items ?? []

  const toggleActive = api.admin.toggleRestaurantActive.useMutation({
    onSuccess: () => { utils.admin.listRestaurants.invalidate(); toast.success('Status atualizado') },
    onError: () => toast.error('Erro ao atualizar status'),
  })

  const updatePlan = api.admin.updateRestaurantPlan.useMutation({
    onSuccess: () => { utils.admin.listRestaurants.invalidate(); toast.success('Plano atualizado') },
    onError: () => toast.error('Erro ao atualizar plano'),
  })

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Restaurantes</h1>
        <p className="text-zinc-500 text-sm mt-1">
          {restaurants.length} restaurante{restaurants.length !== 1 ? 's' : ''} cadastrados
        </p>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Buscar por nome, slug ou e-mail do dono..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-600 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition-colors"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {restaurants.map((r: RestaurantListItem) => {
            const owner = r.users[0]?.user
            return (
              <div
                key={r.id}
                className={cn(
                  'bg-zinc-900 border rounded-xl p-4 transition-colors',
                  r.isActive ? 'border-zinc-800' : 'border-red-900/40 opacity-60'
                )}
              >
                <div className="flex items-center gap-4">

                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0 text-[15px] font-bold">
                    {r.name[0]}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[14px] font-semibold truncate">{r.name}</p>
                      <span className="text-[10px] text-zinc-500">/{r.slug}</span>
                      <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium', PLAN_COLOR[r.plan] ?? PLAN_COLOR.GRATUITO)}>
                        {r.plan}
                      </span>
                      {!r.isActive && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/20 text-red-400">
                          Suspenso
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      {owner && (
                        <p className="text-[11px] text-zinc-500 truncate">
                          <Users className="w-3 h-3 inline mr-1" />{owner.name} · {owner.email}
                        </p>
                      )}
                      <p className="text-[11px] text-zinc-600">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        {r._count.reservations} reservas · {r._count.customers} clientes
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">

                    {/* Plan selector */}
                    <div className="relative">
                      <select
                        value={r.plan}
                        onChange={e => updatePlan.mutate({ restaurantId: r.id, plan: e.target.value as any })}
                        className="appearance-none bg-zinc-800 border border-zinc-700 text-zinc-300 text-[12px] px-3 py-1.5 pr-7 rounded-lg focus:outline-none focus:border-zinc-500 cursor-pointer"
                      >
                        {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <ChevronDown className="w-3 h-3 text-zinc-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    {confirmSuspend === r.id ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-red-400">Confirmar?</span>
                        <button
                          type="button"
                          onClick={() => {
                            toggleActive.mutate({ restaurantId: r.id, isActive: !r.isActive })
                            setConfirmSuspend(null)
                          }}
                          className="px-2 py-1 rounded-md bg-red-500/20 text-red-400 text-[11px] font-medium hover:bg-red-500/30"
                        >
                          Sim
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmSuspend(null)}
                          className="px-2 py-1 rounded-md bg-zinc-800 text-zinc-400 text-[11px]"
                        >
                          Não
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => (r.isActive ? setConfirmSuspend(r.id) : toggleActive.mutate({ restaurantId: r.id, isActive: true }))}
                        className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
                        title={r.isActive ? 'Suspender' : 'Reativar'}
                      >
                        {r.isActive
                          ? <ToggleRight className="w-5 h-5 text-green-400" />
                          : <ToggleLeft  className="w-5 h-5 text-zinc-600"  />
                        }
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {restaurants.length === 0 && (
            <div className="text-center py-16 text-zinc-600">
              <Building2 className="w-8 h-8 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Nenhum restaurante cadastrado ainda.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
