import { TRPCError } from '@trpc/server'
import { nanoid } from 'nanoid'
import type { ReservationStatus } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import { sendNotification } from '@/lib/notifications'
import { createPixOrder } from '@/lib/pagarme'
import { ACTIVE_RESERVATION_STATUSES, confirmTokenExpiresAt } from '@/lib/reservationRules'

export interface PrepaymentInfo {
  amountCents: number
  pixCode: string
  pixQrCodeUrl: string
  expiresAt: Date
  prepaymentRecordId: string
}

export async function getWidgetAvailability(params: { slug: string; date: string; partySize: number }) {
  const restaurant = await prisma.restaurant.findUnique({ where: { slug: params.slug }, select: { id: true } })
  if (!restaurant) return []

  const day = new Date(`${params.date}T12:00:00.000Z`).getUTCDay()
  const shifts = await prisma.shift.findMany({
    where: { restaurantId: restaurant.id, isActive: true, daysOfWeek: { has: day } },
    orderBy: { startTime: 'asc' },
  })

  const start = new Date(`${params.date}T00:00:00.000Z`)
  const end = new Date(`${params.date}T23:59:59.999Z`)
  const counts = await prisma.reservation.groupBy({
    by: ['shiftId'],
    where: {
      restaurantId: restaurant.id,
      date: { gte: start, lte: end },
      shiftId: { not: null },
      status: { in: ACTIVE_RESERVATION_STATUSES },
    },
    _sum: { partySize: true },
  })

  const takenByShift = new Map<string, number>()
  for (const c of counts) if (c.shiftId) takenByShift.set(c.shiftId, c._sum.partySize ?? 0)

  return shifts
    .map((s) => {
      const taken = takenByShift.get(s.id) ?? 0
      const max = s.maxCapacity ?? 0
      const available = max > 0 ? Math.max(0, max - taken) : 0
      return {
        shiftId: s.id,
        shiftName: s.name,
        startTime: s.startTime,
        endTime: s.endTime,
        area: null as string | null,
        availableSeats: available,
      }
    })
    .filter((x) => x.availableSeats >= params.partySize)
}

export async function createWidgetReservation(params: {
  slug: string
  guestName: string
  guestPhone: string
  guestEmail?: string
  partySize: number
  date: Date
  shiftId: string
  occasion?: string
  dietaryNotes?: string
  lgpdConsent: boolean
}): Promise<{ reservationId: string; status: ReservationStatus; prepayment?: PrepaymentInfo }> {
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug: params.slug },
    select: { id: true, name: true, prepaymentConfig: true },
  })
  if (!restaurant) throw new TRPCError({ code: 'NOT_FOUND' })

  const cfg = restaurant.prepaymentConfig as Record<string, unknown> | null
  const prepaymentActive = cfg?.prepayment_enabled === true
  const initialStatus: ReservationStatus = prepaymentActive ? 'PENDING_PAYMENT' : 'CONFIRMED'

  const start = new Date(params.date)
  const end = new Date(params.date)
  start.setUTCHours(0, 0, 0, 0)
  end.setUTCHours(23, 59, 59, 999)

  const existing = await prisma.reservation.findFirst({
    where: {
      restaurantId: restaurant.id,
      shiftId: params.shiftId,
      date: { gte: start, lte: end },
      guestPhone: params.guestPhone,
      status: { in: ACTIVE_RESERVATION_STATUSES },
    },
    select: { id: true },
  })
  if (existing) throw new TRPCError({ code: 'CONFLICT', message: 'Já existe uma reserva ativa para este telefone' })

  const token = nanoid(32)

  // Upsert customer so every widget reservation creates/updates a CRM profile
  const customer = await prisma.customer.upsert({
    where: { restaurantId_phone: { restaurantId: restaurant.id, phone: params.guestPhone } },
    update: {
      name: params.guestName,
      email: params.guestEmail,
      lgpdConsent: params.lgpdConsent,
      lgpdConsentAt: params.lgpdConsent ? new Date() : undefined,
      preferences: params.dietaryNotes ? { dietaryNotes: params.dietaryNotes } : undefined,
    },
    create: {
      restaurantId: restaurant.id,
      name: params.guestName,
      phone: params.guestPhone,
      email: params.guestEmail,
      lgpdConsent: params.lgpdConsent,
      lgpdConsentAt: params.lgpdConsent ? new Date() : undefined,
      preferences: params.dietaryNotes ? { dietaryNotes: params.dietaryNotes } : undefined,
      tags: [],
    },
  })

  const reservation = await prisma.reservation.create({
    data: {
      restaurantId: restaurant.id,
      customerId: customer.id,
      guestName: params.guestName,
      guestPhone: params.guestPhone,
      guestEmail: params.guestEmail,
      partySize: params.partySize,
      date: params.date,
      shiftId: params.shiftId,
      status: initialStatus,
      occasion: params.occasion,
      dietaryNotes: params.dietaryNotes,
      source: 'WIDGET',
      confirmToken: token,
      confirmTokenExpiresAt: confirmTokenExpiresAt(params.date),
      lgpdConsent: params.lgpdConsent,
      lgpdConsentAt: params.lgpdConsent ? new Date() : null,
      statusHistory: { create: { fromStatus: null, toStatus: initialStatus, changedBy: 'SYSTEM' } },
    },
    include: { restaurant: true, customer: true },
  })

  await sendNotification({ restaurantId: reservation.restaurantId, trigger: 'RESERVATION_CREATED', reservation })

  // If prepayment is active, create a Pix order via Pagar.me
  if (prepaymentActive && cfg) {
    const type = String(cfg.prepayment_type ?? 'VALOR_FIXO')
    const amount = Number(cfg.prepayment_amount ?? 0)
    let amountCents = 0
    if (type === 'POR_PESSOA') amountCents = Math.round(amount * params.partySize * 100)
    else if (type === 'PERCENTUAL') amountCents = Math.round(amount)
    else amountCents = Math.round(amount * 100)

    const expirationMinutes = Number(cfg.prepayment_expiry_minutes ?? 30)
    const pixExpiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000)

    try {
      const pix = await createPixOrder({
        amountCents,
        expiresAt: pixExpiresAt,
        customer: { name: params.guestName, email: params.guestEmail, phone: params.guestPhone },
        description: `Sinal reserva ${restaurant.name}`,
        metadata: { reservationId: reservation.id, restaurantId: restaurant.id },
      })

      const record = await prisma.prepaymentRecord.create({
        data: {
          reservationId: reservation.id,
          amountCents,
          status: 'PENDING',
          pixCode: pix.pixCode,
          pixQrCodeUrl: pix.pixQrCodeUrl,
          pagarmeOrderId: pix.orderId,
          expiresAt: pix.expiresAt,
        },
      })

      return {
        reservationId: reservation.id,
        status: reservation.status,
        prepayment: {
          amountCents,
          pixCode: pix.pixCode,
          pixQrCodeUrl: pix.pixQrCodeUrl,
          expiresAt: pix.expiresAt,
          prepaymentRecordId: record.id,
        },
      }
    } catch (err) {
      // Pagar.me failure: cancel reservation and propagate error
      await prisma.reservation.update({
        where: { id: reservation.id },
        data: { status: 'CANCELLED', statusHistory: {
          create: { fromStatus: 'PENDING_PAYMENT', toStatus: 'CANCELLED', changedBy: 'SYSTEM', reason: 'PAYMENT_SETUP_FAILED' },
        }},
      })
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Erro ao gerar Pix. Tente novamente.' })
    }
  }

  return { reservationId: reservation.id, status: reservation.status }
}
