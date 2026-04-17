import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendNotification } from '@/lib/notifications'

function authorized(req: Request): boolean {
  const expected = process.env.ZAPI_CLIENT_TOKEN ?? ''
  if (!expected) {
    console.warn('[Z-API Webhook] ZAPI_CLIENT_TOKEN não configurado — webhook sem autenticação')
    return true
  }
  const token = req.headers.get('x-z-api-security-token') ?? ''
  return token === expected
}

// Normaliza número para E.164 brasileiro
function toE164(raw: string): string {
  const d = raw.replace(/\D/g, '')
  if (d.startsWith('55') && d.length >= 12) return `+${d}`
  return `+55${d}`
}

// Palavras-chave para confirmar/cancelar via WhatsApp
const CONFIRM_WORDS  = ['1', 'sim', 'confirmar', 'confirmo', 'confirmado', 'yes']
const CANCEL_WORDS   = ['2', 'não', 'nao', 'cancelar', 'cancelo', 'cancelado', 'no']

export async function POST(req: Request) {
  if (!authorized(req)) return new NextResponse('Unauthorized', { status: 401 })

  const payload = await req.json().catch(() => null)
  if (!payload) return NextResponse.json({ ok: true })

  // Z-API envia evento "received" para mensagens recebidas
  if (payload.type !== 'ReceivedCallback') return NextResponse.json({ ok: true })

  const phone = toE164(String(payload.phone ?? payload.from ?? ''))
  const text  = String(payload.text?.message ?? payload.body ?? '').trim().toLowerCase()

  if (!phone || !text) return NextResponse.json({ ok: true })

  // Encontrar reserva ativa mais recente com confirmToken ainda válido para esse telefone
  const reservation = await prisma.reservation.findFirst({
    where: {
      guestPhone: phone,
      status: { in: ['PENDING', 'CONFIRMED'] },
      confirmToken: { not: null },
    },
    include: { restaurant: true, customer: true },
    orderBy: { createdAt: 'desc' },
  })

  if (!reservation || !reservation.confirmToken) return NextResponse.json({ ok: true })

  if (CONFIRM_WORDS.includes(text)) {
    if (reservation.status === 'PENDING') {
      await prisma.reservation.update({
        where: { id: reservation.id },
        data: {
          status: 'CONFIRMED',
          confirmToken: null,
          confirmTokenExpiresAt: null,
          statusHistory: {
            create: { fromStatus: 'PENDING', toStatus: 'CONFIRMED', changedBy: 'GUEST', reason: 'WHATSAPP_CONFIRM' },
          },
        },
      })
    }
    return NextResponse.json({ ok: true })
  }

  if (CANCEL_WORDS.includes(text)) {
    const cancellable = ['PENDING', 'CONFIRMED']
    if (!cancellable.includes(reservation.status)) return NextResponse.json({ ok: true })

    const updated = await prisma.reservation.update({
      where: { id: reservation.id },
      data: {
        status: 'CANCELLED',
        statusHistory: {
          create: { fromStatus: reservation.status, toStatus: 'CANCELLED', changedBy: 'GUEST', reason: 'WHATSAPP_CANCEL' },
        },
      },
      include: { restaurant: true, customer: true },
    })

    await sendNotification({
      restaurantId: updated.restaurantId,
      trigger: 'CANCELLED',
      reservation: updated,
    })

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ ok: true })
}
