import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/crypto'

// REGRA CRÍTICA: NUNCA enviar ao BC Connect sem lgpdConsent === true
// REGRA CRÍTICA: Falha silenciosa — nunca bloquear o fluxo principal

const BC_WEBHOOK_URL = process.env.BC_CONNECT_WEBHOOK_URL ?? ''

export type BcEventType = 'RESERVATION' | 'CHECK_IN' | 'CHECK_OUT' | 'PREFERENCE_UPDATE'

interface SendBcEventInput {
  restaurantId: string
  eventType: BcEventType
  customer: { email: string; name?: string; phone?: string; birthdate?: Date }
  metadata?: {
    groupSize?: number
    occasionType?: string
    preferences?: Array<{ category: string; value: string }>
  }
}

export async function sendBcEvent(input: SendBcEventInput): Promise<void> {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: input.restaurantId },
    select: { bcConnectPartnerId: true, bcConnectApiKey: true },
  })
  if (!restaurant?.bcConnectPartnerId || !restaurant?.bcConnectApiKey) return

  const apiKey = decrypt(restaurant.bcConnectApiKey)

  const payload = {
    eventType: input.eventType,
    occurredAt: new Date().toISOString(),
    lead: {
      email: input.customer.email,
      name: input.customer.name,
      phone: input.customer.phone,
    },
    optinAccepted: true,
    metadata: input.metadata,
  }

  try {
    const res = await fetch(
      `${BC_WEBHOOK_URL}/api/webhook/partner/${restaurant.bcConnectPartnerId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000),
      }
    )
    if (!res.ok) console.warn(`[BC Connect] ${res.status}:`, await res.text())
  } catch (err) {
    console.warn('[BC Connect] Falha silenciosa:', (err as Error).message)
  }
}

