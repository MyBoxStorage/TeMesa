import { initTRPC, TRPCError } from '@trpc/server'
import { auth } from '@clerk/nextjs/server'
import superjson from 'superjson'
import { ZodError } from 'zod'
import type { StaffRole, User, UserRestaurant } from '@prisma/client'

import { prisma } from '@/lib/prisma'

export const createTRPCContext = async () => {
  const { userId: clerkUserId } = await auth()
  return { clerkUserId, prisma }
}

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter: ({ shape, error }) => ({
    ...shape,
    data: {
      ...shape.data,
      zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
    },
  }),
})

export const router = t.router
export const publicProcedure = t.procedure

const enforceAuth = t.middleware(async ({ ctx, next }) => {
  if (!ctx.clerkUserId) throw new TRPCError({ code: 'UNAUTHORIZED' })
  const user = await ctx.prisma.user.findUnique({ where: { clerkId: ctx.clerkUserId } })
  if (!user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Usuário não encontrado' })
  return next({ ctx: { ...ctx, user } })
})

type AuthedCtx = Awaited<ReturnType<typeof createTRPCContext>> & { user: User }

// Hierarquia: STAFF < HOSTESS < MANAGER < OWNER
const ROLE_HIERARCHY: StaffRole[] = ['STAFF', 'HOSTESS', 'MANAGER', 'OWNER']

export const enforceRestaurantRole = (minRole: StaffRole) =>
  enforceAuth.unstable_pipe(async ({ ctx, next, input }) => {
    const restaurantId = (input as Record<string, unknown>)?.restaurantId as string
    if (!restaurantId)
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'restaurantId obrigatório' })

    const membership = await (ctx as AuthedCtx).prisma.userRestaurant.findUnique({
      where: { userId_restaurantId: { userId: (ctx as AuthedCtx).user.id, restaurantId } },
    })
    if (!membership) throw new TRPCError({ code: 'FORBIDDEN' })

    if (ROLE_HIERARCHY.indexOf(membership.role) < ROLE_HIERARCHY.indexOf(minRole)) {
      throw new TRPCError({ code: 'FORBIDDEN', message: `Requer papel ${minRole} ou superior` })
    }
    return next({ ctx: { ...(ctx as AuthedCtx), membership, restaurantId } })
  })

export const protectedProcedure = t.procedure.use(enforceAuth)
export const hostessProcedure = t.procedure.use(enforceRestaurantRole('HOSTESS'))
export const managerProcedure = t.procedure.use(enforceRestaurantRole('MANAGER'))
export const ownerProcedure = t.procedure.use(enforceRestaurantRole('OWNER'))

export type AuthedRestaurantCtx = AuthedCtx & {
  membership: UserRestaurant
  restaurantId: string
}

