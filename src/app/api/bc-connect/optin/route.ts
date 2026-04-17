import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/crypto'
import { resolveBcLeadEmail, formatPhoneForBc } from '@/lib/bcconnect'

export const dynamic = 'force-dynamic'

const BC_WEBHOOK_URL = process.env.BC_CONNECT_WEBHOOK_URL ?? ''

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      restaurantSlug: string
      guestPhone: string | null
      guestEmail: string | null
      guestName: string | null
    }

    if (!body.restaurantSlug) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: body.restaurantSlug },
      select: { bcConnectPartnerId: true, bcConnectApiKey: true },
    })

    if (!restaurant?.bcConnectPartnerId || !restaurant?.bcConnectApiKey) {
      return NextResponse.json({ ok: true })
    }

    const apiKey = decrypt(restaurant.bcConnectApiKey)
    const partnerId = restaurant.bcConnectPartnerId

    const payload = {
      eventType: 'SIGNUP' as const,
      occurredAt: new Date().toISOString(),
      lead: {
        email: resolveBcLeadEmail({
          partnerId,
          phone: body.guestPhone ?? '',
          email: body.guestEmail,
        }),
        name: body.guestName?.trim() || undefined,
        phone: body.guestPhone ? formatPhoneForBc(body.guestPhone) : undefined,
      },
      optinAccepted: true,
    }

    fetch(`${BC_WEBHOOK_URL}/api/webhook/partner/${partnerId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    }).catch((err) => console.warn('[BC Connect OPTIN] Falha:', (err as Error).message))

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.warn('[BC Connect OPTIN] Erro:', (err as Error).message)
    return NextResponse.json({ ok: true })
  }
}
