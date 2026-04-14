'use client'

import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus, QrCode, Clock, Users } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState, SkeletonRow } from '@/components/common/empty-state'
import { api } from '@/trpc/react'
import { useDashboard } from '../layout'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function WaitlistPage() {
  const { restaurantId } = useDashboard()
  const today = format(new Date(), 'yyyy-MM-dd')

  const { data: entries, isLoading } = api.waitlist.list.useQuery(
    { restaurantId: restaurantId!, date: today }, { enabled: !!restaurantId })

  const utils = api.useUtils()
  const notify = api.waitlist.notifyNext.useMutation({
    onSuccess: () => { utils.waitlist.list.invalidate(); toast.success('Notificação enviada!') },
  })

  const waiting  = entries?.filter(e => e.status === 'WAITING')  ?? []
  const notified = entries?.filter(e => e.status === 'NOTIFIED') ?? []
  const done     = entries?.filter(e => ['CONFIRMED','DECLINED','EXPIRED'].includes(e.status)) ?? []

  if (!restaurantId) return null

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[18px] font-semibold">Waitlist</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2 h-8 text-[12px]">
            <QrCode className="w-3.5 h-3.5" />QR Code
          </Button>
          <Button size="sm" className="gap-2 h-8 text-[12px]">
            <Plus className="w-3.5 h-3.5" />Adicionar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Aguardando',  value: waiting.length,  color: 'text-amber-400' },
          { label: 'Notificados', value: notified.length, color: 'text-blue-400'  },
          { label: 'Resolvidos',  value: done.length,     color: 'text-green-400' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-lg p-4 text-center">
            <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
            <p className="text-[12px] text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {notified.length > 0 && (
        <section className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <span className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">Mesa disponível</span>
          </div>
          {notified.map(entry => <WaitlistRow key={entry.id} entry={entry} highlight />)}
        </section>
      )}

      <section className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">Aguardando</span>
        </div>
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
          : waiting.length === 0
            ? <EmptyState icon={<Clock className="w-4 h-4" />} title="Fila vazia" description="Ninguém esperando no momento." />
            : waiting.map(entry => (
              <WaitlistRow key={entry.id} entry={entry}
                onNotify={() => notify.mutate({ restaurantId: restaurantId!, waitlistEntryId: entry.id })} />
            ))
        }
      </section>
    </div>
  )
}

function WaitlistRow({ entry, highlight, onNotify }: { entry: any; highlight?: boolean; onNotify?: () => void }) {
  const waited = Math.floor((Date.now() - new Date(entry.createdAt).getTime()) / 60000)
  const pct = Math.min(100, (waited / 45) * 100)
  const barColor = pct < 50 ? 'bg-green-500' : pct < 80 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex items-center gap-4 p-4 rounded-lg border mb-2',
        highlight ? 'bg-blue-500/10 border-blue-500/30' : 'bg-card border-border hover:bg-muted/30 transition-colors'
      )}>
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[13px] font-bold shrink-0">
        {entry.position}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium">{entry.guestName}</p>
        <div className="flex items-center gap-3 mt-1">
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Users className="w-3 h-3" />{entry.partySize} pessoas
          </span>
          <span className="text-[11px] text-muted-foreground">{entry.guestPhone}</span>
        </div>
      </div>
      <div className="w-24 space-y-1">
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{waited}m</span><span>45m</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${pct}%` }} />
        </div>
      </div>
      {onNotify && <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={onNotify}>Notificar</Button>}
      {highlight && <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-[10px]">Aguardando resp.</Badge>}
    </motion.div>
  )
}
