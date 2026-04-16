import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import type { ReservationSource, ReservationStatus } from '@prisma/client'

import { sendNotification } from '@/lib/notifications'
import { sendBcEvent } from '@/lib/bcconnect'
import { ACTIVE_RESERVATION_STATUSES, confirmTokenExpiresAt, reliabilityScore } from '@/lib/reservationRules'
import {
  type AuthedRestaurantCtx,
  hostessProcedure,
  protectedProcedure,
  publicProcedure,
  router,
  staffProcedure,
} from '@/server/trpc'

const e164 = z.string().regex(/^\+\d{10,15}$/)

const reservationCreateInput = z.object({
  restaurantId: z.string(),
  guestName: z.string().min(2),
  guestPhone: e164,
  guestEmail: z.string().email().optional(),
  partySize: z.number().int().positive(),
  date: z.coerce.date(),
  shiftId: z.string().optional(),
  tableId: z.string().optional(),
  occasion: z.string().optional(),
  notes: z.string().optional(),
  dietaryNotes: z.string().optional(),
  source: z.enum(['MANUAL', 'WIDGET', 'WHATSAPP', 'IFOOD', 'PHONE']).default('MANUAL'),
  lgpdConsent: z.boolean(),
})

async function createReservationCore(params: {
  ctx: any
  input: z.infer<typeof reservationCreateInput>
}) {
  const { ctx, input } = params

  if (input.tableId && input.shiftId) {
    const start = new Date(input.date)
    const end = new Date(input.date)
    end.setUTCHours(23, 59, 59, 999)
    start.setUTCHours(0, 0, 0, 0)

    const conflict = await ctx.prisma.reservation.findFirst({
      where: {
        restaurantId: input.restaurantId,
        tableId: input.tableId,
        shiftId: input.shiftId,
        date: { gte: start, lte: end },
        status: { in: ACTIVE_RESERVATION_STATUSES },
      },
      select: { id: true },
    })
    if (conflict) throw new TRPCError({ code: 'CONFLICT', message: 'Conflito de mesa' })
  }

  const restaurant = await ctx.prisma.restaurant.findUnique({
    where: { id: input.restaurantId },
    select: { id: true, prepaymentConfig: true, name: true },
  })
  if (!restaurant) throw new TRPCError({ code: 'NOT_FOUND', message: 'Restaurante não encontrado' })

  // Pagamento antecipado via Pix NUNCA se aplica a reservas criadas manualmente pelo operador.
  // O fluxo de Pix é exclusivo para reservas de origem WIDGET (auto-atendimento do cliente).
  const isWidgetSource = input.source === 'WIDGET'
  const prepaymentActive =
    isWidgetSource &&
    restaurant.prepaymentConfig != null &&
    typeof restaurant.prepaymentConfig === 'object' &&
    (restaurant.prepaymentConfig as Record<string, unknown>).prepayment_enabled === true
  const initialStatus: ReservationStatus = prepaymentActive ? 'PENDING_PAYMENT' : 'CONFIRMED'

  const token = nanoid(32)
  const expiresAt = confirmTokenExpiresAt(input.date)

  const customer = await ctx.prisma.customer.upsert({
    where: { restaurantId_phone: { restaurantId: input.restaurantId, phone: input.guestPhone } },
    update: {
      name: input.guestName,
      email: input.guestEmail,
      lgpdConsent: input.lgpdConsent,
      lgpdConsentAt: input.lgpdConsent ? new Date() : undefined,
      notes: input.notes,
      preferences: input.dietaryNotes ? { dietaryNotes: input.dietaryNotes } : undefined,
    },
    create: {
      restaurantId: input.restaurantId,
      name: input.guestName,
      phone: input.guestPhone,
      email: input.guestEmail,
      lgpdConsent: input.lgpdConsent,
      lgpdConsentAt: input.lgpdConsent ? new Date() : undefined,
      notes: input.notes,
      preferences: input.dietaryNotes ? { dietaryNotes: input.dietaryNotes } : undefined,
      tags: [],
    },
  })

  const reservation = await ctx.prisma.reservation.create({
    data: {
      restaurantId: input.restaurantId,
      customerId: customer.id,
      tableId: input.tableId,
      shiftId: input.shiftId,
      guestName: input.guestName,
      guestPhone: input.guestPhone,
      guestEmail: input.guestEmail,
      partySize: input.partySize,
      date: input.date,
      status: initialStatus,
      occasion: input.occasion,
      notes: input.notes,
      dietaryNotes: input.dietaryNotes,
      source: input.source as ReservationSource,
      confirmToken: token,
      confirmTokenExpiresAt: expiresAt,
      lgpdConsent: input.lgpdConsent,
      lgpdConsentAt: input.lgpdConsent ? new Date() : null,
      statusHistory: {
        create: { fromStatus: null, toStatus: initialStatus, changedBy: 'SYSTEM' },
      },
    },
    include: { restaurant: true, customer: true },
  })

  await sendNotification({
    restaurantId: reservation.restaurantId,
    trigger: 'RESERVATION_CREATED',
    reservation,
    locale: 'pt-BR',
  })

  if (reservation.lgpdConsent && reservation.customer?.lgpdConsent && reservation.customer.email) {
    await sendBcEvent({
      restaurantId: reservation.restaurantId,
      eventType: 'RESERVATION',
      customer: {
        email: reservation.customer.email,
        name: reservation.customer.name,
        phone: reservation.customer.phone,
        birthdate: reservation.customer.birthdate ?? undefined,
      },
      metadata: { groupSize: reservation.partySize, occasionType: reservation.occasion ?? undefined },
    })
  }

  return reservation
}

