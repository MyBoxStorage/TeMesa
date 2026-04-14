import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { sendNotification } from '@/lib/notifications'

function assertCronAuth(req: Request) {
  const secret = process.env.CRON_SECRET ?? ''
  if (!secret) return
  const header = req.headers.get('authorization') ?? ''
  if (header !== `Bearer ${secret}`) {
    throw new Response('Unauthorized', { status: 401 })
  }
}

export async function GET(req: Request) {
  assertCronAuth(req)
  const now = new Date()

  const inHours = (h: number) => new Date(now.getTime() + h * 60 * 60 * 1000)

  const r24 = await prisma.reservation.findMany({
    where: { status: 'CONFIRMED', date: { gte: inHours(23), lte: inHours(25) } },
    include: { restaurant: true, customer: true },
  })
  const r2 = await prisma.reservation.findMany({
    where: { status: 'CONFIRMED', date: { gte: inHours(1.5), lte: inHours(2.5) } },
    include: { restaurant: true, customer: true },
  })

  for (const r of r24) {
    await sendNotification({ restaurantId: r.restaurantId, trigger: 'REMINDER_24H', reservation: r })
  }
  for (const r of r2) {
    await sendNotification({ restaurantId: r.restaurantId, trigger: 'REMINDER_2H', reservation: r })
  }

  // POST_VISIT: simplificado para MVP (envia para FINISHED nas últimas 4h)
  const post = await prisma.reservation.findMany({
    where: { status: 'FINISHED', updatedAt: { gte: inHours(-4), lte: inHours(-2) } },
    include: { restaurant: true, customer: true },
  })
  for (const r of post) {
    await sendNotification({ restaurantId: r.restaurantId, trigger: 'POST_VISIT', reservation: r })
  }

  return NextResponse.json({ ok: true, reminder24h: r24.length, reminder2h: r2.length, postVisit: post.length })
}

