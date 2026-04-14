import { initTRPC, TRPCError } from '@trpc/server'
import { auth, currentUser } from '@clerk/nextjs/server'
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

  let user = await ctx.prisma.user.findUnique({
    where: { clerkId: ctx.clerkUserId },
  })

  if (!user) {
    // Fallback: try to find by email (handles clerkId drift after social logins)
    const clerkUser = await currentUser()
    if (!clerkUser) throw new TRPCError({ code: 'UNAUTHORIZED' })

    const email = clerkUser.emailAddresses[0]?.emailAddress
    if (email) {
      user = await ctx.prisma.user.findUnique({ where: { email } })
      if (user) {
        // Sync the clerkId to the current value
        user = await ctx.prisma.user.update({
          where: { id: user.id },
          data: { clerkId: ctx.clerkUserId },
        })
      }
    }

    if (!user) {
      const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || email || 'Usuário'
      user = await ctx.prisma.user.create({
        data: {
          clerkId: ctx.clerkUserId,
          email: email ?? `${ctx.clerkUserId}@temesa.app`,
          name,
        },
      })
    }
  }

  return next({ ctx: { ...ctx, user } })
})

const ROLE_HIERARCHY: StaffRole[] = ['STAFF', 'HOSTESS', 'MANAGER', 'OWNER']

export const enforceRestaurantRole = (minRole: StaffRole) =>
  enforceAuth.unstable_pipe(async ({ ctx, next, input }) => {
    const restaurantId = (input as Record<string, unknown>)?.restaurantId as string
    if (!restaurantId)
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'restaurantId obrigatório' })

    // enforceAuth has already added `user` to ctx; cast so TypeScript knows
    const authedCtx = ctx as typeof ctx & { user: User }

    const membership = await ctx.prisma.userRestaurant.findUnique({
      where: {
        userId_restaurantId: {
          userId: authedCtx.user.id,
          restaurantId,
        },
      },
    })
    if (!membership) throw new TRPCError({ code: 'FORBIDDEN' })

    if (ROLE_HIERARCHY.indexOf(membership.role) < ROLE_HIERARCHY.indexOf(minRole)) {
      throw new TRPCError({ code: 'FORBIDDEN', message: `Requer papel ${minRole} ou superior` })
    }

    return next({ ctx: { ...ctx, user: authedCtx.user, membership, restaurantId } })
  })

export const protectedProcedure = t.procedure.use(enforceAuth)

// adminProcedure: authenticated + isAdmin flag on the User record.
// Only platform super-admins can call these procedures.
const enforceAdmin = enforceAuth.unstable_pipe(async ({ ctx, next }) => {
  const authedCtx = ctx as typeof ctx & { user: User }
  if (!authedCtx.user.isAdmin) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso restrito a administradores da plataforma' })
  }
  return next({ ctx: { ...ctx, user: authedCtx.user } })
})
export const adminProcedure = t.procedure.use(enforceAdmin)
// staffProcedure: authenticated + member of the restaurant at any role level.
// Use for all read endpoints that accept restaurantId — prevents cross-tenant data leaks.
export const staffProcedure     = t.procedure.use(enforceRestaurantRole('STAFF'))
export const hostessProcedure   = t.procedure.use(enforceRestaurantRole('HOSTESS'))
export const managerProcedure   = t.procedure.use(enforceRestaurantRole('MANAGER'))
export const ownerProcedure     = t.procedure.use(enforceRestaurantRole('OWNER'))

export type AuthedRestaurantCtx = {
  user: User
  membership: UserRestaurant
  restaurantId: string
  prisma: typeof prisma
  clerkUserId: string
}
