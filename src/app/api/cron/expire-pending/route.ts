import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'

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

  const expired = await prisma.prepaymentRecord.findMany({
    where: { status: 'PENDING', expiresAt: { lt: now }, reservation: { status: 'PENDING_PAYMENT' } },
    select: { reservationId: true },
  })

  await prisma.$transaction(
    expired.map((e) =>
      prisma.reservation.update({
        where: { id: e.reservationId },
        data: {
          status: 'CANCELLED',
          statusHistory: {
            create: { fromStatus: 'PENDING_PAYMENT', toStatus: 'CANCELLED', changedBy: 'SYSTEM', reason: 'EXPIRED' },
          },
        },
      })
    )
  )

  return NextResponse.json({ ok: true, cancelled: expired.length })
}

