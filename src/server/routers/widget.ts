import { z } from 'zod'

import { rateLimitOrThrow } from '@/lib/rateLimit'
import { createWidgetReservation, getWidgetAvailability } from '@/lib/widgetPublic'
import { publicProcedure, router } from '@/server/trpc'

const e164 = z.string().regex(/^\+\d{10,15}$/)

export const widgetRouter = router({
  getRestaurantInfo: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.restaurant.findUnique({
        where: { slug: input.slug },
        select: { name: true, logoUrl: true, coverUrl: true, themeConfig: true, operatingHours: true, slug: true },
      })
    }),

  getAvailableSlots: publicProcedure
    .input(z.object({ slug: z.string(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), partySize: z.number().int().positive() }))
    .query(async ({ input }) => {
      // simple in-router limiter: 60/min per pseudo-key (slug+date)
      rateLimitOrThrow({ key: `widget:availability:${input.slug}:${input.date}`, limit: 60, windowMs: 60_000 })
      return getWidgetAvailability({ slug: input.slug, date: input.date, partySize: input.partySize })
    }),

  createReservation: publicProcedure
    .input(
      z.object({
        slug: z.string(),
        guestName: z.string().min(2),
        guestPhone: e164,
        guestEmail: z.string().email().optional(),
        partySize: z.number().int().positive(),
        date: z.coerce.date(),
        shiftId: z.string(),
        occasion: z.string().optional(),
        dietaryNotes: z.string().optional(),
        lgpdConsent: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      rateLimitOrThrow({ key: `widget:create:${input.slug}`, limit: 10, windowMs: 60_000 })
      return createWidgetReservation({
        slug: input.slug,
        guestName: input.guestName,
        guestPhone: input.guestPhone,
        guestEmail: input.guestEmail,
        partySize: input.partySize,
        date: input.date,
        shiftId: input.shiftId,
        occasion: input.occasion,
        dietaryNotes: input.dietaryNotes,
        lgpdConsent: input.lgpdConsent,
      })
    }),
})

