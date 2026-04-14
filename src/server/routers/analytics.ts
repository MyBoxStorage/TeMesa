import { z } from 'zod'

import { staffProcedure, router } from '@/server/trpc'

export const analyticsRouter = router({
  getDashboard: staffProcedure
    .input(z.object({ restaurantId: z.string() }))
    .query(async ({ ctx, input }) => {
      const now = new Date()
      const yyyy = now.getUTCFullYear()
      const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
      const dd = String(now.getUTCDate()).padStart(2, '0')
      const today = `${yyyy}-${mm}-${dd}`
      const start = new Date(`${today}T00:00:00.000Z`)
      const end = new Date(`${today}T23:59:59.999Z`)

      const reservasHoje = await ctx.prisma.reservation.count({
        where: { restaurantId: input.restaurantId, date: { gte: start, lte: end } },
      })

      const coversAgg = await ctx.prisma.reservation.aggregate({
        where: { restaurantId: input.restaurantId, date: { gte: start, lte: end }, status: 'CONFIRMED' as any },
        _sum: { partySize: true },
      })
      const coversHoje = coversAgg._sum.partySize ?? 0

      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
      const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999))
      const noShowsMes = await ctx.prisma.reservation.count({
        where: { restaurantId: input.restaurantId, status: 'NO_SHOW' as any, date: { gte: monthStart, lte: monthEnd } },
      })

      const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const clientesNovos30dias = await ctx.prisma.customer.count({
        where: { restaurantId: input.restaurantId, createdAt: { gte: d30 } },
      })

      const reservasPorCanal = await ctx.prisma.reservation.groupBy({
        by: ['source'],
        where: { restaurantId: input.restaurantId },
        _count: { _all: true },
      })
      const reservasPorStatus = await ctx.prisma.reservation.groupBy({
        by: ['status'],
        where: { restaurantId: input.restaurantId },
        _count: { _all: true },
      })

      return {
        reservasHoje,
        coversHoje,
        taxaOcupacao: 0,
        noShowsMes,
        clientesNovos30dias,
        reservasPorCanal: Object.fromEntries(reservasPorCanal.map((r) => [r.source, r._count._all])),
        reservasPorStatus: Object.fromEntries(reservasPorStatus.map((r) => [r.status, r._count._all])),
      }
    }),

  getOccupancy30Days: staffProcedure
    .input(z.object({ restaurantId: z.string() }))
    .query(async ({ ctx, input }) => {
      const now = new Date()
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const reservations = await ctx.prisma.reservation.findMany({
        where: { restaurantId: input.restaurantId, date: { gte: start } },
        select: { date: true, partySize: true },
      })
      const byDate = new Map<string, number>()
      for (const r of reservations) {
        const d = r.date.toISOString().slice(0, 10)
        byDate.set(d, (byDate.get(d) ?? 0) + r.partySize)
      }
      return Array.from(byDate.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, covers]) => ({ date, covers, capacity: 0 }))
    }),

  getTopCustomers: staffProcedure
    .input(z.object({ restaurantId: z.string(), limit: z.number().int().positive().optional() }))
    .query(async ({ ctx, input }) => {
      const limit = input.limit ?? 10
      return ctx.prisma.customer.findMany({
        where: { restaurantId: input.restaurantId },
        orderBy: { visitCount: 'desc' },
        take: limit,
      })
    }),
})

