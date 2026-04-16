'use client'

import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Users, Calendar, AlertTriangle, BarChart3, Download } from 'lucide-react'
import { api } from '@/trpc/react'
import { useDashboard } from '../layout'
import { SkeletonCard } from '@/components/common/empty-state'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const CHANNEL_COLORS = ['#3b82f6','#22c55e','#f59e0b','#a855f7','#ef4444']
const CHANNEL_LABELS: Record<string, string> = {
  MANUAL: 'Manual', WIDGET: 'Widget', WHATSAPP: 'WhatsApp', PHONE: 'Telefone', IFOOD: 'iFood',
}

function exportCSV(rows: string[][], filename: string) {
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export default function RelatoriosPage() {
  const { restaurantId } = useDashboard()

  const { data: dashboard, isLoading } = api.analytics.getDashboard.useQuery(
    { restaurantId: restaurantId! }, { enabled: !!restaurantId })
  const { data: occupancy }    = api.analytics.getOccupancy30Days.useQuery(
    { restaurantId: restaurantId! }, { enabled: !!restaurantId })
  const { data: topCustomers } = api.analytics.getTopCustomers.useQuery(
    { restaurantId: restaurantId!, limit: 5 }, { enabled: !!restaurantId })

  const handleExportOcupacao = () => {
    if (!occupancy) return
    exportCSV(
      [['Data', 'Pessoas'], ...occupancy.map(r => [r.date, String(r.covers)])],
      'ocupacao-30dias.csv'
    )
  }

  const handleExportClientes = () => {
    if (!topCustomers) return
    exportCSV(
      [['Nome', 'Telefone', 'Visitas', 'No-shows', 'Score'],
       ...topCustomers.map((c: any) => [c.name, c.phone, String(c.visitCount), String(c.noShowCount), String(Math.round(c.reliabilityScore))])],
      'top-clientes.csv'
    )
  }

  if (!restaurantId) return null

  if (isLoading) return (
    <div className="p-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  )

  const channelData = dashboard?.reservasPorCanal
    ? Object.entries(dashboard.reservasPorCanal).map(([k, v]) => ({
        name: CHANNEL_LABELS[k] ?? k, value: v as number,
      }))
    : []

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[18px] font-semibold">Relatórios</h1>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-[12px]" onClick={handleExportOcupacao} disabled={!occupancy?.length}>
          <Download className="w-3.5 h-3.5" /> Exportar CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Reservas hoje', value: dashboard?.reservasHoje ?? 0, icon: <Calendar className="w-4 h-4" />, sub: `${dashboard?.coversHoje ?? 0} pessoas` },
          { label: 'Taxa de ocupação', value: `${Math.round(dashboard?.taxaOcupacao ?? 0)}%`, icon: <BarChart3 className="w-4 h-4" />, sub: 'hoje' },
          { label: 'No-shows mês', value: dashboard?.noShowsMes ?? 0, icon: <AlertTriangle className="w-4 h-4" />, sub: 'este mês', warn: (dashboard?.noShowsMes ?? 0) > 5 },
          { label: 'Novos clientes', value: dashboard?.clientesNovos30dias ?? 0, icon: <Users className="w-4 h-4" />, sub: 'últimos 30 dias' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-card border border-border rounded-xl p-4">
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-3', (kpi as any).warn ? 'bg-red-500/15 text-red-400' : 'bg-muted text-muted-foreground')}>
              {kpi.icon}
            </div>
            <p className="text-2xl font-bold leading-none mb-1">{kpi.value}</p>
            <p className="text-[11px] text-muted-foreground">{kpi.label}</p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-4">
          <p className="text-[13px] font-medium mb-4">Ocupação — 30 dias</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={occupancy ?? []} barSize={8}>
              <XAxis dataKey="date" hide />
              <YAxis hide />
              <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, fontSize: 11 }} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="covers" fill="#3b82f6" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[13px] font-medium mb-4">Por canal</p>
          {channelData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie data={channelData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value">
                    {channelData.map((_, i) => <Cell key={i} fill={CHANNEL_COLORS[i % CHANNEL_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-3">
                {channelData.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHANNEL_COLORS[i % CHANNEL_COLORS.length] }} />
                      <span className="text-[11px] text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="text-[11px] font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <p className="text-[12px] text-muted-foreground">Sem dados</p>}
        </div>
      </div>

      {topCustomers && topCustomers.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[13px] font-medium">Top clientes</p>
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-[11px]" onClick={handleExportClientes}>
              <Download className="w-3 h-3" /> CSV
            </Button>
          </div>
          <div className="space-y-2">
            {topCustomers.map((c: any, i: number) => (
              <div key={c.id} className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0">
                <span className="text-[12px] text-muted-foreground w-5 text-center font-medium">{i + 1}</span>
                <div className="flex-1">
                  <p className="text-[13px] font-medium">{c.name}</p>
                  <p className="text-[11px] text-muted-foreground">{c.phone}</p>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-semibold">{c.visitCount} visitas</p>
                  <p className="text-[11px] text-muted-foreground">score {Math.round(c.reliabilityScore)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
