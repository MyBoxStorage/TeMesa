import { NextResponse } from 'next/server'

import { rateLimitOrThrow } from '@/lib/rateLimit'
import { getWidgetAvailability } from '@/lib/widgetPublic'

function getClientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
}

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const url = new URL(req.url)
  const date = url.searchParams.get('date') ?? ''
  const partySizeRaw = url.searchParams.get('partySize') ?? ''
  const partySize = Number(partySizeRaw)

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(partySize) || partySize <= 0) {
    return NextResponse.json({ error: 'Invalid query params' }, { status: 400 })
  }

  const ip = getClientIp(req)
  try {
    rateLimitOrThrow({ key: `widget:rest:availability:${ip}:${slug}:${date}`, limit: 60, windowMs: 60_000 })
  } catch (e) {
    const retryAfter = (e as any)?.retryAfterSeconds ?? 60
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'retry-after': String(retryAfter) } })
  }

  const slots = await getWidgetAvailability({ slug, date, partySize })
  return NextResponse.json({ slots })
}
