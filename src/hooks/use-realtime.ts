'use client'

import { useEffect, useMemo } from 'react'

import { getSupabaseAnonClient } from '@/lib/supabase'

export function useRealtimeTables(params: {
  restaurantId: string
  onChange: (payload: unknown) => void
}) {
  const supabase = useMemo(() => getSupabaseAnonClient(), [])

  useEffect(() => {
    const channel = supabase
      .channel(`realtime:tables:${params.restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'Table',
          filter: `restaurantId=eq.${params.restaurantId}`,
        },
        (payload) => params.onChange(payload)
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [params, supabase])
}

export function useRealtimeReservations(params: {
  restaurantId: string
  onChange: (payload: unknown) => void
}) {
  const supabase = useMemo(() => getSupabaseAnonClient(), [])

  useEffect(() => {
    const channel = supabase
      .channel(`realtime:reservations:${params.restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'Reservation',
          filter: `restaurantId=eq.${params.restaurantId}`,
        },
        (payload) => params.onChange(payload)
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [params, supabase])
}
