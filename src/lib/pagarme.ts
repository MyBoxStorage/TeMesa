const BASE = 'https://api.pagar.me/core/v5'

function getApiKey(): string {
  const key = process.env.PAGARME_API_KEY ?? ''
  if (!key) throw new Error('PAGARME_API_KEY is missing')
  return key
}

function authHeader(): string {
  return 'Basic ' + Buffer.from(getApiKey() + ':').toString('base64')
}

export interface CreatePixOrderParams {
  amountCents: number
  expiresAt: Date
  customer: { name: string; email?: string; phone: string }
  description: string
  metadata?: Record<string, string>
}

export interface PixOrderResult {
  orderId: string
  pixCode: string
  pixQrCodeUrl: string
  expiresAt: Date
}

export async function createPixOrder(params: CreatePixOrderParams): Promise<PixOrderResult> {
  const phoneDigits = params.customer.phone.replace(/\D/g, '')
  const mobileNumber = phoneDigits.length >= 11 ? phoneDigits.slice(-11) : phoneDigits

  const body = {
    items: [{ amount: params.amountCents, description: params.description, quantity: 1 }],
    customer: {
      name: params.customer.name,
      email: params.customer.email ?? `${phoneDigits}@temesa.app`,
      type: 'individual',
      phones: {
        mobile_phone: { country_code: '55', area_code: mobileNumber.slice(0, 2), number: mobileNumber.slice(2) },
      },
    },
    payments: [{
      payment_method: 'pix',
      pix: { expires_in: Math.max(60, Math.floor((params.expiresAt.getTime() - Date.now()) / 1000)) },
    }],
    metadata: params.metadata ?? {},
  }

  const res = await fetch(`${BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: authHeader() },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Pagar.me ${res.status}: ${err}`)
  }

  const data = (await res.json()) as {
    id?: string
    charges?: Array<{ last_transaction?: { qr_code?: string; qr_code_url?: string; expires_at?: string } }>
  }
  const lastTx = data.charges?.[0]?.last_transaction

  if (!lastTx?.qr_code) throw new Error('Pagar.me não retornou QR code Pix')
  if (!data.id) throw new Error('Pagar.me não retornou id do pedido')

  return {
    orderId: String(data.id),
    pixCode: String(lastTx.qr_code),
    pixQrCodeUrl: lastTx.qr_code_url ? String(lastTx.qr_code_url) : '',
    expiresAt: lastTx.expires_at ? new Date(lastTx.expires_at) : params.expiresAt,
  }
}
