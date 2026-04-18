import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { rateLimitOrThrow } from '@/lib/rateLimit'
import { sendWhatsApp } from '@/lib/zapi'
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
      const restaurant = await ctx.prisma.restaurant.findUnique({
        where: { slug: input.slug },
        select: {
          id: true,
          name: true, logoUrl: true, coverUrl: true,
          themeConfig: true, operatingHours: true, slug: true,
          settings: true,
          occupationStatus: true,
          googlePlaceId: true,
          prepaymentConfig: true,
          shifts: { where: { isActive: true }, select: { daysOfWeek: true, name: true } },
        },
      })
      if (!restaurant) return null
      const { prepaymentConfig, ...restaurantPublic } = restaurant
      // Derive active days of week from shifts (0=Sun … 6=Sat)
      const activeDaysOfWeek = [...new Set(restaurant.shifts.flatMap((s) => s.daysOfWeek))] as number[]
      // Blocked dates stored in restaurant.settings.blockedDates
      const settings = (restaurant.settings ?? {}) as Record<string, unknown>
      const blockedDates = (settings.blockedDates ?? []) as string[]
      const cfg = prepaymentConfig as Record<string, unknown> | null
      const upsellConfig = cfg
        ? {
            occasions: (cfg.upsell_occasions ?? []) as string[],
            message: (cfg.upsell_message ?? '') as string,
            packageName: (cfg.upsell_package_name ?? '') as string,
          }
        : null
      return {
        ...restaurantPublic,
        activeDaysOfWeek,
        blockedDates,
        upsellConfig,
      }
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
        originType: z.string().optional(),
        visitFrequency: z.string().optional(),
        consumptionPreferences: z.array(z.string()).optional(),
        referralSource: z.string().optional(),
        optinMarketing: z.boolean().optional(),
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
        originType: input.originType,
        visitFrequency: input.visitFrequency,
        consumptionPreferences: input.consumptionPreferences,
        referralSource: input.referralSource,
        optinMarketing: input.optinMarketing,
      })
    }),

  // Called by the widget to poll payment status after showing the Pix QR
  getPaymentStatus: publicProcedure
    .input(z.object({ prepaymentRecordId: z.string() }))
    .query(async ({ ctx, input }) => {
      const record = await ctx.prisma.prepaymentRecord.findUnique({
        where: { id: input.prepaymentRecordId },
        select: { status: true, expiresAt: true },
      })
      if (!record) return { status: 'NOT_FOUND' as const }
      return { status: record.status, expiresAt: record.expiresAt }
    }),

  getReservationByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
      const reservation = await ctx.prisma.reservation.findFirst({
        where: { confirmToken: input.token },
        include: { restaurant: { select: { name: true, googlePlaceId: true } } },
      })
      return reservation
    }),

  submitReview: publicProcedure
    .input(
      z.object({
        token: z.string(),
        rating: z.number().int().min(1).max(5),
        comment: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const reservation = await ctx.prisma.reservation.findFirst({
        where: { confirmToken: input.token },
        include: { restaurant: { select: { googlePlaceId: true, phone: true, name: true } } },
      })
      if (!reservation) throw new TRPCError({ code: 'NOT_FOUND', message: 'Reserva não encontrada' })

      if (reservation.customerId) {
        const existingRow = await ctx.prisma.customer.findUnique({
          where: { id: reservation.customerId },
          select: { preferences: true },
        })
        const existing = (existingRow?.preferences ?? {}) as Record<string, unknown>

        await ctx.prisma.customer.update({
          where: { id: reservation.customerId },
          data: {
            preferences: {
              ...existing,
              lastReview: { rating: input.rating, comment: input.comment, date: new Date().toISOString() },
            } as any,
          },
        })
      }

      if (input.rating <= 3 && reservation.restaurant?.phone) {
        const comment = input.comment ? `\n💬 "${input.comment}"` : ''
        const when = format(new Date(reservation.date), "dd/MM 'às' HH:mm", { locale: ptBR })
        await sendWhatsApp(
          reservation.restaurant.phone,
          `⚠️ *Avaliação negativa recebida*\n\n` +
            `Cliente: ${reservation.guestName}\n` +
            `Nota: ${'⭐'.repeat(input.rating)}\n` +
            `Reserva: ${when}` +
            comment,
        )
      }

      const googleReviewUrl = reservation.restaurant?.googlePlaceId
        ? `https://search.google.com/local/writereview?placeid=${reservation.restaurant.googlePlaceId}`
        : null

      return { ok: true as const, googleReviewUrl }
    }),
})
