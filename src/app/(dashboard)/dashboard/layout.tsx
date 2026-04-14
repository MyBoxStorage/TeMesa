'use client'

import { useState, createContext, useContext, useEffect } from 'react'
import { Sidebar } from '@/components/dashboard/sidebar'
import { DashboardHeader } from '@/components/dashboard/header'
import { api } from '@/trpc/react'
import type { StaffRole } from '@prisma/client'

interface RestaurantOption {
  id:   string
  name: string
  role: StaffRole
}

interface DashboardCtx {
  date:              Date
  setDate:           (d: Date) => void
  shift:             string
  setShift:          (s: string) => void
  restaurantId:      string
  setRestaurantId:   (id: string) => void
  restaurants:       RestaurantOption[]
  userRole:          StaffRole | null
}

export const DashboardContext = createContext<DashboardCtx>({
  date:            new Date(),
  setDate:         () => {},
  shift:           'all',
  setShift:        () => {},
  restaurantId:    '',
  setRestaurantId: () => {},
  restaurants:     [],
  userRole:        null,
})

export function useDashboard() {
  return useContext(DashboardContext)
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [date, setDate]               = useState(new Date())
  const [shift, setShift]             = useState('all')
  const [restaurantId, setRestaurantId] = useState('')

  const { data: memberships, isLoading } = api.restaurant.getMyRestaurants.useQuery()

  // Set first restaurant as default
  useEffect(() => {
    if (memberships && memberships.length > 0 && !restaurantId) {
      setRestaurantId(memberships[0].restaurant.id)
    }
  }, [memberships, restaurantId])

  const restaurants: RestaurantOption[] = (memberships ?? []).map(m => ({
    id:   m.restaurant.id,
    name: m.restaurant.name,
    role: m.role,
  }))

  const userRole = restaurants.find(r => r.id === restaurantId)?.role ?? null

  return (
    <DashboardContext.Provider value={{
      date, setDate,
      shift, setShift,
      restaurantId, setRestaurantId,
      restaurants,
      userRole,
    }}>
      <div className="flex h-screen bg-background overflow-hidden dark">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <DashboardHeader
            date={date}
            onDateChange={setDate}
            shift={shift}
            onShiftChange={setShift}
            restaurants={restaurants}
            selectedRestaurantId={restaurantId}
            onRestaurantChange={setRestaurantId}
          />
          <main className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin" />
              </div>
            ) : !restaurantId ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <p className="text-sm text-muted-foreground">Nenhum restaurante encontrado.</p>
                <a href="/onboarding" className="text-sm underline text-primary">Criar restaurante</a>
              </div>
            ) : (
              children
            )}
          </main>
        </div>
      </div>
    </DashboardContext.Provider>
  )
}
