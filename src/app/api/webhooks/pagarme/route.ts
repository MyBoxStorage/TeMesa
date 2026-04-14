import crypto from 'node:crypto'
import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { sendNotification } from '@/lib/notifications'

function verifySignature(params: { rawBody: string; signature: string; secret: string }): boolean {
  const expected = crypto.createHmac('sha256', params.secret).update(params.rawBody, 'utf8').digest('hex')
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(params.signature))
}

export async function POST(req: Request) {
  const secret = process.env.PAGARME_WEBHOOK_SECRET ?? ''
  const signature = req.headers.get('x-pagarme-signature') ?? ''
  const rawBody = await req.text()

  if (secret && signature) {
    const ok = verifySignature({ rawBody, signature, secret })
    if (!ok) return new NextResponse('Invalid signature', { status: 401 })
  }

  const event = JSON.parse(rawBody) as any
  if (event?.type !== 'order.paid') return NextResponse.json({ ok: true })

  const pagarmeOrderId = String(event?.data?.id ?? '')
  if (!pagarmeOrderId) return new NextResponse('Missing order id', { status: 400 })

  const record = await prisma.prepaymentRecord.findFirst({
    where: { pagarmeOrderId },
    include: { reservation: { include: { restaurant: true, customer: true } } },
  })
  if (!record) return NextResponse.json({ ok: true })

  const now = new Date()
  const updated = await prisma.$transaction(async (tx) => {
    const rec = await tx.prepaymentRecord.update({
      where: { id: record.id },
      data: { status: 'PAID', paidAt: now },
    })
    const reservation = await tx.reservation.update({
      where: { id: record.reservationId },
      data: {
        status: 'CONFIRMED',
        statusHistory: {
          create: { fromStatus: 'PENDING_PAYMENT', toStatus: 'CONFIRMED', changedBy: 'SYSTEM', reason: 'PAYMENT' },
        },
      },
      include: { restaurant: true, customer: true },
    })
    return { rec, reservation }
  })

  await sendNotification({
    restaurantId: updated.reservation.restaurantId,
    trigger: 'PAYMENT_CONFIRMED',
    reservation: updated.reservation,
  })

  return NextResponse.json({ ok: true })
}

