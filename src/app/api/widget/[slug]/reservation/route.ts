import { NextResponse } from 'next/server'
import { z } from 'zod'

import { rateLimitOrThrow } from '@/lib/rateLimit'
import { createWidgetReservation } from '@/lib/widgetPublic'

const e164 = z.string().regex(/^\+\d{10,15}$/)

const bodySchema = z.object({
  guestName: z.string().min(2),
  guestPhone: e164,
  guestEmail: z.string().email().optional(),
  partySize: z.number().int().positive(),
  date: z.string().datetime(),
  shiftId: z.string(),
  occasion: z.string().optional(),
  dietaryNotes: z.string().optional(),
  lgpdConsent: z.boolean(),
})

function getClientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
}

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const ip = getClientIp(req)

  try {
    rateLimitOrThrow({ key: `widget:rest:create:${ip}:${slug}`, limit: 10, windowMs: 60_000 })
  } catch (e) {
    const retryAfter = (e as any)?.retryAfterSeconds ?? 60
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'retry-after': String(retryAfter) } })
  }

  const json = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const reservation = await createWidgetReservation({
    slug,
    guestName: parsed.data.guestName,
    guestPhone: parsed.data.guestPhone,
    guestEmail: parsed.data.guestEmail,
    partySize: parsed.data.partySize,
    date: new Date(parsed.data.date),
    shiftId: parsed.data.shiftId,
    occasion: parsed.data.occasion,
    dietaryNotes: parsed.data.dietaryNotes,
    lgpdConsent: parsed.data.lgpdConsent,
  })

  return NextResponse.json({ id: reservation.id, status: reservation.status })
}
