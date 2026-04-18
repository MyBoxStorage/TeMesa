/**
 * WhatsApp client — WPPConnect local (wpp-temesa)
 * Servidor Node.js rodando em C:\Users\pc\Desktop\wpp-temesa
 * Exposto via ngrok na porta 21465
 *
 * Env vars:
 *   WPPCONNECT_URL   URL base (ex: https://xxxx.ngrok-free.app)
 */

const BASE = process.env.WPPCONNECT_URL ?? ''

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').replace(/^0/, '55')
}

/** Envia mensagem de texto simples */
export async function sendWhatsApp(phone: string, message: string): Promise<void> {
  if (!BASE) {
    console.log('[WPPConnect] WPPCONNECT_URL não configurado — mensagem não enviada')
    return
  }

  try {
    const res = await fetch(`${BASE}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: normalizePhone(phone), message }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) console.warn('[WPPConnect] Falha /send:', res.status, await res.text())
  } catch (err) {
    console.warn('[WPPConnect] Erro de rede /send:', (err as Error).message)
  }
}

/**
 * Envia imagem (URL pública) seguida de uma mensagem de texto.
 * Quando o restaurante tem coverUrl ou logoUrl, use para criar a
 * experiência premium: imagem primeiro, detalhes depois.
 */
export async function sendWhatsAppImage(
  phone: string,
  imageUrl: string,
  caption: string
): Promise<void> {
  if (!BASE) {
    console.log('[WPPConnect] WPPCONNECT_URL não configurado — imagem não enviada')
    return
  }

  try {
    const res = await fetch(`${BASE}/send-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: normalizePhone(phone), imageUrl, caption }),
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) console.warn('[WPPConnect] Falha /send-image:', res.status, await res.text())
  } catch (err) {
    console.warn('[WPPConnect] Erro de rede /send-image:', (err as Error).message)
  }
}
