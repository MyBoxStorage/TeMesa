import { z } from 'zod'
import { managerProcedure, staffProcedure, publicProcedure, router } from '@/server/trpc'
import type { TableShape } from '@prisma/client'

function elementTypeToTableShape(type: string): TableShape {
  switch (type) {
    case 'TABLE_ROUND':     return 'ROUND'
    case 'TABLE_RECTANGLE': return 'RECTANGLE'
    case 'TABLE_BOOTH':     return 'BOOTH'
    case 'TABLE_LONG':      return 'LONG_RECTANGLE'
    default:                return 'SQUARE'
  }
}

export const floorPlanRouter = router({
  get: staffProcedure
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
        areas: z.array(z.string()), // min(0) — permite salvar sem áreas
      })
    )
    .mutation(async ({ ctx, input }) => {
      // ── Snapshot: busca dados atuais para guardar como cache ──────────
      const existing = await ctx.prisma.floorPlan.findUnique({
        where: { restaurantId: input.restaurantId },
        select: { canvasData: true },
      })

      const newData = input.canvasData as Record<string, unknown>
      const existingData = existing?.canvasData as Record<string, unknown> | null

      // Move current elements to snapshot before saving new data
      if (existingData?.elements) {
        newData.snapshot = {
          elements:    existingData.elements,
          areaConfigs: existingData.areaConfigs ?? [],
          savedAt:     new Date().toISOString(),
        }
      }

      // ── Sync Table records ────────────────────────────────────────────
      const elements = (newData.elements as any[]) ?? []
      const tableElements = elements.filter((e: any) => e.isTable && e.label)

      const existingTables = await ctx.prisma.table.findMany({
        where: { restaurantId: input.restaurantId },
        select: { id: true, name: true },
      })

      const existingByName = new Map(existingTables.map(t => [t.name, t.id]))
      const canvasNames    = new Set(tableElements.map((e: any) => e.label as string))

      // Create or update
      for (const el of tableElements) {
        const shape = elementTypeToTableShape(el.type)
        const existing = existingByName.get(el.label)

        if (existing) {
          await ctx.prisma.table.update({
            where: { id: existing },
            data: {
              capacity: el.capacity ?? 2,
              area:     el.area ?? null,
              shape,
              posX:     el.x,
              posY:     el.y,
              rotation: el.rotation,
            },
          })
        } else {
          await ctx.prisma.table.create({
            data: {
              restaurantId: input.restaurantId,
              name:         el.label,
              capacity:     el.capacity ?? 2,
              minCapacity:  1,
              area:         el.area ?? null,
              shape,
              posX:         el.x,
              posY:         el.y,
              rotation:     el.rotation,
              status:       'AVAILABLE',
            },
          })
        }
      }

      // Delete tables removed from canvas (skip those with active reservations)
      for (const table of existingTables) {
        if (!canvasNames.has(table.name)) {
          const active = await ctx.prisma.reservation.count({
            where: {
              restaurantId: input.restaurantId,
              tableId:      table.id,
              status:       { in: ['CONFIRMED', 'CHECKED_IN', 'PENDING', 'PENDING_PAYMENT'] as any },
            },
          })
          if (active === 0) {
            try {
              await ctx.prisma.table.delete({ where: { id: table.id } })
            } catch {
              // ignore FK errors — table stays in DB
            }
          }
        }
      }

      // ── Persist floor plan ────────────────────────────────────────────
      return ctx.prisma.floorPlan.upsert({
        where: { restaurantId: input.restaurantId },
        create: {
          restaurantId: input.restaurantId,
          canvasData:   newData as any,
          floorTemplate: input.floorTemplate,
          areas:        input.areas,
        },
        update: {
          canvasData:   newData as any,
          floorTemplate: input.floorTemplate,
          areas:        input.areas,
        },
      })
    }),

  getPublic: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const restaurant = await ctx.prisma.restaurant.findUnique({
        where:  { slug: input.slug },
        select: { id: true },
      })
      if (!restaurant) return null
      return ctx.prisma.floorPlan.findUnique({
        where:  { restaurantId: restaurant.id },
        select: { canvasData: true, floorTemplate: true, areas: true, updatedAt: true },
      })
    }),
})
