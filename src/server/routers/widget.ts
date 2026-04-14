import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { rateLimitOrThrow } from '@/lib/rateLimit'
import { createWidgetReservation, getWidgetAvailability } from '@/lib/widgetPublic'
import { publicProcedure, router } from '@/server/trpc'

const e164 = z.string().regex(/^\+\d{10,15}$/)

/** Converts a RATE_LIMITED error from rateLimitOrThrow into a TRPCError (429). */
async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<void> {
  try {
    await rateLimitOrThrow({ key, limit, windowMs })
  } catch (err: unknown) {
    if ((err as any)?.code === 'RATE_LIMITED') {
      const retry = (err as any).retryAfterSeconds as number
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: `Muitas requisições. Tente novamente em ${retry}s.`,
      })
    }
    // Unexpected DB error — log and fail open to avoid blocking legitimate users
    console.error('[RateLimit] Falha ao verificar limite:', (err as Error).message)
  }
}

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
    .input(z.object({
      slug: z.string(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      partySize: z.number().int().positive(),
    }))
    .query(async ({ input }) => {
      await checkRateLimit(`widget:availability:${input.slug}:${input.date}`, 60, 60_000)
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
      await checkRateLimit(`widget:create:${input.slug}`, 10, 60_000)
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
