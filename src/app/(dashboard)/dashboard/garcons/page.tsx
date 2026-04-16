'use client'

import { useState } from 'react'
import { Plus, LayoutGrid, UtensilsCrossed } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState, SkeletonCard } from '@/components/common/empty-state'
import { api } from '@/trpc/react'
import { useDashboard } from '../layout'
import { cn } from '@/lib/utils'
import { ServerCreateModal } from '@/components/garcons/server-create-modal'
import { ServerAssignModal } from '@/components/garcons/server-assign-modal'

const PALETTE = ['#3b82f6','#22c55e','#f59e0b','#a855f7','#ef4444','#06b6d4','#ec4899']

export default function GarconsPage() {
  const { restaurantId } = useDashboard()
  const [createOpen, setCreateOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [selectedServer, setSelectedServer] = useState<{ id: string; name: string } | null>(null)
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  const { data: servers, isLoading } = api.servers.list.useQuery(
    { restaurantId: restaurantId! }, { enabled: !!restaurantId })
  const { data: tables } = api.tables.list.useQuery(
    { restaurantId: restaurantId! }, { enabled: !!restaurantId })
  const { data: assignments } = api.servers.getTodayAssignments.useQuery(
    { restaurantId: restaurantId!, date: today }, { enabled: !!restaurantId })

  if (!restaurantId) return null

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[18px] font-semibold">Garçons</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">Atribuição de mesas por turno</p>
        </div>
        <Button size="sm" className="gap-2 h-8 text-[12px]" onClick={() => setCreateOpen(true)}>
          <Plus className="w-3.5 h-3.5" />Novo Garçom
        </Button>
      </div>

      <ServerCreateModal restaurantId={restaurantId} open={createOpen} onClose={() => setCreateOpen(false)} />
      <ServerAssignModal
        restaurantId={restaurantId}
        server={selectedServer}
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : servers?.length === 0 ? (
        <EmptyState icon={<UtensilsCrossed className="w-5 h-5" />} title="Nenhum garçom cadastrado"
          description="Adicione garçons para organizar o atendimento do salão."
          action={<Button size="sm" variant="outline">Cadastrar garçom</Button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {servers?.map((server, idx) => {
            const color = PALETTE[idx % PALETTE.length]
            const serverTables = tables?.filter(t => (assignments as any)?.[t.id]?.server?.id === server.id) ?? []
            return (
              <motion.div key={server.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="h-1" style={{ backgroundColor: color }} />
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-bold text-white shrink-0"
                      style={{ backgroundColor: color }}>
                      {server.name[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold">{server.name}</p>
                      <p className="text-[11px] text-muted-foreground">{serverTables.length} mesa{serverTables.length !== 1 ? 's' : ''} hoje</p>
                    </div>
                    <div className="ml-auto">
                      {server.isActive
                        ? <Badge className="status-available text-[10px] h-4 px-1.5">Ativo</Badge>
                        : <Badge variant="secondary" className="text-[10px] h-4 px-1.5">Inativo</Badge>}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-2">Mesas atribuídas</p>
                    {serverTables.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground italic">Nenhuma mesa hoje</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {serverTables.map(t => (
                          <span key={t.id} className="px-2 py-0.5 rounded-md bg-muted text-[11px] font-medium">{t.name}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-4 h-7 text-[11px] gap-1.5"
                    onClick={() => {
                      setSelectedServer({ id: server.id, name: server.name })
                      setAssignOpen(true)
                    }}
                  >
                    <LayoutGrid className="w-3 h-3" />Atribuir mesas
                  </Button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
