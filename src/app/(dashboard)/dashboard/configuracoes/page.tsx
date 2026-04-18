'use client'

import Link from 'next/link'
import {
  Shield, Building2, Palette, Clock, CalendarDays, Bell, CreditCard, Tags, UtensilsCrossed, Plug,
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ConfigGeral } from '@/components/configuracoes/config-geral'
import { ConfigTema } from '@/components/configuracoes/config-tema'
import { ConfigTurnos } from '@/components/configuracoes/config-turnos'
import { ConfigDisponibilidade } from '@/components/configuracoes/config-disponibilidade'
import { ConfigNotificacoes } from '@/components/configuracoes/config-notificacoes'
import { ConfigAutoTags } from '@/components/configuracoes/config-autotags'
import { ConfigGarcons } from '@/components/configuracoes/config-garcons'
import { ConfigIntegracao } from '@/components/configuracoes/config-integracao'
import { ConfigPagamento } from '@/components/configuracoes/config-pagamento'
import { useDashboard } from '../dashboard-ctx'

const TABS = [
  ['geral',           'Geral',           Building2],
  ['tema',            'Tema',            Palette],
  ['turnos',          'Turnos',          Clock],
  ['disponibilidade', 'Disponibilidade', CalendarDays],
  ['notificacoes',    'Notificações',    Bell],
  ['pagamento',       'Pagamento',       CreditCard],
  ['autotags',        'Auto-Tags',       Tags],
  ['garcons',         'Garçons',         UtensilsCrossed],
  ['integracao',      'Integração',      Plug],
] as const

export default function ConfiguracoesPage() {
  const { restaurantId } = useDashboard()

  if (!restaurantId) return null

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <h1 className="text-[18px] font-semibold mb-6">Configurações</h1>

      <div className="mb-5">
        <Link
          href="/dashboard/configuracoes/protecao-noshow"
          className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm hover:bg-muted/40 transition-colors"
        >
          <Shield className="w-4 h-4 text-muted-foreground shrink-0" />
          <div>
            <p className="font-medium">Proteção No-Show (add-on)</p>
            <p className="text-[11px] text-muted-foreground">Sinal Pix e posicionamento do produto — R$49/mês</p>
          </div>
        </Link>
      </div>

      <Tabs defaultValue="geral" orientation="vertical" className="flex flex-col md:flex-row gap-6">
        <TabsList className="flex md:flex-col h-auto md:w-52 shrink-0 bg-muted/40 p-1.5 rounded-xl items-stretch gap-0.5 overflow-x-auto md:overflow-x-visible scrollbar-hide">
          {TABS.map(([value, label, Icon]) => (
            <TabsTrigger
              key={value} value={value}
              className="group justify-start gap-2.5 text-[13px] px-3 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg whitespace-nowrap"
            >
              <Icon className="w-4 h-4 shrink-0 text-muted-foreground group-data-[state=active]:text-foreground" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="flex-1 min-w-0">
          <TabsContent value="geral">        <ConfigGeral        restaurantId={restaurantId} /></TabsContent>
          <TabsContent value="tema">         <ConfigTema         restaurantId={restaurantId} /></TabsContent>
          <TabsContent value="turnos">       <ConfigTurnos       restaurantId={restaurantId} /></TabsContent>
          <TabsContent value="disponibilidade">
            <ConfigDisponibilidade restaurantId={restaurantId} />
          </TabsContent>
          <TabsContent value="notificacoes"> <ConfigNotificacoes restaurantId={restaurantId} /></TabsContent>
          <TabsContent value="pagamento">    <ConfigPagamento    restaurantId={restaurantId} /></TabsContent>
          <TabsContent value="autotags">     <ConfigAutoTags     restaurantId={restaurantId} /></TabsContent>
          <TabsContent value="garcons">      <ConfigGarcons      restaurantId={restaurantId} /></TabsContent>
          <TabsContent value="integracao">   <ConfigIntegracao   restaurantId={restaurantId} /></TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
