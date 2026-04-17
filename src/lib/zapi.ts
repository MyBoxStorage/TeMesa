/**
 * WhatsApp client — WPPConnect local (wpp-temesa)
 * Servidor Node.js rodando em C:\Users\pc\Desktop\wpp-temesa
 * Exposto via ngrok na porta 21465
 *
 * Env vars:
 *   WPPCONNECT_URL   URL base (ex: https://xxxx.ngrok-free.app)
 */

const BASE = process.env.WPPCONNECT_URL ?? ''

export async function sendWhatsApp(phone: string, message: string): Promise<void> {
  if (!BASE) {
    console.log('[WPPConnect] WPPCONNECT_URL não configurado — mensagem não enviada')
    return
  }

  const number = phone.replace(/\D/g, '').replace(/^0/, '55')

  try {
    const res = await fetch(`${BASE}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: number, message }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) console.warn('[WPPConnect] Falha:', res.status, await res.text())
  } catch (err) {
    console.warn('[WPPConnect] Erro de rede:', (err as Error).message)
  }
}
