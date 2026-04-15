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

// ── Shared helper: resolve or create the User record from Clerk session ───────
async function resolveUser(ctx: { clerkUserId: string | null; prisma: typeof prisma }) {
  if (!ctx.clerkUserId) throw new TRPCError({ code: 'UNAUTHORIZED' })

  let user = await ctx.prisma.user.findUnique({ where: { clerkId: ctx.clerkUserId } })
  if (!user) {
    const clerkUser = await currentUser()
    if (!clerkUser) throw new TRPCError({ code: 'UNAUTHORIZED' })

    const email = clerkUser.emailAddresses[0]?.emailAddress
    if (email) {
      user = await ctx.prisma.user.findUnique({ where: { email } })
      if (user) {
        user = await ctx.prisma.user.update({
          where: { id: user.id },
          data: { clerkId: ctx.clerkUserId },
        })
      }
    }

    if (!user) {
      const name =
        [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') ||
        email ||
        'Usuário'
      user = await ctx.prisma.user.create({
        data: {
          clerkId: ctx.clerkUserId,
          email: email ?? `${ctx.clerkUserId}@temesa.app`,
          name,
        },
      })
    }
  }

  return user
}

// ── enforceAuth ────────────────────────────────────────────────────────────────
const enforceAuth = t.middleware(async ({ ctx, next }) => {
  const user = await resolveUser(ctx)
  return next({ ctx: { ...ctx, user } })
})

const ROLE_HIERARCHY: StaffRole[] = ['STAFF', 'HOSTESS', 'MANAGER', 'OWNER']

// ── enforceRestaurantRole ─────────────────────────────────────────────────────
// In tRPC v11, middleware does NOT receive `input` directly.
// The actual request input is obtained via `await getRawInput()`.
// This is the correct API as documented in the tRPC v11 middleware source.
export const enforceRestaurantRole = (minRole: StaffRole) =>
  t.middleware(async ({ ctx, next, getRawInput }) => {
    const user = await resolveUser(ctx)

    const rawInput = await getRawInput()
    const restaurantId = (rawInput as Record<string, unknown>)?.restaurantId as string
    if (!restaurantId)
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'restaurantId obrigatório' })

    const membership = await ctx.prisma.userRestaurant.findUnique({
      where: {
        userId_restaurantId: {
          userId: user.id,
          restaurantId,
        },
      },
    })
    if (!membership) throw new TRPCError({ code: 'FORBIDDEN' })

    if (ROLE_HIERARCHY.indexOf(membership.role) < ROLE_HIERARCHY.indexOf(minRole)) {
      throw new TRPCError({ code: 'FORBIDDEN', message: `Requer papel ${minRole} ou superior` })
    }

    return next({ ctx: { ...ctx, user, membership, restaurantId } })
  })

// ── enforceAdmin ──────────────────────────────────────────────────────────────
const enforceAdmin = t.middleware(async ({ ctx, next }) => {
  const user = await resolveUser(ctx)
  if (!user.isAdmin) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso restrito a administradores da plataforma' })
  }
  return next({ ctx: { ...ctx, user } })
})

export const protectedProcedure = t.procedure.use(enforceAuth)
export const adminProcedure     = t.procedure.use(enforceAdmin)

export const staffProcedure   = t.procedure.use(enforceRestaurantRole('STAFF'))
export const hostessProcedure = t.procedure.use(enforceRestaurantRole('HOSTESS'))
export const managerProcedure = t.procedure.use(enforceRestaurantRole('MANAGER'))
export const ownerProcedure   = t.procedure.use(enforceRestaurantRole('OWNER'))

export type AuthedRestaurantCtx = {
  user: User
  membership: UserRestaurant
  restaurantId: string
  prisma: typeof prisma
  clerkUserId: string
}
