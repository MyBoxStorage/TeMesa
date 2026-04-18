/**
 * Script de teste — upload de cover + envio WhatsApp premium
 * 
 * Uso:
 *   node scripts/test-whatsapp.mjs <caminho-da-imagem> <telefone>
 * 
 * Exemplos:
 *   node scripts/test-whatsapp.mjs "C:\Users\pc\Desktop\porto-cabral-cover.jpg" "+5547999990001"
 *   node scripts/test-whatsapp.mjs "./scripts/cover.jpg" "+5547999990001"
 */

import { readFileSync, existsSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'
import path from 'path'

// Carrega o .env do projeto
config({ path: path.resolve(process.cwd(), '.env') })

const SUPABASE_URL        = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const WPPCONNECT_URL      = process.env.WPPCONNECT_URL
const APP_URL             = process.env.NEXT_PUBLIC_APP_URL ?? 'https://temesa.vercel.app'

// ── Argumentos ────────────────────────────────────────────────────────────────
const [,, imagePath, phone] = process.argv

if (!imagePath || !phone) {
  console.error('Uso: node scripts/test-whatsapp.mjs <caminho-da-imagem> <telefone>')
  console.error('Ex:  node scripts/test-whatsapp.mjs "C:\\Users\\pc\\Desktop\\porto-cabral-cover.jpg" "+5547999990001"')
  process.exit(1)
}

if (!existsSync(imagePath)) {
  console.error(`❌ Imagem não encontrada: ${imagePath}`)
  process.exit(1)
}

// ── Clients ───────────────────────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
})
const prisma = new PrismaClient()

// ── Step 1: Garantir bucket público ──────────────────────────────────────────
async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets()
  const exists = buckets?.some(b => b.name === 'media')
  if (!exists) {
    const { error } = await supabase.storage.createBucket('media', {
      public: true,
      fileSizeLimit: 10485760, // 10MB
    })
    if (error) throw new Error(`Erro ao criar bucket: ${error.message}`)
    console.log('✅ Bucket "media" criado')
  } else {
    console.log('✅ Bucket "media" já existe')
  }
}

// ── Step 2: Upload da imagem ──────────────────────────────────────────────────
async function uploadImage() {
  const ext = path.extname(imagePath).toLowerCase() || '.jpg'
  const mimeTypes = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' }
  const contentType = mimeTypes[ext] ?? 'image/jpeg'
  const storagePath = `porto-cabral-bc/cover${ext}`

  const fileBuffer = readFileSync(imagePath)

  const { error } = await supabase.storage
    .from('media')
    .upload(storagePath, fileBuffer, { contentType, upsert: true })

  if (error) throw new Error(`Erro no upload: ${error.message}`)

  const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(storagePath)
  console.log(`✅ Imagem enviada: ${publicUrl}`)
  return publicUrl
}

// ── Step 3: Atualizar coverUrl do restaurante ─────────────────────────────────
async function updateCoverUrl(coverUrl) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug: 'porto-cabral-bc' },
  })
  if (!restaurant) throw new Error('Restaurante porto-cabral-bc não encontrado no banco')

  await prisma.restaurant.update({
    where: { id: restaurant.id },
    data: { coverUrl },
  })
  console.log(`✅ coverUrl atualizado no banco`)
  return restaurant
}

// ── Step 4: Enviar mensagem de teste via WPPConnect ───────────────────────────
async function sendTestMessage(coverUrl, restaurant) {
  if (!WPPCONNECT_URL) {
    console.warn('⚠️  WPPCONNECT_URL não configurado — pulando envio WhatsApp')
    console.log('\n📋 Preview da mensagem que seria enviada:')
    console.log('─'.repeat(50))
    console.log(buildMessage(restaurant.name))
    console.log('─'.repeat(50))
    return
  }

  const normalizedPhone = phone.replace(/\D/g, '').replace(/^0/, '55')

  // Envia apenas o texto — o WhatsApp gera o card de preview automaticamente
  // com a foto do restaurante via Open Graph tags da página /confirmar/[token]
  console.log('📤 Enviando mensagem...')
  const fakeToken = 'TESTE_DEMO_TOKEN_000'
  const confirmUrl = `${APP_URL}/confirmar/${fakeToken}`
  const message = buildMessage(restaurant.name, confirmUrl)

  const txtRes = await fetch(`${WPPCONNECT_URL}/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: normalizedPhone, message }),
    signal: AbortSignal.timeout(10_000),
  }).catch(e => ({ ok: false, statusText: e.message }))

  if (!txtRes.ok) {
    console.warn(`⚠️  Falha ao enviar: ${txtRes.status ?? ''} ${txtRes.statusText ?? ''}`)
    console.warn('   Verifique se o servidor WPP está rodando e o ngrok está ativo.')
  } else {
    console.log('✅ Mensagem enviada!')
    console.log('   O card de preview com a foto do Porto Cabral aparecerá automaticamente.')
    console.log('   (O WhatsApp busca os metadados OG da página /confirmar)')
  }

  console.log('\n📋 Mensagem enviada:')
  console.log('─'.repeat(50))
  console.log(message)
  console.log('─'.repeat(50))
}

function buildMessage(restaurantName, confirmUrl = 'https://temesa.vercel.app/confirmar/DEMO') {
  const now = new Date()
  const date = now.toLocaleDateString('pt-BR')
  const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  return (
    `🎉 *Reserva confirmada!*\n\n` +
    `Olá *Pedro*! Sua mesa no *${restaurantName}* está garantida. Te esperamos! ✨\n\n` +
    `📅 *${date}*\n` +
    `⏰ *${time}h*\n` +
    `👥 *2 pessoas*\n\n` +
    `━━━━━━━━━━━━━━━━\n` +
    `Vai confirmar presença? Responda:\n` +
    `✅ *SIM* — estarei lá\n` +
    `❌ *NÃO* — preciso cancelar\n` +
    `━━━━━━━━━━━━━━━━\n\n` +
    `_Ou acesse: ${confirmUrl}_`
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀 TeMesa — Teste de mensagem premium\n')

  try {
    await ensureBucket()
    const coverUrl   = await uploadImage()
    const restaurant = await updateCoverUrl(coverUrl)
    await sendTestMessage(coverUrl, restaurant)

    console.log('\n🎉 Pronto! Verifique o WhatsApp no número:', phone)
  } catch (err) {
    console.error('\n❌ Erro:', err.message)
  } finally {
    await prisma.$disconnect()
  }
}

main()
