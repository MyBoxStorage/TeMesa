import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'

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

