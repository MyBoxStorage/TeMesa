import { z } from 'zod'

import { managerProcedure, staffProcedure, router } from '@/server/trpc'

export const serversRouter = router({
  list: staffProcedure
    .input(z.object({ restaurantId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.server.findMany({
        where: { restaurantId: input.restaurantId, isActive: true },
        orderBy: { name: 'asc' },
      })
    }),

  create: managerProcedure
    .input(z.object({ restaurantId: z.string(), name: z.string().min(2), userId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.server.create({ data: { ...input } })
    }),

  update: managerProcedure
    .input(
      z.object({
        restaurantId: z.string(),
        serverId: z.string(),
        name: z.string().min(2).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // restaurantId scopes the update — prevents cross-tenant modification
      return ctx.prisma.server.update({
        where: { id: input.serverId, restaurantId: input.restaurantId },
        data: { name: input.name, isActive: input.isActive },
      })
    }),

  assignTables: managerProcedure
    .input(
      z.object({
        restaurantId: z.string(),
        serverId: z.string(),
        tableIds: z.array(z.string()).min(1),
        date: z.coerce.date(),
        shiftId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.$transaction(
        input.tableIds.map((tableId) =>
          ctx.prisma.serverTableAssignment.upsert({
            where: { serverId_tableId_date: { serverId: input.serverId, tableId, date: input.date } },
            update: { shiftId: input.shiftId },
            create: { serverId: input.serverId, tableId, date: input.date, shiftId: input.shiftId },
          })
        )
      )
      return { ok: true }
    }),

  getTodayAssignments: staffProcedure
    .input(z.object({ restaurantId: z.string(), date: z.coerce.date() }))
    .query(async ({ ctx, input }) => {
      // Filter by restaurantId through the server relation to prevent cross-tenant leaks
      const rows = await ctx.prisma.serverTableAssignment.findMany({
        where: {
          date: input.date,
          server: { restaurantId: input.restaurantId },
        },
        include: { server: { select: { id: true, name: true } } },
      })
      const map: Record<string, { server: { id: string; name: string } }> = {}
      for (const r of rows) map[r.tableId] = { server: r.server }
      return map
    }),
})
