'use client'

import { format, addDays, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Bell, ChevronDown } from 'lucide-react'
import { UserButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { StaffRole } from '@prisma/client'

interface RestaurantOption {
  id:   string
  name: string
  role: StaffRole
}

interface DashboardHeaderProps {
  date:                   Date
  onDateChange:           (d: Date) => void
  shift:                  string
  onShiftChange:          (s: string) => void
  shifts?:                { id: string; name: string }[]
  restaurants?:           RestaurantOption[]
  selectedRestaurantId?:  string
  onRestaurantChange?:    (id: string) => void
}

const ROLE_LABEL: Record<StaffRole, string> = {
  OWNER:    'Dono',
  MANAGER:  'Gerente',
  HOSTESS:  'Recepção',
  STAFF:    'Equipe',
}

export function DashboardHeader({
  date, onDateChange, shift, onShiftChange,
  shifts = [], restaurants = [], selectedRestaurantId, onRestaurantChange,
}: DashboardHeaderProps) {
  const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
  const currentRestaurant = restaurants.find(r => r.id === selectedRestaurantId)

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-sm shrink-0">
      {/* Linha principal: restaurante + ações */}
      <div className="h-14 flex items-center gap-3 px-4 md:px-5">
        {/* Restaurant selector */}
        {restaurants.length > 1 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 text-[14px] font-semibold text-foreground/90 hover:text-foreground transition-colors min-w-0">
                <span className="truncate max-w-[140px] sm:max-w-[200px]">{currentRestaurant?.name ?? 'Selecionar'}</span>
                <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              {restaurants.map(r => (
                <DropdownMenuItem
                  key={r.id}
                  onClick={() => onRestaurantChange?.(r.id)}
                  className={cn(
                    'flex items-center justify-between text-[12px]',
                    r.id === selectedRestaurantId && 'bg-muted'
                  )}
                >
                  <span className="truncate">{r.name}</span>
                  <span className="text-[10px] text-muted-foreground ml-2 shrink-0">{ROLE_LABEL[r.role]}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <span className="text-[14px] font-semibold text-foreground/90 truncate max-w-[140px] sm:max-w-[200px]">
            {currentRestaurant?.name ?? 'Meu Restaurante'}
          </span>
        )}

        <div className="flex-1" />

        {/* Desktop: date navigator inline */}
        <div className="hidden md:flex items-center gap-1.5">
          {!isToday && (
            <button
              type="button"
              onClick={() => onDateChange(new Date())}
              className="px-2 py-1 text-[10px] font-bold rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-all animate-pulse mr-1"
            >
              Hoje
            </button>
          )}
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onDateChange(subDays(date, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <button
            onClick={() => onDateChange(new Date())}
            className={cn(
              'px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-colors min-w-[132px] text-center',
              isToday ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted'
            )}
          >
            {isToday
              ? `Hoje — ${format(date, 'dd MMM', { locale: ptBR })}`
              : format(date, "EEE, dd 'de' MMM", { locale: ptBR })}
          </button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onDateChange(addDays(date, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Shift selector — desktop only */}
        {shifts.length > 0 && (
          <div className="hidden md:block">
            <Select value={shift} onValueChange={onShiftChange}>
              <SelectTrigger className="h-8 text-[12px] w-auto min-w-[108px] border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-[12px]">Todos turnos</SelectItem>
                {shifts.map(s => (
                  <SelectItem key={s.id} value={s.id} className="text-[12px]">{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Button size="icon" variant="ghost" className="h-8 w-8 relative">
          <Bell className="w-4 h-4" />
        </Button>
        <UserButton appearance={{ elements: { avatarBox: 'w-8 h-8', userButtonTrigger: 'focus:shadow-none' } }} />
      </div>

      {/* Mobile: segunda linha com date navigator compacto */}
      <div className="md:hidden flex items-center justify-center gap-1 px-4 pb-2.5 -mt-1">
        {!isToday && (
          <button
            type="button"
            onClick={() => onDateChange(new Date())}
            className="px-2 py-1 text-[10px] font-bold rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-all animate-pulse mr-1"
          >
            Hoje
          </button>
        )}
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onDateChange(subDays(date, 1))}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <button
          onClick={() => onDateChange(new Date())}
          className={cn(
            'px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-colors text-center',
            isToday ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted'
          )}
        >
          {isToday
            ? `Hoje — ${format(date, 'dd MMM', { locale: ptBR })}`
            : format(date, "EEE, dd MMM", { locale: ptBR })}
        </button>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onDateChange(addDays(date, 1))}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </header>
  )
}
