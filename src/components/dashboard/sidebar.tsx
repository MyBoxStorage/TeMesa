'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarDays, LayoutGrid, Users, Clock,
  BarChart3, Settings, ChevronLeft, ChevronRight, UtensilsCrossed, UserCheck,
  LayoutDashboard,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/trpc/react'
import { useDashboard } from '@/app/(dashboard)/dashboard/dashboard-ctx'

const NAV_GROUPS: Array<{
  label: string | null
  items: { href: string; icon: typeof CalendarDays; label: string }[]
}> = [
  {
    label: null,
    items: [
      { href: '/dashboard', label: 'Visão geral', icon: LayoutDashboard },
      { href: '/dashboard/reservas', label: 'Reservas', icon: CalendarDays },
      { href: '/dashboard/hostess', label: 'Hostess', icon: UserCheck },
    ],
  },
  {
    label: 'GESTÃO',
    items: [
      { href: '/dashboard/mesas', label: 'Mesas', icon: LayoutGrid },
      { href: '/dashboard/waitlist', label: 'Waitlist', icon: Clock },
      { href: '/dashboard/clientes', label: 'Clientes', icon: Users },
      { href: '/dashboard/garcons', label: 'Garçons', icon: UtensilsCrossed },
    ],
  },
  {
    label: 'ANÁLISE',
    items: [
      { href: '/dashboard/relatorios', label: 'Relatórios', icon: BarChart3 },
    ],
  },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const { restaurantId } = useDashboard()
  const dateStr = format(new Date(), 'yyyy-MM-dd')
  const { data: todayReservations } = api.reservations.list.useQuery(
    { restaurantId: restaurantId!, date: dateStr },
    { enabled: !!restaurantId, refetchInterval: 30_000, retry: false }
  )
  const pendingCount = (todayReservations ?? []).filter(
    r => ['PENDING', 'PENDING_PAYMENT', 'CONFIRMED'].includes(r.status)
  ).length

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 228 }}
      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex flex-col h-full bg-sidebar border-r border-sidebar-border overflow-hidden shrink-0"
    >
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border shrink-0">
        <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shrink-0">
          <UtensilsCrossed className="w-4 h-4 text-primary-foreground" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }} transition={{ duration: 0.14 }}
              className="font-bold text-[15px] tracking-tight whitespace-nowrap text-sidebar-foreground"
            >
              TeMesa
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <nav className="flex-1 py-3 px-2.5 overflow-y-auto scrollbar-hide space-y-4">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi}>
            {group.label && !collapsed && (
              <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-[0.15em] px-3 mb-1.5">
                {group.label}
              </p>
            )}
            {gi > 0 && collapsed && (
              <div className="mx-3 my-2 h-px bg-border/50" />
            )}
            <div className="space-y-0.5">
              {group.items.map(({ href, icon: Icon, label }) => {
                const active = href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname.startsWith(href)
                const showBadge = href === '/dashboard/reservas' && pendingCount > 0 && !collapsed
                return (
                  <Link key={href} href={href}>
                    <div
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 cursor-pointer relative',
                        active
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                      )}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-primary" />
                      )}
                      <Icon
                        className={cn(
                          'shrink-0 transition-colors',
                          collapsed ? 'w-5 h-5' : 'w-[18px] h-[18px]',
                          active && 'text-primary',
                        )}
                      />
                      <AnimatePresence>
                        {!collapsed && (
                          <motion.span
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }} transition={{ duration: 0.12 }}
                            className="text-[13px] whitespace-nowrap leading-none flex items-center gap-2"
                          >
                            {label}
                            {showBadge && (
                              <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-primary text-primary-foreground leading-none">
                                {pendingCount}
                              </span>
                            )}
                          </motion.span>
                        )}
                      </AnimatePresence>
                      {collapsed && href === '/dashboard/reservas' && pendingCount > 0 && (
                        <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-2 pb-3 pt-2 border-t border-sidebar-border space-y-0.5">
        <Link href="/dashboard/configuracoes">
          <div
            className={cn(
              'relative flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150',
              pathname.startsWith('/dashboard/configuracoes')
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
            )}
          >
            {pathname.startsWith('/dashboard/configuracoes') && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-primary" />
            )}
            <Settings className={cn('shrink-0', collapsed ? 'w-5 h-5' : 'w-[18px] h-[18px]')} />
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }} transition={{ duration: 0.12 }}
                  className="text-[13px] whitespace-nowrap"
                >
                  Configurações
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </Link>

        <button
          type="button"
          onClick={() => setCollapsed(p => !p)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/30 transition-colors duration-150"
        >
          {collapsed
            ? <ChevronRight className="w-5 h-5 shrink-0" />
            : <>
                <ChevronLeft className="w-5 h-5 shrink-0" />
                <span className="text-[13px] whitespace-nowrap">Recolher</span>
              </>
          }
        </button>
      </div>
    </motion.aside>
  )
}

export function MobileBottomNav() {
  const pathname = usePathname()
  const MOBILE_NAV = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Visão geral' },
    { href: '/dashboard/reservas', icon: CalendarDays, label: 'Reservas' },
    { href: '/dashboard/mesas', icon: LayoutGrid, label: 'Mesas' },
    { href: '/dashboard/clientes', icon: Users, label: 'Clientes' },
    { href: '/dashboard/configuracoes', icon: Settings, label: 'Config' },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border flex items-center justify-around h-14 px-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
      {MOBILE_NAV.map(({ href, icon: Icon, label }) => {
        const active = href === '/dashboard'
          ? pathname === '/dashboard'
          : pathname.startsWith(href)
        return (
          <Link key={href} href={href} className="flex flex-col items-center gap-0.5 py-1 px-2 min-w-0">
            <Icon className={cn('w-5 h-5 shrink-0', active ? 'text-primary' : 'text-muted-foreground')} />
            <span className={cn('text-[9px] text-center leading-tight line-clamp-2 max-w-[76px]', active ? 'text-primary font-semibold' : 'text-muted-foreground')}>
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
