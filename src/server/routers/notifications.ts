import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { sendNotification } from '@/lib/notifications'
import { managerProcedure, staffProcedure, router } from '@/server/trpc'

export const notificationsRouter = router({
  listTemplates: staffProcedure
    .input(z.object({ restaurantId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.notificationTemplate.findMany({
        where: { restaurantId: input.restaurantId },
        orderBy: [{ trigger: 'asc' }, { channel: 'asc' }],
      })
    }),

  updateTemplate: managerProcedure
    .input(
      z.object({
        restaurantId: z.string(),
        trigger: z.enum([
          'RESERVATION_CREATED',
          'REMINDER_24H',
          'REMINDER_2H',
          'PAYMENT_CONFIRMED',
          'WAITLIST_AVAILABLE',
          'POST_VISIT',
          'CANCELLED',
        ]),
        channel: z.enum(['WHATSAPP', 'EMAIL']),
        templatePtBr: z.string().min(1),
        templateEn: z.string().optional(),
        templateEs: z.string().optional(),
        isActive: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.notificationTemplate.upsert({
        where: {
          restaurantId_trigger_channel: {
            restaurantId: input.restaurantId,
            trigger: input.trigger as any,
            channel: input.channel as any,
          },
        },
        update: {
          templatePtBr: input.templatePtBr,
          templateEn: input.templateEn,
          templateEs: input.templateEs,
          isActive: input.isActive,
        },
        create: {
          restaurantId: input.restaurantId,
          trigger: input.trigger as any,
          channel: input.channel as any,
          templatePtBr: input.templatePtBr,
          templateEn: input.templateEn,
          templateEs: input.templateEs,
          isActive: input.isActive,
        },
      })
    }),

  sendTest: managerProcedure
    .input(
      z.object({
        restaurantId: z.string(),
        trigger: z.enum([
          'RESERVATION_CREATED',
          'REMINDER_24H',
          'REMINDER_2H',
          'PAYMENT_CONFIRMED',
          'WAITLIST_AVAILABLE',
          'POST_VISIT',
          'CANCELLED',
        ]),
        channel: z.enum(['WHATSAPP', 'EMAIL']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const reservation = await ctx.prisma.reservation.findFirst({
        where: { restaurantId: input.restaurantId },
        include: { restaurant: true, customer: true },
        orderBy: { createdAt: 'desc' },
      })
      if (!reservation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Nenhuma reserva encontrada para teste' })
      }
      await sendNotification({
        restaurantId: input.restaurantId,
        trigger: input.trigger as any,
        reservation,
      })
      return { ok: true }
    }),
})

