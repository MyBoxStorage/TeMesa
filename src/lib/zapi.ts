const BASE = process.env.ZAPI_BASE_URL ?? 'https://api.z-api.io'
const INSTANCE = process.env.ZAPI_INSTANCE_ID ?? ''
const TOKEN = process.env.ZAPI_TOKEN ?? ''
const CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN ?? ''

export async function sendWhatsApp(phone: string, message: string): Promise<void> {
  if (!INSTANCE || !TOKEN) {
    console.log('[Z-API] Não configurado — mensagem não enviada')
    return
  }
  const phoneClean = phone.replace(/\D/g, '').replace(/^0/, '55')
  try {
    const res = await fetch(`${BASE}/instances/${INSTANCE}/token/${TOKEN}/send-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Client-Token': CLIENT_TOKEN },
      body: JSON.stringify({ phone: phoneClean, message }),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) console.warn('[Z-API] Falha:', await res.text())
  } catch (err) {
    console.warn('[Z-API] Erro:', (err as Error).message)
  }
}

