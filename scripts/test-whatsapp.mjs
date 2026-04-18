/**
 * Script de teste — foto + texto em uma única mensagem
 *
 * Uso:
 *   node scripts/test-whatsapp.mjs "+55NUMERO"
 *
 * Exemplo:
 *   node scripts/test-whatsapp.mjs "+5521973003715"
 */

import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'
import path from 'path'
import { randomBytes } from 'crypto'

config({ path: path.resolve(process.cwd(), '.env') })

const WPPCONNECT_URL = process.env.WPPCONNECT_URL
const APP_URL        = process.env.NEXT_PUBLIC_APP_URL ?? 'https://temesa.vercel.app'

const [,, phone] = process.argv

if (!phone) {
  console.error('Uso: node scripts/test-whatsapp.mjs "+55NUMERO"')
  process.exit(1)
}

const prisma = new PrismaClient()

async function main() {
  console.log('\n🚀 TeMesa — Teste de mensagem premium\n')

  const restaurant = await prisma.restaurant.findUnique({ where: { slug: 'porto-cabral-bc' } })
  if (!restaurant) { console.error('❌ Restaurante não encontrado'); process.exit(1) }

  console.log(`✅ Restaurante: ${restaurant.name}`)
  console.log(`   Cover URL: ${restaurant.coverUrl ?? '(vazio)'}`)

  const token = randomBytes(20).toString('hex') // hex = sem underscores
  const shift = await prisma.shift.findFirst({
    where: { restaurantId: restaurant.id, isActive: true },
    select: { id: true },
  })

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(22, 0, 0, 0)

  const reservation = await prisma.reservation.create({
    data: {
      restaurantId: restaurant.id,
      guestName: 'Pedro',
      guestPhone: phone,
      partySize: 2,
      date: tomorrow,
      shiftId: shift?.id,
      status: 'CONFIRMED',
      source: 'MANUAL',
      lgpdConsent: true,
      confirmToken: token,
      confirmTokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 2),
    },
  })
  console.log(`✅ Reserva criada — token: ${token.slice(0, 10)}...`)

  const confirmUrl = `${APP_URL}/confirmar/${token}`
  const date = tomorrow.toLocaleDateString('pt-BR')

  const message =
    `🎉 *Reserva confirmada!*\n\n` +
    `Olá *Pedro*! Sua mesa no *${restaurant.name}* está garantida. Te esperamos! ✨\n\n` +
    `📅 *${date}*\n` +
    `⏰ *22:00h*\n` +
    `👥 *2 pessoas*\n\n` +
    `━━━━━━━━━━━━━━━━\n` +
    `Vai confirmar presença? Responda:\n` +
    `✅ *SIM* — estarei lá\n` +
    `❌ *NÃO* — preciso cancelar\n` +
    `━━━━━━━━━━━━━━━━\n\n` +
    `Ou acesse:\n` +
    confirmUrl

  console.log('\n📋 Mensagem:')
  console.log('─'.repeat(55))
  console.log(message)
  console.log('─'.repeat(55))

  if (!WPPCONNECT_URL) {
    console.warn('\n⚠️  WPPCONNECT_URL não configurado')
    await prisma.$disconnect()
    return
  }

  const normalizedPhone = phone.replace(/\D/g, '').replace(/^0/, '55')
  const coverUrl = restaurant.coverUrl ?? restaurant.logoUrl

  if (coverUrl) {
    console.log(`\n📤 Enviando foto + texto (uma mensagem)...`)
    const res = await fetch(`${WPPCONNECT_URL}/send-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: normalizedPhone, imageUrl: coverUrl, caption: message }),
      signal: AbortSignal.timeout(15_000),
    }).catch(e => ({ ok: false, statusText: e.message }))

    if (!res.ok) {
      console.error(`❌ Falha: ${res.status ?? ''} ${res.statusText ?? ''}`)
      console.log('\n📤 Tentando enviar só o texto como fallback...')
      await sendText(normalizedPhone, message)
    } else {
      console.log('✅ Foto + texto enviados como uma única mensagem!')
    }
  } else {
    console.log('\n⚠️  Sem coverUrl — enviando só texto')
    await sendText(normalizedPhone, message)
  }

  console.log('\n🧹 Reserva de teste será removida em 30 minutos.')
  setTimeout(async () => {
    try { await prisma.reservation.delete({ where: { id: reservation.id } }) } catch {}
    await prisma.$disconnect()
    console.log('🧹 Reserva removida.')
    process.exit(0)
  }, 30 * 60 * 1000)

  await new Promise(r => setTimeout(r, 30 * 60 * 1000 + 500))
}

async function sendText(phone, message) {
  const res = await fetch(`${WPPCONNECT_URL}/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, message }),
    signal: AbortSignal.timeout(10_000),
  }).catch(e => ({ ok: false, statusText: e.message }))
  if (!res.ok) console.error(`❌ Texto falhou: ${res.statusText}`)
  else console.log('✅ Texto enviado!')
}

main().catch(async err => {
  console.error('❌', err.message)
  await prisma.$disconnect()
  process.exit(1)
})
