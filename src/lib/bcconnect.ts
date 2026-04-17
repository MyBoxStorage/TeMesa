import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/crypto'

// REGRA CRÍTICA: Falha silenciosa — nunca bloquear o fluxo principal
// REGRA CRÍTICA: Só envia se lgpdConsent === true

const BC_WEBHOOK_URL = process.env.BC_CONNECT_WEBHOOK_URL ?? ''

// ── Tipos de evento (union discriminada) ─────────────────────────────────────

export type BcEventType =
  | 'RESERVATION'
  | 'RESERVATION_CREATED'
  | 'GUEST_IDENTIFIED'
  | 'OPTIN_ACCEPTED'
  | 'CHECK_IN'
  | 'CHECK_OUT'
  | 'PREFERENCE_UPDATE'

// Payload genérico — usado pela função sendBcEvent original (dashboard interno)
interface SendBcEventInput {
  restaurantId: string
  eventType: BcEventType
  customer: { email: string; name?: string; phone?: string; birthdate?: Date }
  metadata?: {
    groupSize?: number
    occasionType?: string
    preferences?: Array<{ category: string; value: string }>
    [key: string]: unknown
  }
}

// Payload enriquecido — usado pelo widget público
export interface EnrichedBcPayload {
  restaurantId: string
  restaurantSlug: string
  restaurantName: string
  guest: {
    name: string
    phone: string
    email?: string
  }
  lgpdConsent: boolean
  optinMarketing: boolean
  reservation: {
    id: string
    partySize: number
    date: string         // ISO 8601
    shiftName: string
    occasion?: string
    originType?: string
    visitFrequency?: string
    consumptionPreferences?: string[]
    dietaryNotes?: string
    referralSource?: string
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getRestaurantCredentials(restaurantId: string) {
  const r = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { bcConnectPartnerId: true, bcConnectApiKey: true },
  })
  if (!r?.bcConnectPartnerId || !r?.bcConnectApiKey) return null
  return { partnerId: r.bcConnectPartnerId, apiKey: decrypt(r.bcConnectApiKey) }
}

async function postToBcConnect(
  partnerId: string,
  apiKey: string,
  body: Record<string, unknown>
): Promise<void> {
  const res = await fetch(`${BC_WEBHOOK_URL}/api/webhook/partner/${partnerId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) console.warn(`[BC Connect] ${res.status}:`, await res.text())
}

// ── Função original — mantida para uso interno (dashboard) ───────────────────

export async function sendBcEvent(input: SendBcEventInput): Promise<void> {
  const creds = await getRestaurantCredentials(input.restaurantId)
  if (!creds) return

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
    await postToBcConnect(creds.partnerId, creds.apiKey, payload)
  } catch (err) {
    console.warn('[BC Connect] Falha silenciosa:', (err as Error).message)
  }
}

// ── Nova função — disparada pelo widget após criar reserva ───────────────────

export async function sendWidgetReservationEvents(data: EnrichedBcPayload): Promise<void> {
  // Regra absoluta: nunca enviar sem lgpdConsent
  if (!data.lgpdConsent) return

  const creds = await getRestaurantCredentials(data.restaurantId)
  if (!creds) return

  const now = new Date().toISOString()

  // Preferências → formato { category, value } exigido pelo BC Connect
  const preferences = (data.reservation.consumptionPreferences ?? [])
    .filter(Boolean)
    .map((v) => ({ category: 'consumption', value: v }))

  // Evento 1: RESERVATION_CREATED
  const reservationPayload = {
    event: 'RESERVATION_CREATED',
    restaurantSlug: data.restaurantSlug,
    restaurantName: data.restaurantName,
    guestName: data.guest.name,
    guestPhone: data.guest.phone,
    guestEmail: data.guest.email ?? null,
    partySize: data.reservation.partySize,
    date: data.reservation.date,
    shift: data.reservation.shiftName,
    source: 'WIDGET',
    reservationId: data.reservation.id,
    createdAt: now,
    metadata: {
      occasionType: data.reservation.occasion ?? null,
      originType: data.reservation.originType ?? null,
      visitFrequency: data.reservation.visitFrequency ?? null,
      preferences: preferences.length ? preferences : null,
      dietaryNotes: data.reservation.dietaryNotes ?? null,
      referralSource: data.reservation.referralSource ?? null,
    },
  }

  // Evento 2: GUEST_IDENTIFIED
  const guestPayload = {
    event: 'GUEST_IDENTIFIED',
    guestName: data.guest.name,
    guestPhone: data.guest.phone,
    guestEmail: data.guest.email ?? null,
    restaurantSlug: data.restaurantSlug,
    source: 'WIDGET_RESERVATION',
    createdAt: now,
  }

  try {
    // Dispara em paralelo — ambos fire-and-forget
    await Promise.allSettled([
      postToBcConnect(creds.partnerId, creds.apiKey, reservationPayload),
      postToBcConnect(creds.partnerId, creds.apiKey, guestPayload),
    ])

    // Marca bcConnectSent = true na reserva
    await prisma.reservation.update({
      where: { id: data.reservation.id },
      data: { bcConnectSent: true },
    })
  } catch (err) {
    console.warn('[BC Connect] Falha silenciosa (widget):', (err as Error).message)
  }
}
