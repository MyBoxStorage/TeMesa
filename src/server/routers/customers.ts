import { z } from 'zod'
import { Prisma } from '@prisma/client'

import { sendBcEvent } from '@/lib/bcconnect'
import { managerProcedure, ownerProcedure, protectedProcedure, router } from '@/server/trpc'

export const customersRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        restaurantId: z.string(),
        search: z.string().optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.customer.findMany({
        where: {
          restaurantId: input.restaurantId,
          ...(input.search
            ? {
                OR: [
                  { name: { contains: input.search, mode: 'insensitive' } },
                  { phone: { contains: input.search } },
                  { email: { contains: input.search, mode: 'insensitive' } },
                ],
              }
            : {}),
          ...(input.tags?.length ? { tags: { hasSome: input.tags } } : {}),
        },
        orderBy: { createdAt: 'desc' },
      })
    }),

  getById: protectedProcedure
    .input(z.object({ restaurantId: z.string(), customerId: z.string() }))
    .query(async ({ ctx, input }) => {
      const customer = await ctx.prisma.customer.findFirst({
        where: { id: input.customerId, restaurantId: input.restaurantId },
        include: {
          reservations: { orderBy: { date: 'desc' }, take: 50 },
        },
      })
      return customer
    }),

  update: managerProcedure
    .input(
      z.object({
        restaurantId: z.string(),
        customerId: z.string(),
        name: z.string().min(2).optional(),
        email: z.string().email().nullable().optional(),
        birthdate: z.coerce.date().nullable().optional(),
        tags: z.array(z.string()).optional(),
        preferences: z.unknown().nullable().optional(),
        notes: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updated = await ctx.prisma.customer.update({
        where: { id: input.customerId },
        data: {
          name: input.name,
          email: input.email ?? undefined,
          birthdate: input.birthdate ?? undefined,
          tags: input.tags,
          preferences: input.preferences as any,
          notes: input.notes ?? undefined,
        },
      })

      if (updated.lgpdConsent && updated.email) {
        await sendBcEvent({
          restaurantId: updated.restaurantId,
          eventType: 'PREFERENCE_UPDATE',
          customer: { email: updated.email, name: updated.name, phone: updated.phone, birthdate: updated.birthdate ?? undefined },
          metadata: {
            preferences: Array.isArray((updated.preferences as any)?.preferences)
              ? ((updated.preferences as any).preferences as any)
              : undefined,
          },
        })
      }
      return updated
    }),

  applyAutoTags: managerProcedure
    .input(z.object({ restaurantId: z.string(), customerId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const customer = await ctx.prisma.customer.findFirst({
        where: { id: input.customerId, restaurantId: input.restaurantId },
      })
      if (!customer) return null

      const tags = await ctx.prisma.autoTag.findMany({ where: { restaurantId: input.restaurantId, isActive: true } })
      const current = new Set(customer.tags)
      const next = new Set(customer.tags)

      for (const t of tags) {
        const conditions = (t.conditions as any) as Array<{ field: string; operator: string; value: any }>
        const matched = conditions?.every((c) => {
          const field = c.field
          const op = c.operator
          const val = c.value
          const data: any = customer
          if (field === 'tags' && op === 'contains') return Array.isArray(data.tags) && data.tags.includes(val)
          const currentVal = data[field]
          if (op === 'gte') return Number(currentVal) >= Number(val)
          if (op === 'lte') return Number(currentVal) <= Number(val)
          if (op === 'eq') return String(currentVal) === String(val)
          return false
        })
        if (matched) next.add(t.name)
        else next.delete(t.name)
      }

      if (Array.from(current).sort().join('|') !== Array.from(next).sort().join('|')) {
        return ctx.prisma.customer.update({ where: { id: customer.id }, data: { tags: Array.from(next) } })
      }
      return customer
    }),

  deleteData: ownerProcedure
    .input(z.object({ restaurantId: z.string(), customerId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.customer.update({
        where: { id: input.customerId },
        data: {
          name: 'Anonimizado',
          phone: '00000000000',
          email: null,
          birthdate: null,
          tags: [],
          preferences: Prisma.JsonNull,
          notes: null,
          lgpdConsent: false,
          lgpdConsentAt: null,
        },
      })
    }),
})

