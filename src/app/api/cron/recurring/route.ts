import { NextResponse } from 'next/server'
import { addDays, getDay, startOfDay } from 'date-fns'

import { prisma } from '@/lib/prisma'
import { confirmTokenExpiresAt, generateConfirmToken } from '@/lib/reservationRules'

function isCronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET ?? ''
  if (!secret) return false
  return (req.headers.get('authorization') ?? '') === `Bearer ${secret}`
}

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const recurrings = await prisma.recurringReservation.findMany({
    where: { isActive: true },
    include: { customer: true },
  })

  let created = 0
  const today = startOfDay(new Date())

  for (const rec of recurrings) {
    for (let d = 1; d <= 7; d++) {
      const targetDate = addDays(today, d)
      if (getDay(targetDate) !== rec.dayOfWeek) continue

      const dayStart = startOfDay(targetDate)
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1)

      const existing = await prisma.reservation.findFirst({
        where: {
          restaurantId: rec.restaurantId,
          customerId: rec.customerId,
          date: {
            gte: dayStart,
            lte: dayEnd,
          },
          status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
        },
      })
      if (existing) continue

      const token = generateConfirmToken()
      const expiresAt = confirmTokenExpiresAt(targetDate)

      await prisma.reservation.create({
        data: {
          restaurantId: rec.restaurantId,
          customerId: rec.customerId,
          tableId: rec.tableId,
          shiftId: rec.shiftId,
          guestName: rec.customer.name,
          guestPhone: rec.customer.phone,
          guestEmail: rec.customer.email,
          partySize: rec.partySize,
          date: targetDate,
          status: 'CONFIRMED',
          source: 'MANUAL',
          notes: rec.notes ? `[Recorrente] ${rec.notes}` : '[Recorrente]',
          confirmToken: token,
          confirmTokenExpiresAt: expiresAt,
          lgpdConsent: rec.customer.lgpdConsent,
          statusHistory: {
            create: { fromStatus: null, toStatus: 'CONFIRMED', changedBy: 'SYSTEM_RECURRING' },
          },
        },
      })
      created++
    }
  }

  return NextResponse.json({ ok: true, created })
}
