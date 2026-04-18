import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/crypto'
import { DEFAULT_TEMPLATES } from '@/lib/notifications'
import { managerProcedure, ownerProcedure, protectedProcedure, publicProcedure, router, staffProcedure } from '@/server/trpc'

const addressSchema = z.record(z.string(), z.unknown())

export const restaurantRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2),
        slug: z.string().min(2),
        phone: z.string().min(8),
        address: addressSchema,
        cnpj: z.string().optional(),
        businessType: z.enum(['bar', 'casual', 'fine_dining', 'lounge', 'cafe']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.restaurant.findUnique({ where: { slug: input.slug } })
      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `O slug "${input.slug}" já está em uso. Escolha outro.`,
        })
      }

      const restaurant = await ctx.prisma.restaurant.create({
        data: {
          name: input.name,
          slug: input.slug,
          phone: input.phone,
          address: input.address as any,
          cnpj: input.cnpj,
          operatingHours: {},
          users: { create: { userId: ctx.user.id, role: 'OWNER' } },
        },
      })

      const templateRows = Object.entries(DEFAULT_TEMPLATES).flatMap(([trigger, channels]) =>
        Object.entries(channels).map(([channel, templatePtBr]) => ({
          restaurantId: restaurant.id,
          trigger: trigger as any,
          channel: channel as any,
          templatePtBr: templatePtBr as string,
          isActive: true,
        }))
      )

      await ctx.prisma.notificationTemplate.createMany({ data: templateRows, skipDuplicates: true })

      // Defaults inteligentes por tipo de estabelecimento
      const defaults: Record<
        string,
        { shifts: Array<{ name: string; start: string; end: string; days: number[]; cap: number; dur: number }>; tables: number }
      > = {
        bar: {
          shifts: [
            { name: 'Happy Hour', start: '17:00', end: '20:00', days: [1, 2, 3, 4, 5], cap: 40, dur: 90 },
            { name: 'Noite', start: '20:00', end: '01:00', days: [3, 4, 5, 6], cap: 60, dur: 120 },
          ],
          tables: 10,
        },
        casual: {
          shifts: [
            { name: 'Almoço', start: '12:00', end: '15:00', days: [0, 1, 2, 3, 4, 5, 6], cap: 80, dur: 90 },
            { name: 'Jantar', start: '19:00', end: '23:00', days: [0, 1, 2, 3, 4, 5, 6], cap: 80, dur: 120 },
          ],
          tables: 15,
        },
        fine_dining: {
          shifts: [
            { name: 'Almoço', start: '12:00', end: '14:30', days: [2, 3, 4, 5, 6], cap: 40, dur: 120 },
            { name: 'Jantar', start: '19:30', end: '23:00', days: [2, 3, 4, 5, 6], cap: 40, dur: 150 },
          ],
          tables: 12,
        },
        lounge: {
          shifts: [{ name: 'Noite', start: '21:00', end: '03:00', days: [4, 5, 6], cap: 100, dur: 120 }],
          tables: 20,
        },
        cafe: {
          shifts: [
            { name: 'Manhã', start: '08:00', end: '12:00', days: [0, 1, 2, 3, 4, 5, 6], cap: 30, dur: 60 },
            { name: 'Tarde', start: '14:00', end: '18:00', days: [0, 1, 2, 3, 4, 5, 6], cap: 30, dur: 60 },
          ],
          tables: 8,
        },
      }

      const preset = defaults[input.businessType ?? 'casual']
      if (preset) {
        for (const s of preset.shifts) {
          await ctx.prisma.shift.create({
            data: {
              restaurantId: restaurant.id,
              name: s.name,
              startTime: s.start,
              endTime: s.end,
              daysOfWeek: s.days,
              maxCapacity: s.cap,
              turnDuration: s.dur,
            },
          })
        }
        for (let i = 1; i <= preset.tables; i++) {
          await ctx.prisma.table.create({
            data: {
              restaurantId: restaurant.id,
              name: `Mesa ${i}`,
              capacity: 4,
              minCapacity: 1,
              area: 'Salão',
              posX: (i % 5) * 120 + 60,
              posY: Math.floor((i - 1) / 5) * 120 + 60,
            },
          })
        }
      }

      return restaurant
    }),

  getById: staffProcedure
    .input(z.object({ restaurantId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.restaurant.findFirst({
        where: { id: input.restaurantId },
        select: {
          id: true,
          name: true,
          slug: true,
          noShowProtectionAddon: true,
          prepaymentConfig: true,
          googlePlaceId: true,
          occupationStatus: true,
          occupationUpdatedAt: true,
        },
      })
    }),

  getOccupationStatus: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const restaurant = await ctx.prisma.restaurant.findUnique({
        where: { slug: input.slug },
        select: { occupationStatus: true, occupationUpdatedAt: true, name: true },
      })
      if (!restaurant) return null
      return restaurant
    }),

  updateOccupationStatus: managerProcedure
    .input(
      z.object({
        restaurantId: z.string(),
        status: z.enum(['OPEN', 'BUSY', 'FULL']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.restaurant.update({
        where: { id: input.restaurantId },
        data: {
          occupationStatus: input.status,
          occupationUpdatedAt: new Date(),
        },
      })
    }),

  toggleNoShowProtection: protectedProcedure
    .input(
      z.object({
        restaurantId: z.string(),
        enabled: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.restaurant.update({
        where: { id: input.restaurantId },
        data: { noShowProtectionAddon: input.enabled },
      })
    }),

  getMyRestaurant: protectedProcedure.query(async ({ ctx }) => {
    const membership = await ctx.prisma.userRestaurant.findFirst({
      where: { userId: ctx.user.id },
      include: { restaurant: true },
      orderBy: { createdAt: 'asc' },
    })
    return membership?.restaurant ?? null
  }),

  getMyRestaurants: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await ctx.prisma.userRestaurant.findMany({
      where: { userId: ctx.user.id },
      include: { restaurant: true },
      orderBy: { createdAt: 'asc' },
    })
    return memberships.map(m => ({ restaurant: m.restaurant, role: m.role }))
  }),

  update: ownerProcedure
    .input(
      z.object({
        restaurantId: z.string(),
        name: z.string().min(2).optional(),
        phone: z.string().min(8).optional(),
        address: addressSchema.optional(),
        cnpj: z.string().optional(),
        operatingHours: z.unknown().optional(),
        googlePlaceId: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.restaurant.update({
        where: { id: input.restaurantId },
        data: {
          name: input.name,
          phone: input.phone,
          address: input.address as any,
          cnpj: input.cnpj,
          operatingHours: input.operatingHours as any,
          googlePlaceId: input.googlePlaceId === undefined ? undefined : input.googlePlaceId,
        },
      })
    }),

  updateTheme: ownerProcedure
    .input(
      z.object({
        restaurantId: z.string(),
        primaryColor: z.string(),
        secondaryColor: z.string(),
        accentColor: z.string(),
        fontFamily: z.string(),
        borderRadius: z.string(),
        logoUrl: z.string().url().optional(),
        coverUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.restaurant.update({
        where: { id: input.restaurantId },
        data: {
          themeConfig: {
            primaryColor: input.primaryColor,
            secondaryColor: input.secondaryColor,
            accentColor: input.accentColor,
            fontFamily: input.fontFamily,
            borderRadius: input.borderRadius,
          },
          logoUrl: input.logoUrl,
          coverUrl: input.coverUrl,
        },
      })
    }),

  updateOnboardingStep: ownerProcedure
    .input(
      z.object({
        restaurantId: z.string(),
        step: z.enum(['restaurant', 'shifts', 'tables', 'notifications']),
        completed: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const restaurant = await ctx.prisma.restaurant.findUnique({
        where: { id: input.restaurantId },
        select: { onboardingStatus: true },
      })
      const status = (restaurant?.onboardingStatus ?? {}) as Record<string, boolean>
      status[input.step] = input.completed
      return ctx.prisma.restaurant.update({
        where: { id: input.restaurantId },
        data: { onboardingStatus: status as any },
      })
    }),

  connectBcConnect: ownerProcedure
    .input(
      z.object({
        restaurantId: z.string(),
        partnerId: z.string().min(1),
        apiKey: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const encrypted = encrypt(input.apiKey)
      return ctx.prisma.restaurant.update({
        where: { id: input.restaurantId },
        data: { bcConnectPartnerId: input.partnerId, bcConnectApiKey: encrypted },
      })
    }),

  updatePrepaymentConfig: ownerProcedure
    .input(
      z.object({
        restaurantId: z.string(),
        prepayment_enabled: z.boolean().optional(),
        prepayment_type: z.enum(['POR_PESSOA', 'VALOR_FIXO', 'PERCENTUAL']).optional(),
        prepayment_amount: z.number().min(0).optional(),
        prepayment_applies_to: z.enum(['TODAS_RESERVAS', 'FERIADOS', 'FINAIS_DE_SEMANA', 'MANUAL']).optional(),
        no_show_policy: z.enum(['COBRAR_TOTAL', 'COBRAR_PARCIAL', 'REEMBOLSAR', 'CREDITO']).optional(),
        cancellation_deadline_hours: z.number().int().min(0).optional(),
        prepayment_expiry_minutes: z.number().int().min(5).optional(),
        upsell_occasions: z.array(z.string()).optional(),
        upsell_message: z.string().optional(),
        upsell_package_name: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { restaurantId, ...patch } = input
      const row = await ctx.prisma.restaurant.findUnique({
        where: { id: restaurantId },
        select: { prepaymentConfig: true, noShowProtectionAddon: true },
      })
      const prev = (row?.prepaymentConfig ?? {}) as Record<string, unknown>
      const merged: Record<string, unknown> = { ...prev }
      for (const [k, v] of Object.entries(patch)) {
        if (v !== undefined) merged[k] = v
      }
      const enabled = merged.prepayment_enabled === true
      if (enabled && !row?.noShowProtectionAddon) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Ative o add-on de Proteção No-Show antes de habilitar o pagamento antecipado.',
        })
      }
      if (merged.prepayment_enabled === false) {
        merged.prepayment_enabled = false
      }
      return ctx.prisma.restaurant.update({
        where: { id: restaurantId },
        data: { prepaymentConfig: merged as any },
      })
    }),

  getPrepaymentConfig: ownerProcedure
    .input(z.object({ restaurantId: z.string() }))
    .query(async ({ ctx, input }) => {
      const r = await ctx.prisma.restaurant.findUnique({
        where: { id: input.restaurantId },
        select: { prepaymentConfig: true, plan: true, noShowProtectionAddon: true },
      })
      return {
        config: r?.prepaymentConfig ?? null,
        plan: r?.plan ?? 'GRATUITO',
        noShowProtectionAddon: r?.noShowProtectionAddon ?? false,
      }
    }),

  getPublicInfo: staffProcedure
    .input(z.object({ restaurantId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.restaurant.findUnique({
        where: { id: input.restaurantId },
        select: { slug: true, name: true },
      })
    }),

  getBlockedDates: staffProcedure
    .input(z.object({ restaurantId: z.string() }))
    .query(async ({ ctx, input }) => {
      const r = await ctx.prisma.restaurant.findUnique({
        where: { id: input.restaurantId },
        select: { settings: true },
      })
      const settings = (r?.settings ?? {}) as Record<string, unknown>
      return (settings.blockedDates ?? []) as string[]
    }),

  setBlockedDates: ownerProcedure
    .input(z.object({ restaurantId: z.string(), blockedDates: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const r = await ctx.prisma.restaurant.findUnique({
        where: { id: input.restaurantId },
        select: { settings: true },
      })
      const existing = ((r?.settings ?? {}) as Record<string, unknown>)
      const next = { ...existing, blockedDates: input.blockedDates }
      return ctx.prisma.restaurant.update({
        where: { id: input.restaurantId },
        data: { settings: next as any },
      })
    }),
})
