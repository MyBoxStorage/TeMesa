/**
 * prisma/seed.ts
 * Cria (ou atualiza) o restaurante Porto Cabral BC com turnos prontos.
 * Execução: pnpm tsx prisma/seed.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed do Porto Cabral BC...')

  // ── 1. Restaurante ────────────────────────────────────────────────────────
  const restaurant = await prisma.restaurant.upsert({
    where: { slug: 'porto-cabral-bc' },
    update: {
      name: 'Porto Cabral BC',
      phone: '+554733660000',
      themeConfig: {
        primaryColor: '#C8A96E',
        accentColor:  '#C8A96E',
        fontFamily:   'Playfair Display',
        borderRadius: '0.75rem',
      },
      operatingHours: {
        mon: { open: '12:00', close: '23:00' },
        tue: { open: '12:00', close: '23:00' },
        wed: { open: '12:00', close: '23:00' },
        thu: { open: '12:00', close: '23:00' },
        fri: { open: '12:00', close: '00:00' },
        sat: { open: '12:00', close: '00:00' },
        sun: { open: '12:00', close: '23:00' },
      },
    },
    create: {
      name:    'Porto Cabral BC',
      slug:    'porto-cabral-bc',
      phone:   '+554733660000',
      address: {
        street:  'Av. Atlântica',
        city:    'Balneário Camboriú',
        state:   'SC',
        zip:     '88330-000',
        country: 'BR',
      },
      timezone: 'America/Sao_Paulo',
      themeConfig: {
        primaryColor: '#C8A96E',
        accentColor:  '#C8A96E',
        fontFamily:   'Playfair Display',
        borderRadius: '0.75rem',
      },
      operatingHours: {
        mon: { open: '12:00', close: '23:00' },
        tue: { open: '12:00', close: '23:00' },
        wed: { open: '12:00', close: '23:00' },
        thu: { open: '12:00', close: '23:00' },
        fri: { open: '12:00', close: '00:00' },
        sat: { open: '12:00', close: '00:00' },
        sun: { open: '12:00', close: '23:00' },
      },
      isActive: true,
    },
  })
  console.log(`✅ Restaurante: ${restaurant.name} (id: ${restaurant.id})`)

  // ── 2. Turnos ─────────────────────────────────────────────────────────────
  const shiftsData = [
    {
      name:         'Almoço',
      startTime:    '12:00',
      endTime:      '15:30',
      daysOfWeek:   [0, 1, 2, 3, 4, 5, 6],
      maxCapacity:  120,
      turnDuration: 90,
    },
    {
      name:         'Happy Hour',
      startTime:    '17:00',
      endTime:      '19:00',
      daysOfWeek:   [4, 5, 6],
      maxCapacity:  60,
      turnDuration: 60,
    },
    {
      name:         'Jantar',
      startTime:    '19:00',
      endTime:      '23:00',
      daysOfWeek:   [0, 1, 2, 3, 4, 5, 6],
      maxCapacity:  120,
      turnDuration: 120,
    },
  ]

  for (const s of shiftsData) {
    const existing = await prisma.shift.findFirst({
      where: { restaurantId: restaurant.id, name: s.name },
    })
    if (existing) {
      await prisma.shift.update({ where: { id: existing.id }, data: { ...s, isActive: true } })
      console.log(`  ↻ Turno atualizado: ${s.name}`)
    } else {
      await prisma.shift.create({ data: { restaurantId: restaurant.id, ...s, isActive: true } })
      console.log(`  ✚ Turno criado: ${s.name}`)
    }
  }

  console.log('')
  console.log('──────────────────────────────────────────')
  console.log('🎉 Seed concluído!')
  console.log(`   Restaurante ID : ${restaurant.id}`)
  console.log(`   Widget URL     : https://unique-sfogliatella-a00c01.netlify.app/r/porto-cabral-bc`)
  console.log('──────────────────────────────────────────')
}

main()
  .catch((e) => { console.error('❌ Erro no seed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
