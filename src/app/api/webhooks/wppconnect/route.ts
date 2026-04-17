import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { sendWhatsApp } from '@/lib/zapi'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const event = body.event ?? body.type
    if (event !== 'onMessage' && event !== 'message') {
      return NextResponse.json({ ok: true, skipped: true })
    }

    const data = body.data ?? body
    const rawPhone = String(data.from ?? data.phone ?? '')
      .replace('@c.us', '')
      .replace('@s.whatsapp.net', '')
    const messageBody = String(data.body ?? data.text ?? '').trim()

    if (!rawPhone || !messageBody) {
      return NextResponse.json({ ok: true, skipped: true })
    }

    const phone = rawPhone.startsWith('+') ? rawPhone : `+${rawPhone}`

    if (messageBody !== '1' && messageBody !== '2') {
      return NextResponse.json({ ok: true, skipped: 'not-a-reply' })
    }

    const reservation = await prisma.reservation.findFirst({
      where: {
        guestPhone: phone,
        status: { in: ['CONFIRMED', 'PENDING'] },
        date: { gte: new Date() },
      },
      include: { restaurant: true },
      orderBy: { date: 'asc' },
    })

    if (!reservation) {
      return NextResponse.json({ ok: true, skipped: 'no-reservation' })
    }

    if (messageBody === '1') {
      if (reservation.status === 'PENDING') {
        await prisma.reservation.update({
          where: { id: reservation.id },
          data: { status: 'CONFIRMED' },
        })
        await prisma.reservationStatusHistory.create({
          data: {
            reservationId: reservation.id,
            fromStatus: 'PENDING',
            toStatus: 'CONFIRMED',
            changedBy: 'WHATSAPP_REPLY',
          },
        })
      }
      await sendWhatsApp(
        phone,
        `✅ Reserva confirmada! Esperamos você no ${reservation.restaurant.name}. Até lá! 🍽️`
      )
    } else if (messageBody === '2') {
      await prisma.reservation.update({
        where: { id: reservation.id },
        data: { status: 'CANCELLED' },
      })
      await prisma.reservationStatusHistory.create({
        data: {
          reservationId: reservation.id,
          fromStatus: reservation.status,
          toStatus: 'CANCELLED',
          changedBy: 'WHATSAPP_REPLY',
          reason: 'Cancelado pelo cliente via resposta WhatsApp',
        },
      })
      await sendWhatsApp(
        phone,
        `❌ Reserva cancelada. Esperamos vê-lo em outra oportunidade no ${reservation.restaurant.name}! 👋`
      )
    }

    return NextResponse.json({ ok: true, processed: true })
  } catch (err) {
    console.error('[Webhook WPPConnect]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
