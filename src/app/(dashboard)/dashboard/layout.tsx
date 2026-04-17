'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { motion } from 'framer-motion'
import { Sidebar, MobileBottomNav } from '@/components/dashboard/sidebar'
import { DashboardHeader } from '@/components/dashboard/header'
import { api } from '@/trpc/react'
import { posthog } from '@/lib/posthog'
import { getSupabaseAnonClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { DashboardContext, type DashboardCtx } from './dashboard-ctx'

export { useDashboard } from './dashboard-ctx'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [date, setDate]               = useState(new Date())
  const [shift, setShift]             = useState('all')
  const [restaurantId, setRestaurantId] = useState('')

  const { user, isLoaded } = useUser()
  const { data: memberships, isLoading } = api.restaurant.getMyRestaurants.useQuery()

  // Set first restaurant as default
  useEffect(() => {
    if (memberships && memberships.length > 0 && !restaurantId) {
      setRestaurantId(memberships[0].restaurant.id)
    }
  }, [memberships, restaurantId])

  useEffect(() => {
    if (!isLoaded || !user?.id || !restaurantId) return
    try {
      posthog.identify(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        restaurantId,
      })
    } catch {
      /* analytics opcional */
    }
  }, [isLoaded, user?.id, user?.primaryEmailAddress?.emailAddress, restaurantId])

  // Realtime: nova reserva → toast
  useEffect(() => {
    if (!restaurantId) return

    let channel: ReturnType<ReturnType<typeof getSupabaseAnonClient>['channel']> | null = null

    try {
      const supabase = getSupabaseAnonClient()
      channel = supabase
        .channel(`new-reservations-${restaurantId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'Reservation',
            filter: `restaurantId=eq.${restaurantId}`,
          },
          (payload: { new: { guestName?: string; partySize?: number } }) => {
            const name = payload.new?.guestName ?? 'Novo cliente'
            const size = payload.new?.partySize ?? 0
            toast.info(`Nova reserva: ${name} — ${size} pessoa${size !== 1 ? 's' : ''}`, {
              duration: 5000,
            })
          }
        )
        .subscribe()
    } catch {
      /* Supabase Realtime é opcional */
    }

    return () => {
      if (channel) {
        try {
          getSupabaseAnonClient().removeChannel(channel)
        } catch {
          /* ok */
        }
      }
    }
  }, [restaurantId])

  const restaurants: DashboardCtx['restaurants'] = (memberships ?? []).map(m => ({
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
        <div className="hidden md:flex h-full">
          <Sidebar />
        </div>
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
          <main className="flex-1 overflow-y-auto pb-14 md:pb-0">
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
              <motion.div
                key={pathname}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15 }}
              >
                {children}
              </motion.div>
            )}
          </main>
          <MobileBottomNav />
        </div>
      </div>
    </DashboardContext.Provider>
  )
}
