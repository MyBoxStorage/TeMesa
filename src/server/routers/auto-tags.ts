import { z } from 'zod'

import { managerProcedure, protectedProcedure, router } from '@/server/trpc'

const conditionSchema = z.object({
  field: z.string(),
  operator: z.string(),
  value: z.unknown(),
})

export const autoTagsRouter = router({
  list: protectedProcedure
    .input(z.object({ restaurantId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.autoTag.findMany({
        where: { restaurantId: input.restaurantId },
        orderBy: { createdAt: 'desc' },
      })
    }),

  create: managerProcedure
    .input(
      z.object({
        restaurantId: z.string(),
        name: z.string().min(1),
        color: z.string().default('#6366f1'),
        icon: z.string().optional(),
        conditions: z.array(conditionSchema).min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.autoTag.create({
        data: {
          restaurantId: input.restaurantId,
          name: input.name,
          color: input.color,
          icon: input.icon,
          conditions: input.conditions as any,
          isActive: true,
        },
      })
    }),

  update: managerProcedure
    .input(
      z.object({
        restaurantId: z.string(),
        autoTagId: z.string(),
        name: z.string().min(1).optional(),
        color: z.string().optional(),
        icon: z.string().nullable().optional(),
        conditions: z.array(conditionSchema).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.autoTag.update({
        where: { id: input.autoTagId },
        data: {
          name: input.name,
          color: input.color,
          icon: input.icon ?? undefined,
          conditions: input.conditions as any,
          isActive: input.isActive,
        },
      })
    }),

  delete: managerProcedure
    .input(z.object({ restaurantId: z.string(), autoTagId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.autoTag.delete({ where: { id: input.autoTagId } })
      return { ok: true }
    }),

  runAll: managerProcedure
    .input(z.object({ restaurantId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const tags = await ctx.prisma.autoTag.findMany({
        where: { restaurantId: input.restaurantId, isActive: true },
      })
      const customers = await ctx.prisma.customer.findMany({ where: { restaurantId: input.restaurantId } })

      for (const customer of customers) {
        const next = new Set(customer.tags)
        for (const t of tags) {
          const conditions = (t.conditions as any) as Array<{ field: string; operator: string; value: any }>
          const matched = conditions?.every((c) => {
            const data: any = customer
            const currentVal = c.field === 'source' ? undefined : data[c.field]
            if (c.field === 'tags' && c.operator === 'contains') {
              return Array.isArray(customer.tags) && customer.tags.includes(String(c.value))
            }
            if (c.operator === 'gte') return Number(currentVal) >= Number(c.value)
            if (c.operator === 'lte') return Number(currentVal) <= Number(c.value)
            if (c.operator === 'eq') return String(currentVal) === String(c.value)
            return false
          })
          if (matched) next.add(t.name)
          else next.delete(t.name)
        }
        await ctx.prisma.customer.update({ where: { id: customer.id }, data: { tags: Array.from(next) } })
      }
      return { ok: true, customers: customers.length }
    }),
})

