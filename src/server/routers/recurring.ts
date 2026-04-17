import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { router, staffProcedure } from '@/server/trpc'

export const recurringRouter = router({
  list: staffProcedure
    .input(
      z.object({
        restaurantId: z.string(),
        customerId: z.string().optional(),
        activeOnly: z.boolean().optional().default(false),
      })
    )
    .query(({ ctx, input }) =>
      ctx.prisma.recurringReservation.findMany({
        where: {
          restaurantId: input.restaurantId,
          ...(input.customerId ? { customerId: input.customerId } : {}),
          ...(input.activeOnly ? { isActive: true } : {}),
        },
        include: { customer: true },
        orderBy: { dayOfWeek: 'asc' },
      })
    ),

  create: staffProcedure
    .input(
      z.object({
        restaurantId: z.string(),
        customerId: z.string(),
        tableId: z.string().optional(),
        shiftId: z.string().optional(),
        dayOfWeek: z.number().int().min(0).max(6),
        partySize: z.number().int().positive(),
        notes: z.string().optional(),
      })
    )
    .mutation(({ ctx, input }) =>
      ctx.prisma.recurringReservation.create({ data: input })
    ),

  toggle: staffProcedure
    .input(z.object({ id: z.string(), restaurantId: z.string(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.recurringReservation.findFirst({
        where: { id: input.id, restaurantId: input.restaurantId },
      })
      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Recorrência não encontrada' })
      }
      return ctx.prisma.recurringReservation.update({
        where: { id: input.id },
        data: { isActive: input.isActive },
      })
    }),

  delete: staffProcedure
    .input(z.object({ id: z.string(), restaurantId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.recurringReservation.findFirst({
        where: { id: input.id, restaurantId: input.restaurantId },
      })
      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Recorrência não encontrada' })
      }
      return ctx.prisma.recurringReservation.delete({ where: { id: input.id } })
    }),
})
