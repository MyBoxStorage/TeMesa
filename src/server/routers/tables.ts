import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { hostessProcedure, managerProcedure, ownerProcedure, protectedProcedure, router } from '@/server/trpc'

export const tablesRouter = router({
  list: protectedProcedure
    .input(z.object({ restaurantId: z.string(), area: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.table.findMany({
        where: { restaurantId: input.restaurantId, ...(input.area ? { area: input.area } : {}) },
        orderBy: { name: 'asc' },
      })
    }),

  create: managerProcedure
    .input(
      z.object({
        restaurantId: z.string(),
        name: z.string().min(1),
        capacity: z.number().int().positive(),
        minCapacity: z.number().int().positive().default(1),
        area: z.string().optional(),
        shape: z.enum(['SQUARE', 'ROUND', 'RECTANGLE', 'BOOTH', 'LONG_RECTANGLE']).default('SQUARE'),
        posX: z.number().default(0),
        posY: z.number().default(0),
        rotation: z.number().default(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.table.create({ data: { ...input } })
    }),

  update: managerProcedure
    .input(
      z.object({
        restaurantId: z.string(),
        tableId: z.string(),
        name: z.string().min(1).optional(),
        capacity: z.number().int().positive().optional(),
        minCapacity: z.number().int().positive().optional(),
        area: z.string().nullable().optional(),
        shape: z.enum(['SQUARE', 'ROUND', 'RECTANGLE', 'BOOTH', 'LONG_RECTANGLE']).optional(),
        posX: z.number().optional(),
        posY: z.number().optional(),
        rotation: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { tableId, ...data } = input
      return ctx.prisma.table.update({ where: { id: tableId }, data: { ...(data as any) } })
    }),

  updateStatus: hostessProcedure
    .input(z.object({ restaurantId: z.string(), tableId: z.string(), status: z.enum(['AVAILABLE', 'RESERVED', 'OCCUPIED', 'WAITING', 'BLOCKED']) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.table.update({
        where: { id: input.tableId },
        data: { status: input.status as any },
      })
    }),

  delete: ownerProcedure
    .input(z.object({ restaurantId: z.string(), tableId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const active = await ctx.prisma.reservation.count({
        where: {
          restaurantId: input.restaurantId,
          tableId: input.tableId,
          status: { in: ['CONFIRMED', 'CHECKED_IN'] as any },
        },
      })
      if (active > 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Não pode deletar mesa com reservas ativas' })
      }
      await ctx.prisma.table.delete({ where: { id: input.tableId } })
      return { ok: true }
    }),

  bulkUpdatePositions: managerProcedure
    .input(
      z.object({
        restaurantId: z.string(),
        updates: z.array(
          z.object({
            tableId: z.string(),
            posX: z.number(),
            posY: z.number(),
            rotation: z.number(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.$transaction(
        input.updates.map((u) =>
          ctx.prisma.table.update({
            where: { id: u.tableId },
            data: { posX: u.posX, posY: u.posY, rotation: u.rotation },
          })
        )
      )
      return { ok: true }
    }),
})

