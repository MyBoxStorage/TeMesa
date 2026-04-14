'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarDays, LayoutGrid, Users, Clock,
  BarChart3, Settings, ChevronLeft, ChevronRight, UtensilsCrossed,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/dashboard/reservas',   icon: CalendarDays,    label: 'Reservas'   },
  { href: '/dashboard/mesas',      icon: LayoutGrid,      label: 'Mesas'      },
  { href: '/dashboard/waitlist',   icon: Clock,           label: 'Waitlist'   },
  { href: '/dashboard/clientes',   icon: Users,           label: 'Clientes'   },
  { href: '/dashboard/garcons',    icon: UtensilsCrossed, label: 'Garçons'    },
  { href: '/dashboard/relatorios', icon: BarChart3,       label: 'Relatórios' },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 220 }}
      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex flex-col h-full bg-sidebar border-r border-sidebar-border overflow-hidden shrink-0"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-sidebar-border shrink-0">
        <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center shrink-0">
          <UtensilsCrossed className="w-3.5 h-3.5 text-primary-foreground" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }} transition={{ duration: 0.14 }}
              className="font-semibold text-[13px] tracking-tight whitespace-nowrap text-sidebar-foreground"
            >
              TeMesa
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto scrollbar-hide">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href)
          return (
            <Link key={href} href={href}>
              <div className={cn(
                'flex items-center gap-3 px-2.5 py-[7px] rounded-md transition-colors duration-150 cursor-pointer',
                active
                  ? 'bg-sidebar-accent text-sidebar-foreground font-medium'
                  : 'text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
              )}>
                <Icon className="w-[15px] h-[15px] shrink-0" />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }} transition={{ duration: 0.12 }}
                      className="text-[13px] whitespace-nowrap leading-none"
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Bottom: Settings + Collapse */}
      <div className="px-2 pb-3 pt-2 border-t border-sidebar-border space-y-0.5">
        <Link href="/dashboard/configuracoes">
          <div className={cn(
            'flex items-center gap-3 px-2.5 py-[7px] rounded-md transition-colors duration-150',
            pathname.startsWith('/dashboard/configuracoes')
              ? 'bg-sidebar-accent text-sidebar-foreground font-medium'
              : 'text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
          )}>
            <Settings className="w-[15px] h-[15px] shrink-0" />
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
          onClick={() => setCollapsed(p => !p)}
          className="w-full flex items-center gap-3 px-2.5 py-[7px] rounded-md text-sidebar-foreground/30 hover:text-sidebar-foreground/70 hover:bg-sidebar-accent/50 transition-colors duration-150"
        >
          {collapsed
            ? <ChevronRight className="w-[15px] h-[15px] shrink-0" />
            : <>
                <ChevronLeft className="w-[15px] h-[15px] shrink-0" />
                <span className="text-[13px] whitespace-nowrap">Recolher</span>
              </>
          }
        </button>
      </div>
    </motion.aside>
  )
}
