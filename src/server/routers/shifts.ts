import { z } from 'zod'

import { getWidgetAvailability } from '@/lib/widgetPublic'
import { publicProcedure, managerProcedure, staffProcedure, router } from '@/server/trpc'

const hhmm = z.string().regex(/^\d{2}:\d{2}$/)

export const shiftsRouter = router({
  list: staffProcedure
    .input(z.object({ restaurantId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.shift.findMany({
        where: { restaurantId: input.restaurantId, isActive: true },
        orderBy: { startTime: 'asc' },
      })
    }),

  create: managerProcedure
    .input(
      z.object({
        restaurantId: z.string(),
        name: z.string().min(2),
        startTime: hhmm,
        endTime: hhmm,
        daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1),
        maxCapacity: z.number().int().positive().optional(),
        turnDuration: z.number().int().positive().optional(),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.shift.create({
        data: {
          restaurantId: input.restaurantId,
          name: input.name,
          startTime: input.startTime,
          endTime: input.endTime,
          daysOfWeek: input.daysOfWeek,
          maxCapacity: input.maxCapacity,
          turnDuration: input.turnDuration ?? 90,
          isActive: input.isActive,
        },
      })
    }),

  update: managerProcedure
    .input(
      z.object({
        restaurantId: z.string(),
        shiftId: z.string(),
        name: z.string().min(2).optional(),
        startTime: hhmm.optional(),
        endTime: hhmm.optional(),
        daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
        maxCapacity: z.number().int().positive().nullable().optional(),
        turnDuration: z.number().int().positive().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.shift.update({
        where: { id: input.shiftId, restaurantId: input.restaurantId },
        data: {
          name: input.name,
          startTime: input.startTime,
          endTime: input.endTime,
          daysOfWeek: input.daysOfWeek,
          maxCapacity: input.maxCapacity ?? undefined,
          turnDuration: input.turnDuration,
          isActive: input.isActive,
        },
      })
    }),

  delete: managerProcedure
    .input(z.object({ restaurantId: z.string(), shiftId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.shift.update({ where: { id: input.shiftId, restaurantId: input.restaurantId }, data: { isActive: false } })
    }),

  getAvailableSlots: publicProcedure
    .input(
      z.object({
        slug: z.string(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        partySize: z.number().int().positive(),
      })
    )
    .query(async ({ input }) => {
      return getWidgetAvailability({ slug: input.slug, date: input.date, partySize: input.partySize })
    }),
})