export const reservationsRouter = router({
  list: staffProcedure
    .input(
      z.object({
        restaurantId: z.string(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        status: z
          .enum([
            'PENDING',
            'PENDING_PAYMENT',
            'CONFIRMED',
            'CHECKED_IN',
            'FINISHED',
            'NO_SHOW',
            'CANCELLED',
          ])
          .optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const dateFilter = input.date
        ? {
            gte: new Date(`${input.date}T00:00:00.000Z`),
            lte: new Date(`${input.date}T23:59:59.999Z`),
          }
        : undefined

      return ctx.prisma.reservation.findMany({
        where: {
          restaurantId: input.restaurantId,
          ...(dateFilter ? { date: dateFilter } : {}),
          ...(input.status ? { status: input.status as any } : {}),
          ...(input.search
            ? {
                OR: [
                  { guestName: { contains: input.search, mode: 'insensitive' } },
                  { guestPhone: { contains: input.search } },
                ],
              }
            : {}),
        },
        include: { customer: true, table: true, server: true, shift: true },
        orderBy: { date: 'asc' },
      })
    }),

  getById: staffProcedure
    .input(z.object({ restaurantId: z.string(), reservationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const res = await ctx.prisma.reservation.findFirst({
        where: { id: input.reservationId, restaurantId: input.restaurantId },
        include: {
          customer: true,
          table: true,
          server: true,
          shift: true,
          statusHistory: { orderBy: { createdAt: 'asc' } },
          prepayment: true,
        },
      })
      if (!res) throw new TRPCError({ code: 'NOT_FOUND' })
      return res
    }),

  create: protectedProcedure.input(reservationCreateInput).mutation(({ ctx, input }) =>
    createReservationCore({ ctx, input })
  ),

  updateStatus: hostessProcedure
    .input(
      z.object({
        restaurantId: z.string(),
        reservationId: z.string(),
        status: z.enum([
          'PENDING',
          'PENDING_PAYMENT',
          'CONFIRMED',
          'CHECKED_IN',
          'FINISHED',
          'NO_SHOW',
          'CANCELLED',
        ]),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const authedCtx = ctx as typeof ctx & AuthedRestaurantCtx
      const reservation = await ctx.prisma.reservation.findFirst({
        where: { id: input.reservationId, restaurantId: input.restaurantId },
        include: { customer: true, restaurant: true },
      })
      if (!reservation) throw new TRPCError({ code: 'NOT_FOUND' })

      const from = reservation.status
      const to = input.status as ReservationStatus

      const updated = await ctx.prisma.$transaction(async (tx: any) => {
        const res = await tx.reservation.update({
          where: { id: reservation.id },
          data: {
            status: to,
            statusHistory: {
              create: {
                fromStatus: from,
                toStatus: to,
                changedBy: authedCtx.user.id,
                reason: input.reason,
              },
            },
          },
          include: { customer: true, restaurant: true },
        })

        if (res.customerId && (to === 'NO_SHOW' || to === 'FINISHED')) {
          const customer = await tx.customer.findUnique({ where: { id: res.customerId } })
          if (customer) {
            const nextNoShows = customer.noShowCount + (to === 'NO_SHOW' ? 1 : 0)
            const nextVisits = customer.visitCount + (to === 'FINISHED' ? 1 : 0)
            await tx.customer.update({
              where: { id: customer.id },
              data: {
                noShowCount: nextNoShows,
                visitCount: nextVisits,
                reliabilityScore: reliabilityScore({ noShowCount: nextNoShows, visitCount: nextVisits }),
              },
            })
          }
        }

        return res
      })

      if (updated.customerId && (to === 'FINISHED' || to === 'NO_SHOW')) {
        const autoTags = await ctx.prisma.autoTag.findMany({
          where: { restaurantId: input.restaurantId, isActive: true },
        })
        const customer = await ctx.prisma.customer.findUnique({ where: { id: updated.customerId } })
        if (customer && autoTags.length > 0) {
          const next = new Set(customer.tags)
          for (const t of autoTags) {
            const conditions = (t.conditions as any) as Array<{ field: string; operator: string; value: any }>
            const matched = conditions?.every((c) => {
              const currentVal = (customer as any)[c.field]
              if (c.field === 'tags' && c.operator === 'contains') {
                return Array.isArray(customer.tags) && customer.tags.includes(String(c.value))
              }
              if (c.operator === 'gte') return Number(currentVal) >= Number(c.value)
              if (c.operator === 'lte') return Number(currentVal) <= Number(c.value)
              if (c.operator === 'eq') return String(currentVal) === String(c.value)
              return false
            })
            if (matched) next.add(t.name)
            else next.delete(t.name)
          }
          await ctx.prisma.customer.update({ where: { id: customer.id }, data: { tags: Array.from(next) } })
        }
      }

      if (to === 'CANCELLED') {
        await sendNotification({ restaurantId: updated.restaurantId, trigger: 'CANCELLED', reservation: updated })
      }

      if (to === 'CHECKED_IN' && updated.lgpdConsent && updated.customer?.lgpdConsent && updated.customer.email) {
        await sendBcEvent({
          restaurantId: updated.restaurantId,
          eventType: 'CHECK_IN',
          customer: { email: updated.customer.email, name: updated.customer.name, phone: updated.customer.phone },
        })
      }

      if (to === 'FINISHED' && updated.lgpdConsent && updated.customer?.lgpdConsent && updated.customer.email) {
        await sendBcEvent({
          restaurantId: updated.restaurantId,
          eventType: 'CHECK_OUT',
          customer: { email: updated.customer.email, name: updated.customer.name, phone: updated.customer.phone },
          metadata: { groupSize: updated.partySize, occasionType: updated.occasion ?? undefined },
        })
      }

      return updated
    }),

  getByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
      const reservation = await ctx.prisma.reservation.findFirst({
        where: { confirmToken: input.token },
        include: { restaurant: true },
      })
      if (!reservation) throw new TRPCError({ code: 'NOT_FOUND' })
      return {
        reservation,
        restaurant: {
          name: reservation.restaurant.name,
          logoUrl: reservation.restaurant.logoUrl,
          themeConfig: reservation.restaurant.themeConfig,
        },
      }
    }),

  confirmByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const reservation = await ctx.prisma.reservation.findFirst({
        where: { confirmToken: input.token },
      })
      if (!reservation) throw new TRPCError({ code: 'NOT_FOUND' })
      if (reservation.confirmTokenExpiresAt && reservation.confirmTokenExpiresAt <= new Date()) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Token expirado' })
      }
      const updated = await ctx.prisma.reservation.update({
        where: { id: reservation.id },
        data: { status: 'CONFIRMED', confirmToken: null, confirmTokenExpiresAt: null },
      })
      return updated
    }),

  cancelByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const reservation = await ctx.prisma.reservation.findFirst({
        where: { confirmToken: input.token },
        include: { restaurant: true, customer: true },
      })
      if (!reservation) throw new TRPCError({ code: 'NOT_FOUND' })

      // Only allow cancelling reservations that are still in a cancellable state
      const cancellable: string[] = ['PENDING', 'PENDING_PAYMENT', 'CONFIRMED']
      if (!cancellable.includes(reservation.status)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Esta reserva não pode mais ser cancelada' })
      }

      const updated = await ctx.prisma.reservation.update({
        where: { id: reservation.id },
        data: {
          status: 'CANCELLED',
          statusHistory: {
            create: { fromStatus: reservation.status, toStatus: 'CANCELLED', changedBy: 'GUEST' },
          },
        },
        include: { restaurant: true, customer: true },
      })
      await sendNotification({ restaurantId: updated.restaurantId, trigger: 'CANCELLED', reservation: updated })
      return updated
    }),
})

