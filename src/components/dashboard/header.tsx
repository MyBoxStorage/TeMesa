'use client'

import { useState } from 'react'
import { format, addDays, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Sun, Moon, Bell, ChevronDown } from 'lucide-react'
import { useTheme } from 'next-themes'
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
  const { theme, setTheme } = useTheme()
  const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')

  const currentRestaurant = restaurants.find(r => r.id === selectedRestaurantId)

  return (
    <header className="h-14 flex items-center gap-3 px-4 border-b border-border bg-background/80 backdrop-blur-sm shrink-0">

      {/* Restaurant selector */}
      {restaurants.length > 1 ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors max-w-[160px]">
              <span className="truncate">{currentRestaurant?.name ?? 'Selecionar'}</span>
              <ChevronDown className="w-3 h-3 shrink-0" />
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
        <span className="text-[13px] font-medium text-muted-foreground hidden sm:block truncate max-w-[140px]">
          {currentRestaurant?.name ?? 'Meu Restaurante'}
        </span>
      )}

      <div className="hidden sm:block w-px h-4 bg-border" />

      {/* Date navigator */}
      <div className="flex items-center gap-1">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onDateChange(subDays(date, 1))}>
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>
        <button
          onClick={() => onDateChange(new Date())}
          className={cn(
            'px-2.5 py-1 rounded-md text-[12px] font-medium transition-colors min-w-[120px] text-center',
            isToday ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted'
          )}
        >
          {isToday
            ? `Hoje — ${format(date, 'dd MMM', { locale: ptBR })}`
            : format(date, "EEE, dd 'de' MMM", { locale: ptBR })}
        </button>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onDateChange(addDays(date, 1))}>
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Shift selector */}
      {shifts.length > 0 && (
        <Select value={shift} onValueChange={onShiftChange}>
          <SelectTrigger className="h-7 text-[12px] w-auto min-w-[100px] border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-[12px]">Todos turnos</SelectItem>
            {shifts.map(s => (
              <SelectItem key={s.id} value={s.id} className="text-[12px]">{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div className="flex-1" />

      <Button
        size="icon" variant="ghost" className="h-7 w-7"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      >
        {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
      </Button>
      <Button size="icon" variant="ghost" className="h-7 w-7 relative">
        <Bell className="w-3.5 h-3.5" />
      </Button>
      <UserButton appearance={{ elements: { avatarBox: 'w-7 h-7', userButtonTrigger: 'focus:shadow-none' } }} />
    </header>
  )
}
