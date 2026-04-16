'use client'

import { useState } from 'react'
import { Search, Tag, Star, Phone, Users } from 'lucide-react'
import { motion } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { EmptyState, SkeletonCard } from '@/components/common/empty-state'
import { CustomerDetail } from '@/components/clientes/customer-detail'
import { api } from '@/trpc/react'
import { useDashboard } from '../layout'
import { cn } from '@/lib/utils'

const AVATAR_COLORS = [
  'from-blue-600 to-blue-800', 'from-emerald-600 to-emerald-800',
  'from-violet-600 to-violet-800', 'from-rose-600 to-rose-800',
  'from-amber-600 to-amber-800', 'from-teal-600 to-teal-800',
]

export default function ClientesPage() {
  const { restaurantId } = useDashboard()
  const [search, setSearch] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)

  const { data: customers, isLoading } = api.customers.list.useQuery({
    restaurantId: restaurantId!,
    search: search || undefined,
    tags: selectedTags.length ? selectedTags : undefined,
  }, { enabled: !!restaurantId })

  const allTags = [...new Set(customers?.flatMap(c => c.tags ?? []) ?? [])]
  const toggleTag = (tag: string) =>
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])

  if (!restaurantId) return null

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[18px] font-semibold">Clientes</h1>
        <span className="text-[12px] text-muted-foreground">{customers?.length ?? 0} clientes</span>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, telefone ou e-mail..."
          className="pl-9 h-9 text-[13px] bg-muted/30 border-border/50"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-5">
          {allTags.map(tag => (
            <button key={tag} onClick={() => toggleTag(tag)}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors',
                selectedTags.includes(tag)
                  ? 'bg-primary text-primary-foreground border-transparent'
                  : 'bg-muted/40 text-muted-foreground border-border hover:text-foreground'
              )}>
              <Tag className="w-2.5 h-2.5" />{tag}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : !customers?.length ? (
        <EmptyState icon={<Users className="w-5 h-5" />} title="Nenhum cliente encontrado"
          description="Os clientes aparecem automaticamente quando fazem uma reserva." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {customers.map((customer, idx) => {
            const initials = customer.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
            const color = AVATAR_COLORS[customer.name.charCodeAt(0) % AVATAR_COLORS.length]
            const score = Math.round(customer.reliabilityScore)
            const scoreColor = score >= 90 ? 'text-green-400' : score >= 70 ? 'text-blue-400' : score >= 50 ? 'text-amber-400' : 'text-red-400'
            return (
              <motion.div key={customer.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                onClick={() => setSelectedCustomerId(customer.id)}
                className="bg-card border border-border rounded-xl p-4 hover:border-border/80 hover:bg-muted/20 transition-colors cursor-pointer">
                <div className="flex items-start gap-3 mb-3">
                  <div className={cn('w-11 h-11 rounded-full bg-gradient-to-br flex items-center justify-center text-[14px] font-bold text-white shrink-0', color)}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold leading-tight truncate">{customer.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{customer.phone}</p>
                  </div>
                  <span className={cn('text-[13px] font-bold shrink-0', scoreColor)}>{score}</span>
                </div>
                <div className="flex gap-4 text-center mb-3">
                  <div className="flex-1">
                    <p className="text-[15px] font-bold leading-none">{customer.visitCount}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">visitas</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-[15px] font-bold leading-none">{customer.noShowCount}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">no-shows</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-[15px] font-bold leading-none">
                      {customer.totalSpentCents > 0 ? `R$${Math.round(customer.totalSpentCents / 100)}` : '—'}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">gasto</p>
                  </div>
                </div>
                {customer.tags && customer.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {customer.tags.slice(0, 3).map(tag => (
                      <Badge key={tag} variant="secondary" className="text-[9px] h-4 px-1.5 font-normal">{tag}</Badge>
                    ))}
                    {customer.tags.length > 3 && (
                      <Badge variant="secondary" className="text-[9px] h-4 px-1 font-normal">+{customer.tags.length - 3}</Badge>
                    )}
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      )}

      {selectedCustomerId && restaurantId && (
        <CustomerDetail
          customerId={selectedCustomerId}
          restaurantId={restaurantId}
          onClose={() => setSelectedCustomerId(null)}
        />
      )}
    </div>
  )
}
