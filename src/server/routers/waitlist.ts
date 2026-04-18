import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { sendWhatsApp } from '@/lib/zapi'
import { generateConfirmToken } from '@/lib/reservationRules'
import { publicProcedure, hostessProcedure, managerProcedure, staffProcedure, router } from '@/server/trpc'

const e164 = z.string().regex(/^\+\d{10,15}$/)

export const waitlistRouter = router({
  list: staffProcedure
    .input(z.object({ restaurantId: z.string(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
    .query(async ({ ctx, input }) => {
      const start = new Date(`${input.date}T00:00:00.000Z`)
      const end = new Date(`${input.date}T23:59:59.999Z`)
      return ctx.prisma.waitlistEntry.findMany({
        where: { restaurantId: input.restaurantId, date: { gte: start, lte: end } },
        orderBy: { position: 'asc' },
      })
    }),

  add: publicProcedure
    .input(
      z.object({
        restaurantId: z.string(),
        guestName: z.string().min(2),
        guestPhone: e164,
        guestEmail: z.string().email().optional(),
        partySize: z.number().int().positive(),
        date: z.coerce.date(),
        shiftId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const max = await ctx.prisma.waitlistEntry.aggregate({
        where: { restaurantId: input.restaurantId },
        _max: { position: true },
      })
      const position = (max._max.position ?? 0) + 1
      const token = generateConfirmToken()
      return ctx.prisma.waitlistEntry.create({
        data: {
          restaurantId: input.restaurantId,
          shiftId: input.shiftId,
          guestName: input.guestName,
          guestPhone: input.guestPhone,
          guestEmail: input.guestEmail,
          partySize: input.partySize,
          date: input.date,
          position,
          confirmToken: token,
          status: 'WAITING',
        },
      })
    }),

  notifyNext: hostessProcedure
    .input(z.object({ restaurantId: z.string(), waitlistEntryId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const entry = await ctx.prisma.waitlistEntry.findFirst({
        where: { id: input.waitlistEntryId, restaurantId: input.restaurantId },
      })
      if (!entry) throw new TRPCError({ code: 'NOT_FOUND' })

      const now = new Date()
      const deadline = new Date(now.getTime() + 15 * 60 * 1000)
      const token = entry.confirmToken ?? generateConfirmToken()

      const updated = await ctx.prisma.waitlistEntry.update({
        where: { id: entry.id },
        data: { status: 'NOTIFIED', notifiedAt: now, responseDeadline: deadline, confirmToken: token },
      })

      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
      const confirmUrl = `${appUrl}/confirmar/${token}`
      const cancelUrl = `${appUrl}/confirmar/${token}?action=cancel`
      await sendWhatsApp(
        updated.guestPhone,
        `🎉 *Mesa disponível!* Você tem 15 minutos para confirmar: ${confirmUrl}\nCancelar: ${cancelUrl}`
      )

      return updated
    }),

  confirmFromWaitlist: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const entry = await ctx.prisma.waitlistEntry.findFirst({ where: { confirmToken: input.token } })
      if (!entry) throw new TRPCError({ code: 'NOT_FOUND' })
      if (entry.responseDeadline && entry.responseDeadline <= new Date()) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Prazo expirado' })
      }

      // cria reserva automática (mínimo para MVP)
      const reservation = await ctx.prisma.reservation.create({
        data: {
          restaurantId: entry.restaurantId,
          guestName: entry.guestName,
          guestPhone: entry.guestPhone,
          guestEmail: entry.guestEmail,
          partySize: entry.partySize,
          date: entry.date,
          shiftId: entry.shiftId,
          status: 'CONFIRMED',
          source: 'WIDGET',
          confirmToken: null,
          confirmTokenExpiresAt: null,
          lgpdConsent: false,
          statusHistory: { create: { fromStatus: null, toStatus: 'CONFIRMED', changedBy: 'SYSTEM' } },
        },
      })

      await ctx.prisma.waitlistEntry.update({
        where: { id: entry.id },
        data: { status: 'CONFIRMED' },
      })

      return reservation
    }),

  declineFromWaitlist: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const entry = await ctx.prisma.waitlistEntry.findFirst({ where: { confirmToken: input.token } })
      if (!entry) throw new TRPCError({ code: 'NOT_FOUND' })
      const updated = await ctx.prisma.waitlistEntry.update({
        where: { id: entry.id },
        data: { status: 'DECLINED' },
      })
      return updated
    }),

  remove: managerProcedure
    .input(z.object({ restaurantId: z.string(), waitlistEntryId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.waitlistEntry.delete({ where: { id: input.waitlistEntryId } })
      return { ok: true }
    }),
})

