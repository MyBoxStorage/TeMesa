import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { sendNotification } from '@/lib/notifications'

function isCronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET ?? ''
  if (!secret) {
    console.error('[Cron] CRON_SECRET não configurado — requisição bloqueada')
    return false
  }
  const header = req.headers.get('authorization') ?? ''
  return header === `Bearer ${secret}`
}

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const now = new Date()
  const inHours = (h: number) => new Date(now.getTime() + h * 60 * 60 * 1000)

  // Reivindicação atômica (evita lembretes duplicados com cron paralelo em serverless)
  await prisma.reservation.updateMany({
    where: {
      status: 'CONFIRMED',
      date: { gte: inHours(23), lte: inHours(25) },
      reminder24hSentAt: null,
    },
    data: { reminder24hSentAt: now },
  })
  const r24 = await prisma.reservation.findMany({
    where: {
      status: 'CONFIRMED',
      date: { gte: inHours(23), lte: inHours(25) },
      reminder24hSentAt: now,
    },
    include: { restaurant: true, customer: true },
  })

  await prisma.reservation.updateMany({
    where: {
      status: 'CONFIRMED',
      date: { gte: inHours(1.5), lte: inHours(2.5) },
      reminder2hSentAt: null,
    },
    data: { reminder2hSentAt: now },
  })
  const r2 = await prisma.reservation.findMany({
    where: {
      status: 'CONFIRMED',
      date: { gte: inHours(1.5), lte: inHours(2.5) },
      reminder2hSentAt: now,
    },
    include: { restaurant: true, customer: true },
  })

  const postVisitWhere = {
    status: 'FINISHED' as const,
    postVisitSentAt: null,
    updatedAt: { gte: inHours(-4), lte: inHours(-2) },
  }
  await prisma.reservation.updateMany({
    where: postVisitWhere,
    data: { postVisitSentAt: now },
  })
  const post = await prisma.reservation.findMany({
    where: {
      status: 'FINISHED',
      postVisitSentAt: now,
      updatedAt: { gte: inHours(-4), lte: inHours(-2) },
    },
    include: { restaurant: true, customer: true },
  })

  for (const r of r24) {
    await sendNotification({ restaurantId: r.restaurantId, trigger: 'REMINDER_24H', reservation: r })
  }
  for (const r of r2) {
    await sendNotification({ restaurantId: r.restaurantId, trigger: 'REMINDER_2H', reservation: r })
  }
  for (const r of post) {
    await sendNotification({ restaurantId: r.restaurantId, trigger: 'POST_VISIT', reservation: r })
  }

  return NextResponse.json({
    ok: true,
    reminder24h: r24.length,
    reminder2h: r2.length,
    postVisit: post.length,
  })
}

