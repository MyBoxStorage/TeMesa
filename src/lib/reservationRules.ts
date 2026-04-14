import type { ReservationStatus } from '@prisma/client'

export const ACTIVE_RESERVATION_STATUSES: ReservationStatus[] = [
  'PENDING',
  'PENDING_PAYMENT',
  'CONFIRMED',
  'CHECKED_IN',
]

export function reliabilityScore(params: { noShowCount: number; visitCount: number }): number {
  return Math.max(0, Math.min(100, 100 - params.noShowCount * 15 + params.visitCount * 2))
}

export function confirmTokenExpiresAt(reservationDate: Date): Date {
  return new Date(reservationDate.getTime() - 60 * 60 * 1000)
}

