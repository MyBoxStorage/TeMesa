import { TRPCError } from '@trpc/server'
import { nanoid } from 'nanoid'
import type { Prisma, ReservationStatus } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import { sendWidgetReservationEvents } from '@/lib/bcconnect'
import { sendNotification } from '@/lib/notifications'
import { createPixOrder } from '@/lib/pagarme'
import { ACTIVE_RESERVATION_STATUSES, confirmTokenExpiresAt } from '@/lib/reservationRules'

function widgetCustomerPreferencesJson(params: {
  dietaryNotes?: string
  originType?: string
  visitFrequency?: string
  consumptionPreferences?: string[]
  referralSource?: string
}): Prisma.InputJsonValue | undefined {
  const o: Record<string, unknown> = {}
  if (params.dietaryNotes) o.dietaryNotes = params.dietaryNotes
  if (params.originType) o.originType = params.originType
  if (params.visitFrequency) o.visitFrequency = params.visitFrequency
  if (params.consumptionPreferences?.length) o.consumptionPreferences = params.consumptionPreferences
  if (params.referralSource) o.referralSource = params.referralSource
  if (Object.keys(o).length === 0) return undefined
  return o as Prisma.InputJsonValue
}

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

  const SLOT_INTERVAL_MIN = 60 // 1 horário por hora

  const toMin = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number)
    return h * 60 + (m ?? 0)
  }
  const fromMin = (min: number) => {
    const h = Math.floor(min / 60)
    const m = min % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  const result: Array<{
    shiftId: string
    shiftName: string
    startTime: string
    endTime: string
    area: null
    availableSeats: number
  }> = []

  for (const s of shifts) {
    const taken = takenByShift.get(s.id) ?? 0
    const max = s.maxCapacity ?? 0
    const available = max > 0 ? Math.max(0, max - taken) : 0
    if (available < params.partySize) continue

    const shiftStart = toMin(s.startTime)
    const shiftEnd   = toMin(s.endTime)

    // Gera slots a cada SLOT_INTERVAL_MIN; o último slot começa
    // no mínimo SLOT_INTERVAL_MIN antes do fim do turno.
    for (let t = shiftStart; t <= shiftEnd - SLOT_INTERVAL_MIN; t += SLOT_INTERVAL_MIN) {
      result.push({
        shiftId: s.id,
        shiftName: s.name,
        startTime: fromMin(t),
        endTime: s.endTime,
        area: null,
        availableSeats: available,
      })
    }
  }

  return result
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
  originType?: string
  visitFrequency?: string
  consumptionPreferences?: string[]
  referralSource?: string
  optinMarketing?: boolean
}): Promise<{ reservationId: string; status: ReservationStatus; prepayment?: PrepaymentInfo }> {
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug: params.slug },
    select: { id: true, name: true, slug: true, prepaymentConfig: true },
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
  const prefsJson = widgetCustomerPreferencesJson({
    dietaryNotes: params.dietaryNotes,
    originType: params.originType,
    visitFrequency: params.visitFrequency,
    consumptionPreferences: params.consumptionPreferences,
    referralSource: params.referralSource,
  })

  // Upsert customer so every widget reservation creates/updates a CRM profile
  const customer = await prisma.customer.upsert({
    where: { restaurantId_phone: { restaurantId: restaurant.id, phone: params.guestPhone } },
    update: {
      name: params.guestName,
      email: params.guestEmail,
      lgpdConsent: params.lgpdConsent,
      lgpdConsentAt: params.lgpdConsent ? new Date() : undefined,
      preferences: prefsJson ?? undefined,
    },
    create: {
      restaurantId: restaurant.id,
      name: params.guestName,
      phone: params.guestPhone,
      email: params.guestEmail,
      lgpdConsent: params.lgpdConsent,
      lgpdConsentAt: params.lgpdConsent ? new Date() : undefined,
      preferences: prefsJson ?? undefined,
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
      originType: params.originType ?? null,
      visitFrequency: params.visitFrequency ?? null,
      consumptionPreferences: params.consumptionPreferences ?? [],
      referralSource: params.referralSource ?? null,
      optinMarketing: params.optinMarketing ?? false,
      statusHistory: { create: { fromStatus: null, toStatus: initialStatus, changedBy: 'SYSTEM' } },
    },
    include: { restaurant: true, customer: true },
  })

  await sendNotification({ restaurantId: reservation.restaurantId, trigger: 'RESERVATION_CREATED', reservation })

  // Dispara eventos BC Connect — fire-and-forget, nunca bloqueia o fluxo
  if (reservation.lgpdConsent) {
    const shiftRecord = await prisma.shift.findUnique({
      where: { id: params.shiftId },
      select: { name: true },
    })
    sendWidgetReservationEvents({
      restaurantId: restaurant.id,
      restaurantSlug: params.slug,
      restaurantName: restaurant.name,
      guest: {
        name: params.guestName,
        phone: params.guestPhone,
        email: params.guestEmail,
      },
      lgpdConsent: reservation.lgpdConsent,
      optinMarketing: params.optinMarketing ?? false,
      reservation: {
        id: reservation.id,
        partySize: params.partySize,
        date: params.date.toISOString(),
        shiftName: shiftRecord?.name ?? params.shiftId,
        occasion: params.occasion,
        originType: params.originType,
        visitFrequency: params.visitFrequency,
        consumptionPreferences: params.consumptionPreferences,
        dietaryNotes: params.dietaryNotes,
        referralSource: params.referralSource,
      },
    }).catch((err) => console.warn('[BC Connect] Falha silenciosa:', err))
  }

  // If prepayment is active, create a Pix order via Pagar.me (valor fixo em reais → centavos)
  if (prepaymentActive && cfg) {
    const amount = Number(cfg.prepayment_amount ?? 0)
    const amountCents = Math.round(amount * 100)

    if (amountCents <= 0) {
      console.warn(
        `[Prepayment] amountCents inválido (${amountCents}) para restaurante ${restaurant.id} — tratando como sem pagamento`
      )
      const confirmed = await prisma.reservation.update({
        where: { id: reservation.id },
        data: {
          status: 'CONFIRMED',
          statusHistory: {
            create: {
              fromStatus: 'PENDING_PAYMENT',
              toStatus: 'CONFIRMED',
              changedBy: 'SYSTEM',
              reason: 'PREPAYMENT_AMOUNT_INVALID',
            },
          },
        },
      })
      return { reservationId: reservation.id, status: confirmed.status }
    }

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
    } catch {
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
