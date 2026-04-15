import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { sendNotification } from '@/lib/notifications'

function isCronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET ?? ''
  if (!secret) return true
  const header = req.headers.get('authorization') ?? ''
  return header === `Bearer ${secret}`
}

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const now = new Date()
  const inHours = (h: number) => new Date(now.getTime() + h * 60 * 60 * 1000)

  const r24 = await prisma.reservation.findMany({
    where: {
      status: 'CONFIRMED',
      date: { gte: inHours(23), lte: inHours(25) },
      reminder24hSentAt: null,
    },
    include: { restaurant: true, customer: true },
  })

  const r2 = await prisma.reservation.findMany({
    where: {
      status: 'CONFIRMED',
      date: { gte: inHours(1.5), lte: inHours(2.5) },
      reminder2hSentAt: null,
    },
    include: { restaurant: true, customer: true },
  })

  const post = await prisma.reservation.findMany({
    where: {
      status: 'FINISHED',
      postVisitSentAt: null,
      updatedAt: { gte: inHours(-4), lte: inHours(-2) },
    },
    include: { restaurant: true, customer: true },
  })

  for (const r of r24) {
    await sendNotification({ restaurantId: r.restaurantId, trigger: 'REMINDER_24H', reservation: r })
    await prisma.reservation.update({ where: { id: r.id }, data: { reminder24hSentAt: now } })
  }
  for (const r of r2) {
    await sendNotification({ restaurantId: r.restaurantId, trigger: 'REMINDER_2H', reservation: r })
    await prisma.reservation.update({ where: { id: r.id }, data: { reminder2hSentAt: now } })
  }
  for (const r of post) {
    await sendNotification({ restaurantId: r.restaurantId, trigger: 'POST_VISIT', reservation: r })
    await prisma.reservation.update({ where: { id: r.id }, data: { postVisitSentAt: now } })
  }

  return NextResponse.json({
    ok: true,
    reminder24h: r24.length,
    reminder2h: r2.length,
    postVisit: post.length,
  })
}

