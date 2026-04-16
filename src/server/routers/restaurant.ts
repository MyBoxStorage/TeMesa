import { z } from 'zod'

import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/crypto'
import { DEFAULT_TEMPLATES } from '@/lib/notifications'
import { protectedProcedure, ownerProcedure, router, staffProcedure } from '@/server/trpc'

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
      })
    )
    .mutation(async ({ ctx, input }) => {
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

      return restaurant
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
        prepayment_enabled: z.boolean(),
        prepayment_type: z.enum(['POR_PESSOA', 'VALOR_FIXO', 'PERCENTUAL']).optional(),
        prepayment_amount: z.number().min(0).optional(),
        prepayment_applies_to: z.enum(['TODAS_RESERVAS', 'FERIADOS', 'FINAIS_DE_SEMANA', 'MANUAL']).optional(),
        no_show_policy: z.enum(['COBRAR_TOTAL', 'COBRAR_PARCIAL', 'REEMBOLSAR', 'CREDITO']).optional(),
        cancellation_deadline_hours: z.number().int().min(0).optional(),
        prepayment_expiry_minutes: z.number().int().min(5).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { restaurantId, ...config } = input
      const data = config.prepayment_enabled ? config : { prepayment_enabled: false }
      return ctx.prisma.restaurant.update({
        where: { id: restaurantId },
        data: { prepaymentConfig: data as any },
      })
    }),

  getPrepaymentConfig: ownerProcedure
    .input(z.object({ restaurantId: z.string() }))
    .query(async ({ ctx, input }) => {
      const r = await ctx.prisma.restaurant.findUnique({
        where: { id: input.restaurantId },
        select: { prepaymentConfig: true, plan: true },
      })
      return { config: r?.prepaymentConfig ?? null, plan: r?.plan ?? 'GRATUITO' }
    }),

  getPublicInfo: staffProcedure
    .input(z.object({ restaurantId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.restaurant.findUnique({
        where: { id: input.restaurantId },
        select: { slug: true, name: true },
      })
    }),
})
