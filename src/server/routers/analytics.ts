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

      // Taxa de ocupação = pessoas confirmadas hoje / capacidade total dos turnos ativos hoje
      const diaDaSemana = now.getUTCDay()
      const turnosHoje = await ctx.prisma.shift.findMany({
        where: {
          restaurantId: input.restaurantId,
          isActive: true,
          daysOfWeek: { has: diaDaSemana },
          maxCapacity: { gt: 0 },
        },
        select: { maxCapacity: true },
      })
      const capacidadeTotal = turnosHoje.reduce((acc, t) => acc + (t.maxCapacity ?? 0), 0)
      const taxaOcupacao = capacidadeTotal > 0 ? Math.min(100, Math.round((coversHoje / capacidadeTotal) * 100)) : 0

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
        taxaOcupacao,
        noShowsMes,
        clientesNovos30dias,
        reservasPorCanal: Object.fromEntries(reservasPorCanal.map((r) => [r.source, r._count._all])),
        reservasPorStatus: Object.fromEntries(reservasPorStatus.map((r) => [r.status, r._count._all])),
      }
    }),

  getOccupancy30Days: staffProcedure
    .input(z.object({ restaurantId: z.string(), days: z.number().int().min(7).max(90).default(30) }))
    .query(async ({ ctx, input }) => {
      const now = new Date()
      const start = new Date(now.getTime() - input.days * 24 * 60 * 60 * 1000)

      const [reservations, shifts] = await Promise.all([
        ctx.prisma.reservation.findMany({
          where: {
            restaurantId: input.restaurantId,
            date: { gte: start },
            status: { in: ['CONFIRMED', 'CHECKED_IN', 'FINISHED'] as any },
          },
          select: { date: true, partySize: true },
        }),
        ctx.prisma.shift.findMany({
          where: { restaurantId: input.restaurantId, isActive: true },
          select: { daysOfWeek: true, maxCapacity: true },
        }),
      ])

      const byDate = new Map<string, number>()
      for (const r of reservations) {
        const d = r.date.toISOString().slice(0, 10)
        byDate.set(d, (byDate.get(d) ?? 0) + r.partySize)
      }

      const result: Array<{ date: string; covers: number; capacity: number }> = []
      for (let i = 0; i < input.days; i++) {
        const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000)
        const dateStr = d.toISOString().slice(0, 10)
        const dow = d.getUTCDay()
        const capacity = shifts
          .filter((s) => s.daysOfWeek.includes(dow))
          .reduce((acc, s) => acc + (s.maxCapacity ?? 0), 0)
        result.push({ date: dateStr, covers: byDate.get(dateStr) ?? 0, capacity })
      }
      return result
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

