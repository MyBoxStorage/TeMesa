import type { ReservationStatus } from '@prisma/client'

export const ACTIVE_RESERVATION_STATUSES: ReservationStatus[] = [
  'PENDING',
  'PENDING_PAYMENT',
  'CONFIRMED',
  'CHECKED_IN',
]

export function reliabilityScore(params: { noShowCount: number; visitCount: number }): number {
  const total = params.visitCount + params.noShowCount
  if (total === 0) return 100
  const noShowRate = params.noShowCount / total
  const penalty = noShowRate * 100 * (1 + Math.log1p(params.noShowCount) * 0.3)
  return Math.max(0, Math.min(100, 100 - penalty))
}

export function confirmTokenExpiresAt(reservationDate: Date): Date {
  return new Date(reservationDate.getTime() + 2 * 60 * 60 * 1000)
}

