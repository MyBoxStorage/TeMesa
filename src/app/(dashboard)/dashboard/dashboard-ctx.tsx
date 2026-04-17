'use client'

import { createContext, useContext } from 'react'
import type { StaffRole } from '@prisma/client'

interface RestaurantOption {
  id:   string
  name: string
  role: StaffRole
}

export interface DashboardCtx {
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
