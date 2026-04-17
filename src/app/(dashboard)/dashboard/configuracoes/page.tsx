'use client'

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
import { useDashboard } from '../layout'

const TABS = [
  ['geral',           'Geral'],
  ['tema',            'Tema'],
  ['turnos',          'Turnos'],
  ['disponibilidade', 'Disponibilidade'],
  ['notificacoes',    'Notificações'],
  ['pagamento',       'Pagamento'],
  ['autotags',        'Auto-Tags'],
  ['garcons',         'Garçons'],
  ['integracao',      'Integração'],
] as const

export default function ConfiguracoesPage() {
  const { restaurantId } = useDashboard()

  if (!restaurantId) return null

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-[18px] font-semibold mb-6">Configurações</h1>

      <Tabs defaultValue="geral" orientation="vertical" className="flex gap-6">
        <TabsList className="flex flex-col h-auto w-44 shrink-0 bg-muted/30 p-1.5 rounded-xl items-start gap-0.5">
          {TABS.map(([value, label]) => (
            <TabsTrigger
              key={value} value={value}
              className="w-full justify-start text-[13px] px-3 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg"
            >
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
