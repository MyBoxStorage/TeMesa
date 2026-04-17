import { createHash } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/crypto'

// REGRA CRÍTICA: Falha silenciosa — nunca bloquear o fluxo principal
// REGRA CRÍTICA: Só envia se lgpdConsent === true (widget)

const BC_WEBHOOK_URL = process.env.BC_CONNECT_WEBHOOK_URL ?? ''

/** Tipos aceitos pelo `webhookPayloadSchema` do BC Connect (strict). */
export type BcWebhookEventType =
  | 'SIGNUP'
  | 'RESERVATION'
  | 'PREFERENCE_UPDATE'
  | 'TICKET_PURCHASE'
  | 'LOGIN'
  | 'CHECK_IN'
  | 'CHECK_OUT'
  | 'EVENT_ATTENDANCE'
  | 'REFERRAL'
  | 'REVIEW_SUBMITTED'
  | 'LOYALTY_REWARD'

/** Chaves permitidas em `metadata` (top-level) — espelha bc-conect/schemas.ts */
const BC_METADATA_KEYS = new Set([
  'reservationDate',
  'groupSize',
  'estimatedTicket',
  'preferences',
  'occasionType',
  'eventName',
  'checkInAt',
  'checkOutAt',
  'durationMinutes',
  'referredEmail',
  'reviewScore',
  'reviewPlatform',
  'loyaltyPoints',
  'eventId',
  'originType',
  'visitFrequency',
  'referralSource',
  'restrictions',
  'sessionContext',
])

/** Domínio só para placeholder (sem MX); passa no filtro de qualidade do BC Connect. */
const WIDGET_PLACEHOLDER_EMAIL_DOMAIN = 'widget.temesa.app'

const BR_PHONE_RE = /^(\+55)?[\s-]?\(?\d{2}\)?[\s-]?\d{4,5}[\s-]?\d{4}$/

// ── Tipos internos TeMesa ─────────────────────────────────────────────────

interface SendBcEventInput {
  restaurantId: string
  eventType: BcWebhookEventType
  customer: { email: string; name?: string; phone?: string; birthdate?: Date }
  metadata?: Record<string, unknown>
}

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
    date: string
    shiftName: string
    occasion?: string
    originType?: string
    visitFrequency?: string
    consumptionPreferences?: string[]
    dietaryNotes?: string
    referralSource?: string
  }
}

// ── Helpers públicos (opt-in route) ─────────────────────────────────────────

/** Telefone no formato aceito pelo regex do BC Connect (E.164 BR ou nacional). */
export function formatPhoneForBc(phone: string): string | undefined {
  const t = phone.trim()
  if (!t) return undefined
  return BR_PHONE_RE.test(t) ? t : undefined
}

/**
 * Email do lead: usa o informado quando válido; senão placeholder estável por parceiro+telefone
 * (schema do BC exige `lead.email`; merge de leads no BC é por email).
 */
export function resolveBcLeadEmail(opts: {
  partnerId: string
  phone: string
  email?: string | null
}): string {
  const raw = opts.email?.trim().toLowerCase()
  if (raw && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) return raw
  const digits = opts.phone.replace(/\D/g, '')
  const h = createHash('sha256')
    .update(`${opts.partnerId}:${digits || 'sem-telefone'}`)
    .digest('hex')
    .slice(0, 24)
  return `guest.${h}@${WIDGET_PLACEHOLDER_EMAIL_DOMAIN}`
}

function sanitizeMetadata(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!meta) return undefined
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(meta)) {
    if (BC_METADATA_KEYS.has(k) && v !== undefined) out[k] = v
  }
  return Object.keys(out).length ? out : undefined
}

// ── Credenciais + POST ─────────────────────────────────────────────────────

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
): Promise<boolean> {
  const res = await fetch(`${BC_WEBHOOK_URL}/api/webhook/partner/${partnerId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) {
    console.warn(`[BC Connect] ${res.status}:`, await res.text())
    return false
  }
  return true
}

// ── Dashboard / tRPC ─────────────────────────────────────────────────────────

export async function sendBcEvent(input: SendBcEventInput): Promise<void> {
  const creds = await getRestaurantCredentials(input.restaurantId)
  if (!creds) return

  const payload = {
    eventType: input.eventType,
    occurredAt: new Date().toISOString(),
    lead: {
      email: input.customer.email.trim().toLowerCase(),
      name: input.customer.name,
      phone: input.customer.phone ? formatPhoneForBc(input.customer.phone) : undefined,
    },
    optinAccepted: true,
    metadata: sanitizeMetadata(input.metadata),
  }

  try {
    await postToBcConnect(creds.partnerId, creds.apiKey, payload)
  } catch (err) {
    console.warn('[BC Connect] Falha silenciosa:', (err as Error).message)
  }
}

// ── Widget: uma reserva → um webhook `RESERVATION` (schema strict) ──────────

export async function sendWidgetReservationEvents(data: EnrichedBcPayload): Promise<void> {
  if (!data.lgpdConsent) return

  const creds = await getRestaurantCredentials(data.restaurantId)
  if (!creds) return

  const occurredAt = new Date().toISOString()
  const email = resolveBcLeadEmail({
    partnerId: creds.partnerId,
    phone: data.guest.phone,
    email: data.guest.email,
  })

  const preferences = [
    ...(data.reservation.consumptionPreferences ?? [])
      .filter(Boolean)
      .map((v) => ({ category: 'OTHER', value: v })),
    { category: 'OTHER', value: `turno:${data.reservation.shiftName}` },
  ]

  const restrictionsFromDiet = (data.reservation.dietaryNotes ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (s.length > 100 ? s.slice(0, 100) : s))

  const eventNameBase = `${data.restaurantName} · ${data.restaurantSlug}`
  const eventName = eventNameBase.length > 200 ? eventNameBase.slice(0, 200) : eventNameBase

  const metadata: Record<string, unknown> = {
    eventId: data.reservation.id,
    reservationDate: data.reservation.date,
    groupSize: data.reservation.partySize,
    occasionType: data.reservation.occasion,
    originType: data.reservation.originType,
    visitFrequency: data.reservation.visitFrequency,
    referralSource: data.reservation.referralSource,
    eventName,
    ...(restrictionsFromDiet.length ? { restrictions: restrictionsFromDiet } : {}),
    ...(preferences.length ? { preferences } : {}),
  }

  const payload = {
    eventType: 'RESERVATION' as const,
    occurredAt,
    lead: {
      email,
      name: data.guest.name,
      phone: formatPhoneForBc(data.guest.phone),
    },
    optinAccepted: data.optinMarketing,
    metadata: sanitizeMetadata(metadata),
  }

  try {
    const ok = await postToBcConnect(creds.partnerId, creds.apiKey, payload)
    if (ok) {
      await prisma.reservation.update({
        where: { id: data.reservation.id },
        data: { bcConnectSent: true },
      })
    }
  } catch (err) {
    console.warn('[BC Connect] Falha silenciosa (widget):', (err as Error).message)
  }
}
