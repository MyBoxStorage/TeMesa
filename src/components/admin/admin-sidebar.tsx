'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Building2, Mail, ArrowLeft, UtensilsCrossed } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/admin',              icon: LayoutDashboard, label: 'Dashboard'    },
  { href: '/admin/restaurantes', icon: Building2,       label: 'Restaurantes' },
  { href: '/admin/convites',     icon: Mail,            label: 'Convites'     },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 shrink-0 border-r border-zinc-800 flex flex-col">
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
            <UtensilsCrossed className="w-4 h-4 text-black" />
          </div>
          <div>
            <p className="text-[13px] font-bold tracking-tight">TeMesa</p>
            <p className="text-[10px] text-red-400 font-medium">Admin</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors',
                isActive
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-zinc-800">
        <Link
          href="/dashboard/reservas"
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar ao painel
        </Link>
      </div>
    </aside>
  )
}
