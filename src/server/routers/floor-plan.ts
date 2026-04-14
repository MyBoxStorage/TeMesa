import { z } from 'zod'

import { managerProcedure, protectedProcedure, publicProcedure, router } from '@/server/trpc'

export const floorPlanRouter = router({
  get: protectedProcedure
    .input(z.object({ restaurantId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.floorPlan.findUnique({
        where: { restaurantId: input.restaurantId },
        select: { canvasData: true, floorTemplate: true, areas: true, updatedAt: true },
      })
    }),

  save: managerProcedure
    .input(
      z.object({
        restaurantId: z.string(),
        canvasData: z.unknown(),
        floorTemplate: z.string().min(1),
        areas: z.array(z.string()).min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const plan = await ctx.prisma.floorPlan.upsert({
        where: { restaurantId: input.restaurantId },
        create: {
          restaurantId: input.restaurantId,
          canvasData: input.canvasData as any,
          floorTemplate: input.floorTemplate,
          areas: input.areas,
        },
        update: {
          canvasData: input.canvasData as any,
          floorTemplate: input.floorTemplate,
          areas: input.areas,
        },
      })
      return plan
    }),

  getPublic: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const restaurant = await ctx.prisma.restaurant.findUnique({
        where: { slug: input.slug },
        select: { id: true },
      })
      if (!restaurant) return null
      const plan = await ctx.prisma.floorPlan.findUnique({
        where: { restaurantId: restaurant.id },
        select: { canvasData: true, floorTemplate: true, areas: true, updatedAt: true },
      })
      return plan
    }),
})

