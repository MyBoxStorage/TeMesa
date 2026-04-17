import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/crypto'

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
      // BC Connect não configurado — silencioso
      return NextResponse.json({ ok: true })
    }

    const apiKey = decrypt(restaurant.bcConnectApiKey)

    const payload = {
      event: 'OPTIN_ACCEPTED',
      guestPhone: body.guestPhone ?? null,
      guestEmail: body.guestEmail ?? null,
      guestName: body.guestName ?? null,
      consentType: 'LGPD_WHATSAPP',
      restaurantSlug: body.restaurantSlug,
      source: 'WIDGET',
      acceptedAt: new Date().toISOString(),
    }

    // Fire-and-forget: não awaita a resposta do BC Connect
    fetch(`${BC_WEBHOOK_URL}/api/webhook/partner/${restaurant.bcConnectPartnerId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    }).catch((err) => console.warn('[BC Connect OPTIN] Falha:', (err as Error).message))

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.warn('[BC Connect OPTIN] Erro:', (err as Error).message)
    return NextResponse.json({ ok: true }) // Sempre 200 — não bloquear o cliente
  }
}
