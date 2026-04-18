'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus, QrCode, Clock, Users, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EmptyState, SkeletonRow } from '@/components/common/empty-state'
import { api } from '@/trpc/react'
import { useDashboard } from '../layout'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const e164 = (raw: string) => { const d = raw.replace(/\D/g, ''); return d.startsWith('55') ? `+${d}` : `+55${d}` }

export default function WaitlistPage() {
  const { restaurantId } = useDashboard()
  const today = format(new Date(), 'yyyy-MM-dd')
  const [showAdd, setShowAdd] = useState(false)
  const [showQr, setShowQr]   = useState(false)
  const [addForm, setAddForm] = useState({ name: '', phone: '', partySize: 2 })

  const { data: restaurantInfo } = api.restaurant.getPublicInfo.useQuery(
    { restaurantId: restaurantId! },
    { enabled: !!restaurantId }
  )

  const { data: entries, isLoading } = api.waitlist.list.useQuery(
    { restaurantId: restaurantId!, date: today }, { enabled: !!restaurantId })

  const utils = api.useUtils()
  const notify = api.waitlist.notifyNext.useMutation({
    onSuccess: () => { utils.waitlist.list.invalidate(); toast.success('Notificação enviada!') },
  })
  const addToWaitlist = api.waitlist.add.useMutation({
    onSuccess: () => { utils.waitlist.list.invalidate(); setShowAdd(false); setAddForm({ name: '', phone: '', partySize: 2 }); toast.success('Adicionado à fila!') },
    onError: (e) => toast.error(e.message),
  })

  const waiting  = entries?.filter(e => e.status === 'WAITING')  ?? []
  const notified = entries?.filter(e => e.status === 'NOTIFIED') ?? []
  const done     = entries?.filter(e => ['CONFIRMED','DECLINED','EXPIRED'].includes(e.status)) ?? []

  if (!restaurantId) return null

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const waitlistUrl = `${baseUrl}/r/${restaurantInfo?.slug ?? ''}?waitlist=1`

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <h1 className="text-[18px] font-semibold">Waitlist</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2 h-8 text-[12px]" onClick={() => setShowQr(true)}>
            <QrCode className="w-3.5 h-3.5" />QR Code
          </Button>
          <Button size="sm" className="gap-2 h-8 text-[12px]" onClick={() => setShowAdd(true)}>
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

      {/* Modal Adicionar */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[15px] font-semibold">Adicionar à fila</h2>
              <button onClick={() => setShowAdd(false)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-[12px]">Nome</Label>
                <Input className="h-9 text-[13px]" value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} placeholder="Nome do cliente" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px]">WhatsApp</Label>
                <Input className="h-9 text-[13px]" value={addForm.phone} onChange={e => setAddForm(p => ({ ...p, phone: e.target.value }))} placeholder="+55 (00) 00000-0000" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px]">Pessoas</Label>
                <Input type="number" min={1} max={20} className="h-9 text-[13px]" value={addForm.partySize} onChange={e => setAddForm(p => ({ ...p, partySize: parseInt(e.target.value) || 1 }))} />
              </div>
              <Button className="w-full h-9 text-[13px] mt-2" disabled={!addForm.name || !addForm.phone || addToWaitlist.isPending}
                onClick={() =>
                  addToWaitlist.mutate({
                    restaurantId: restaurantId!,
                    guestName: addForm.name,
                    guestPhone: e164(addForm.phone),
                    partySize: addForm.partySize,
                    date: new Date(),
                    lgpdConsent: true,
                  })
                }>
                {addToWaitlist.isPending ? 'Adicionando...' : 'Adicionar à fila'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal QR Code */}
      {showQr && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowQr(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-xs shadow-xl text-center" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[15px] font-semibold">QR da fila de espera</h2>
              <button onClick={() => setShowQr(false)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="bg-white rounded-xl p-4 flex items-center justify-center mb-3">
              <QRCodeSVG value={waitlistUrl} size={128} />
            </div>
            <p className="text-[12px] text-muted-foreground">Aponte a câmera para entrar na fila</p>
            <p className="text-[11px] text-muted-foreground/60 mt-1 font-mono break-all">
              {waitlistUrl}
            </p>
          </div>
        </div>
      )}
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
      <div className="w-20 sm:w-24 space-y-1 hidden sm:block">
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
