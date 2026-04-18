import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { generateConfirmToken } from '@/lib/reservationRules'
import { sendWhatsApp } from '@/lib/zapi'

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

  const expiredWaitlist = await prisma.waitlistEntry.findMany({
    where: {
      status: 'NOTIFIED',
      responseDeadline: { lt: now },
    },
  })

  let waitlistExpired = 0
  for (const entry of expiredWaitlist) {
    await prisma.waitlistEntry.update({
      where: { id: entry.id },
      data: { status: 'EXPIRED' },
    })
    waitlistExpired += 1

    const dateStr = entry.date.toISOString().split('T')[0]
    const start = new Date(`${dateStr}T00:00:00.000Z`)
    const end = new Date(`${dateStr}T23:59:59.999Z`)

    const next = await prisma.waitlistEntry.findFirst({
      where: {
        restaurantId: entry.restaurantId,
        date: { gte: start, lte: end },
        status: 'WAITING',
        id: { not: entry.id },
      },
      orderBy: { position: 'asc' },
    })

    if (next) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
      const notifiedAt = new Date()
      const deadline = new Date(notifiedAt.getTime() + 30 * 60 * 1000)
      const token = next.confirmToken ?? generateConfirmToken()

      await prisma.waitlistEntry.update({
        where: { id: next.id },
        data: {
          status: 'NOTIFIED',
          notifiedAt,
          responseDeadline: deadline,
          confirmToken: token,
        },
      })

      const confirmUrl = `${appUrl}/confirmar/${token}`
      await sendWhatsApp(
        next.guestPhone,
        `🎉 *Uma mesa está disponível!*\n\n` +
          `Olá *${next.guestName}*! Uma vaga abriu na lista de espera.\n\n` +
          `⚡ Você tem *30 minutos* para confirmar:\n${confirmUrl}`,
      )
    }
  }

  return NextResponse.json({ ok: true, cancelled: expired.length, waitlistExpired })
}

