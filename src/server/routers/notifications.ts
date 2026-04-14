import { z } from 'zod'

import { sendWhatsApp } from '@/lib/zapi'
import { DEFAULT_TEMPLATES } from '@/lib/notifications'
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
        phone: z.string().min(8),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const template =
        (DEFAULT_TEMPLATES as any)[input.trigger]?.WHATSAPP ??
        'Teste TeMesa para {{restaurantName}} (trigger: {{trigger}})'
      const restaurant = await ctx.prisma.restaurant.findUnique({
        where: { id: input.restaurantId },
        select: { name: true },
      })
      const msg = String(template)
        .replaceAll('{{guestName}}', 'Cliente Teste')
        .replaceAll('{{restaurantName}}', restaurant?.name ?? 'Restaurante')
        .replaceAll('{{date}}', '01/01/2026')
        .replaceAll('{{time}}', '19:00')
        .replaceAll('{{partySize}}', '2')
        .replaceAll('{{shiftName}}', 'Jantar')
        .replaceAll('{{tableArea}}', 'Salão')
        .replaceAll('{{confirmUrl}}', 'https://example.com/confirm')
        .replaceAll('{{cancelUrl}}', 'https://example.com/cancel')
        .replaceAll('{{reviewUrl}}', 'https://example.com/review')
        .replaceAll('{{trigger}}', input.trigger)

      await sendWhatsApp(input.phone, msg)
      return { ok: true }
    }),
})

