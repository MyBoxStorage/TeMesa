import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { adminProcedure, protectedProcedure, publicProcedure, router } from '@/server/trpc'
import { getResendClient } from '@/lib/resend'

// Invite expires in 7 days by default
const INVITE_EXPIRY_DAYS = 7

function inviteExpiresAt(): Date {
  return new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
}

export const adminRouter = router({
  // ── Platform stats ────────────────────────────────────────────────────────
  getStats: adminProcedure.query(async ({ ctx }) => {
    const now = new Date()
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))

    const [
      totalRestaurants,
      activeRestaurants,
      totalReservations,
      reservationsThisMonth,
      totalCustomers,
      pendingInvitations,
      planDistribution,
    ] = await Promise.all([
      ctx.prisma.restaurant.count(),
      ctx.prisma.restaurant.count({ where: { isActive: true } }),
      ctx.prisma.reservation.count(),
      ctx.prisma.reservation.count({ where: { createdAt: { gte: monthStart } } }),
      ctx.prisma.customer.count(),
      ctx.prisma.invitation.count({ where: { status: 'PENDING', expiresAt: { gt: now } } }),
      ctx.prisma.restaurant.groupBy({
        by: ['plan'],
        _count: { _all: true },
        where: { isActive: true },
      }),
    ])

    const PLAN_PRICES: Record<string, number> = {
      GRATUITO: 0, ESSENCIAL: 199, PROFISSIONAL: 399, REDE: 799, ENTERPRISE: 0,
    }
    const estimatedMrr = planDistribution.reduce((acc, p) => {
      return acc + (PLAN_PRICES[p.plan] ?? 0) * p._count._all
    }, 0)

    return {
      totalRestaurants,
      activeRestaurants,
      totalReservations,
      reservationsThisMonth,
      totalCustomers,
      pendingInvitations,
      planDistribution: Object.fromEntries(planDistribution.map(p => [p.plan, p._count._all])),
      estimatedMrr,
    }
  }),

  // ── Restaurant management ─────────────────────────────────────────────────
  listRestaurants: adminProcedure
    .input(z.object({
      search: z.string().optional(),
      limit: z.number().int().min(1).max(100).default(50),
      cursor: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const where: {
        OR?: Array<{
          name?: { contains: string; mode: 'insensitive' }
          slug?: { contains: string; mode: 'insensitive' }
          users?: { some: { role: 'OWNER'; user: { email: { contains: string; mode: 'insensitive' } } } }
        }>
      } = {}
      if (input.search) {
        where.OR = [
          { name: { contains: input.search, mode: 'insensitive' } },
          { slug: { contains: input.search, mode: 'insensitive' } },
          { users: { some: { user: { email: { contains: input.search, mode: 'insensitive' } }, role: 'OWNER' } } },
        ]
      }

      const items = await ctx.prisma.restaurant.findMany({
        where,
        include: {
          users: {
            include: { user: { select: { id: true, name: true, email: true } } },
            where: { role: 'OWNER' },
          },
          _count: {
            select: { reservations: true, customers: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      })

      let nextCursor: string | undefined
      if (items.length > input.limit) {
        nextCursor = items.pop()!.id
      }

      return { items, nextCursor }
    }),

  toggleRestaurantActive: adminProcedure
    .input(z.object({ restaurantId: z.string(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      console.log(`[AUDIT] Admin ${ctx.user.email} ${input.isActive ? 'reativou' : 'suspendeu'} restaurante ${input.restaurantId} em ${new Date().toISOString()}`)
      return ctx.prisma.restaurant.update({
        where: { id: input.restaurantId },
        data: { isActive: input.isActive },
      })
    }),

  updateRestaurantPlan: adminProcedure
    .input(z.object({
      restaurantId: z.string(),
      plan: z.enum(['GRATUITO', 'ESSENCIAL', 'PROFISSIONAL', 'REDE', 'ENTERPRISE']),
    }))
    .mutation(async ({ ctx, input }) => {
      const current = await ctx.prisma.restaurant.findUnique({
        where: { id: input.restaurantId },
        select: { plan: true, name: true },
      })
      console.log(`[AUDIT] Admin ${ctx.user.email} alterou plano de "${current?.name}" de ${current?.plan} para ${input.plan} em ${new Date().toISOString()}`)
      return ctx.prisma.restaurant.update({
        where: { id: input.restaurantId },
        data: { plan: input.plan },
      })
    }),

  // ── Invitation management ─────────────────────────────────────────────────
  listInvitations: adminProcedure
    .input(z.object({
      status: z.enum(['PENDING', 'USED', 'EXPIRED', 'REVOKED', 'ALL']).default('ALL'),
      limit: z.number().int().min(1).max(100).default(50),
      cursor: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const now = new Date()
      const where: {
        status?: 'PENDING' | 'USED' | 'REVOKED'
        expiresAt?: { lte: Date } | { gt: Date }
      } = {}

      if (input.status !== 'ALL') {
        if (input.status === 'EXPIRED') {
          where.status = 'PENDING'
          where.expiresAt = { lte: now }
        } else {
          where.status = input.status
          if (input.status === 'PENDING') {
            where.expiresAt = { gt: now }
          }
        }
      }

      const items = await ctx.prisma.invitation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      })

      let nextCursor: string | undefined
      if (items.length > input.limit) {
        nextCursor = items.pop()!.id
      }

      return { items, nextCursor }
    }),

  createInvitation: adminProcedure
    .input(z.object({
      email:          z.string().email(),
      restaurantName: z.string().min(2),
      notes:          z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check for existing pending invite for this email
      const existing = await ctx.prisma.invitation.findFirst({
        where: { email: input.email, status: 'PENDING', expiresAt: { gt: new Date() } },
      })
      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Já existe um convite pendente para este e-mail.',
        })
      }

      const existingUser = await ctx.prisma.user.findUnique({ where: { email: input.email } })
      if (existingUser) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `O e-mail "${input.email}" já possui uma conta no TeMesa. Adicione o usuário diretamente ao restaurante em Configurações → Equipe.`,
        })
      }

      const invitation = await ctx.prisma.invitation.create({
        data: {
          email:          input.email,
          restaurantName: input.restaurantName,
          notes:          input.notes,
          expiresAt:      inviteExpiresAt(),
        },
      })

      // Send invite email
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
      const inviteUrl = `${appUrl}/convite/${invitation.token}`

      let emailSent = false
      try {
        const resend = getResendClient()
        await resend.emails.send({
          from:    process.env.RESEND_FROM_EMAIL ?? 'noreply@temesa.app',
          to:      input.email,
          subject: `Você foi convidado para o TeMesa — ${input.restaurantName}`,
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#0a0a0a;color:#fff;border-radius:12px">
              <h1 style="font-size:22px;font-weight:700;margin-bottom:8px">Bem-vindo ao TeMesa 🍽️</h1>
              <p style="color:#a1a1aa;font-size:14px;margin-bottom:24px">
                Você foi convidado para configurar o restaurante <strong style="color:#fff">${input.restaurantName}</strong> na plataforma TeMesa.
              </p>
              <a href="${inviteUrl}"
                 style="display:inline-block;background:#fff;color:#000;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none">
                Aceitar convite
              </a>
              <p style="color:#52525b;font-size:12px;margin-top:24px">
                Este link expira em ${INVITE_EXPIRY_DAYS} dias. Se você não esperava este convite, ignore este e-mail.
              </p>
            </div>
          `,
        })
        emailSent = true
      } catch (err) {
        console.error('[Admin] Falha ao enviar e-mail de convite:', (err as Error).message)
      }

      return { ...invitation, emailSent }
    }),

  revokeInvitation: adminProcedure
    .input(z.object({ invitationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invite = await ctx.prisma.invitation.findUnique({ where: { id: input.invitationId } })
      if (!invite) throw new TRPCError({ code: 'NOT_FOUND' })
      if (invite.status !== 'PENDING') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Apenas convites pendentes podem ser revogados.' })
      }
      return ctx.prisma.invitation.update({
        where: { id: input.invitationId },
        data: { status: 'REVOKED' },
      })
    }),

  resendInvitation: adminProcedure
    .input(z.object({ invitationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invite = await ctx.prisma.invitation.findUnique({ where: { id: input.invitationId } })
      if (!invite) throw new TRPCError({ code: 'NOT_FOUND' })

      if (invite.status === 'REVOKED') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Convites revogados não podem ser reenviados. Crie um novo convite.',
        })
      }
      if (invite.status === 'USED') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Este convite já foi utilizado.',
        })
      }

      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000)
      if (invite.createdAt > fiveMinAgo) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: 'Aguarde pelo menos 5 minutos antes de reenviar o convite.',
        })
      }

      const updated = await ctx.prisma.invitation.update({
        where: { id: input.invitationId },
        data: { expiresAt: inviteExpiresAt(), status: 'PENDING' },
      })

      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
      const inviteUrl = `${appUrl}/convite/${updated.token}`

      let emailSent = false
      try {
        const resend = getResendClient()
        await resend.emails.send({
          from:    process.env.RESEND_FROM_EMAIL ?? 'noreply@temesa.app',
          to:      updated.email,
          subject: `Lembrete: seu convite TeMesa — ${updated.restaurantName}`,
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#0a0a0a;color:#fff;border-radius:12px">
              <h1 style="font-size:22px;font-weight:700;margin-bottom:8px">Seu convite ainda está disponível 🍽️</h1>
              <p style="color:#a1a1aa;font-size:14px;margin-bottom:24px">
                Lembrete: você foi convidado para configurar <strong style="color:#fff">${updated.restaurantName}</strong> no TeMesa.
              </p>
              <a href="${inviteUrl}"
                 style="display:inline-block;background:#fff;color:#000;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none">
                Aceitar convite
              </a>
              <p style="color:#52525b;font-size:12px;margin-top:24px">
                Este link expira em ${INVITE_EXPIRY_DAYS} dias.
              </p>
            </div>
          `,
        })
        emailSent = true
      } catch (err) {
        console.error('[Admin] Falha ao reenviar convite:', (err as Error).message)
      }

      return { ...updated, emailSent }
    }),

  // ── Invite public validation (called from /convite/[token] page) ──────────
  getInviteByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.invitation.findUnique({ where: { token: input.token } })
    }),

  // ── Called from onboarding to check if new user has a pending invite ──────
  getMyPendingInvite: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.invitation.findFirst({
      where: { email: ctx.user.email, status: 'PENDING', expiresAt: { gt: new Date() } },
    })
  }),

  // ── Mark the invite as used after onboarding restaurant creation ──────────
  markMyInviteUsed: protectedProcedure.mutation(async ({ ctx }) => {
    const invite = await ctx.prisma.invitation.findFirst({
      where: { email: ctx.user.email, status: 'PENDING', expiresAt: { gt: new Date() } },
    })
    if (!invite) return null
    return ctx.prisma.invitation.update({
      where: { id: invite.id },
      data: { status: 'USED', usedAt: new Date() },
    })
  }),

  markInviteUsedByToken: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invite = await ctx.prisma.invitation.findUnique({ where: { token: input.token } })
      if (!invite || invite.status !== 'PENDING') return null
      return ctx.prisma.invitation.update({
        where: { id: invite.id },
        data: { status: 'USED', usedAt: new Date() },
      })
    }),
})
