import { z } from 'zod'

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
    .query(async ({ ctx, input }) => {
      const restaurant = await ctx.prisma.restaurant.findUnique({
        where: { slug: input.slug },
        select: { id: true },
      })
      if (!restaurant) return []

      const day = new Date(`${input.date}T12:00:00.000Z`).getUTCDay()

      const shifts = await ctx.prisma.shift.findMany({
        where: { restaurantId: restaurant.id, isActive: true, daysOfWeek: { has: day } },
        orderBy: { startTime: 'asc' },
      })

      const start = new Date(`${input.date}T00:00:00.000Z`)
      const end = new Date(`${input.date}T23:59:59.999Z`)

      const activeStatuses = ['CONFIRMED', 'PENDING_PAYMENT', 'CHECKED_IN'] as const

      const counts = await ctx.prisma.reservation.groupBy({
        by: ['shiftId'],
        where: {
          restaurantId: restaurant.id,
          date: { gte: start, lte: end },
          shiftId: { not: null },
          status: { in: activeStatuses as any },
        },
        _sum: { partySize: true },
      })

      const takenByShift = new Map<string, number>()
      for (const c of counts) {
        if (c.shiftId) takenByShift.set(c.shiftId, c._sum.partySize ?? 0)
      }

      return shifts
        .map((s) => {
          const taken = takenByShift.get(s.id) ?? 0
          const max = s.maxCapacity ?? 0
          const available = max > 0 ? Math.max(0, max - taken) : 0
          return {
            shiftId: s.id,
            shiftName: s.name,
            startTime: s.startTime,
            endTime: s.endTime,
            area: null as string | null,
            availableSeats: available,
          }
        })
        .filter((x) => x.availableSeats >= input.partySize)
    }),
})

