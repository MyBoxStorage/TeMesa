'use client'

import { Building2, Calendar, Users, Mail, TrendingUp, CheckCircle2 } from 'lucide-react'
import { api } from '@/trpc/react'

export default function AdminPage() {
  const { data: stats, isLoading } = api.admin.getStats.useQuery()

  const kpis = stats
    ? [
        { label: 'Restaurantes ativos',    value: stats.activeRestaurants,      sub: `${stats.totalRestaurants} total`,           icon: Building2,    color: 'text-blue-400',   bg: 'bg-blue-500/10' },
        { label: 'Reservas este mês',      value: stats.reservationsThisMonth,  sub: `${stats.totalReservations} total`,           icon: Calendar,     color: 'text-green-400',  bg: 'bg-green-500/10' },
        { label: 'Clientes cadastrados',   value: stats.totalCustomers,         sub: 'em toda a plataforma',                      icon: Users,        color: 'text-purple-400', bg: 'bg-purple-500/10' },
        { label: 'Convites pendentes',     value: stats.pendingInvitations,     sub: 'aguardando aceite',                         icon: Mail,         color: 'text-amber-400',  bg: 'bg-amber-500/10' },
      ]
    : []

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Dashboard da Plataforma</h1>
        <p className="text-zinc-500 text-sm mt-1">Visão geral do TeMesa</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map(kpi => (
            <div key={kpi.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <div className={`w-9 h-9 rounded-lg ${kpi.bg} flex items-center justify-center mb-4`}>
                <kpi.icon className={`w-4.5 h-4.5 ${kpi.color}`} />
              </div>
              <p className="text-2xl font-bold">{kpi.value.toLocaleString('pt-BR')}</p>
              <p className="text-[12px] text-zinc-400 mt-0.5">{kpi.label}</p>
              <p className="text-[11px] text-zinc-600 mt-0.5">{kpi.sub}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-10 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-[15px] font-semibold mb-4">Início rápido</h2>
        <div className="space-y-3">
          {[
            { text: 'Crie um convite em Convites → Novo convite',              done: true  },
            { text: 'O parceiro recebe o e-mail e cria a conta',               done: false },
            { text: 'Onboarding pré-preenchido com o nome do restaurante',     done: false },
            { text: 'Configure plano em Restaurantes → editar plano',          done: false },
            { text: 'Ative ou suspenda restaurantes quando necessário',        done: false },
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${step.done ? 'text-green-400' : 'text-zinc-700'}`} />
              <p className={`text-[13px] ${step.done ? 'text-zinc-400 line-through' : 'text-zinc-300'}`}>{step.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
        <p className="text-[12px] text-amber-300 font-medium mb-1">Como me tornar admin?</p>
        <p className="text-[12px] text-amber-200/70">
          Execute no Supabase SQL Editor:{' '}
          <code className="bg-black/30 px-1.5 py-0.5 rounded text-amber-200">
            UPDATE &quot;User&quot; SET &quot;isAdmin&quot; = true WHERE email = &apos;seu@email.com&apos;;
          </code>
        </p>
      </div>
    </div>
  )
}
