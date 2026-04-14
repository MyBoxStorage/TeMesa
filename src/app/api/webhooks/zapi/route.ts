import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const expected = process.env.ZAPI_TOKEN ?? ''
  const token = req.headers.get('x-z-api-security-token') ?? ''
  if (expected && token !== expected) return new NextResponse('Unauthorized', { status: 401 })

  // MVP: apenas confirma recebimento. Integração completa (interpretação de mensagens)
  // pode ser adicionada depois sem quebrar o contrato de webhook.
  const _payload = await req.json().catch(() => null)
  return NextResponse.json({ ok: true })
}

