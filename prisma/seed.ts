import { PrismaClient } from '@prisma/client'

const DEFAULT_TEMPLATES = {
  RESERVATION_CREATED: {
    WHATSAPP:
      '✅ *Reserva confirmada!*\nOlá {{guestName}}, sua reserva no *{{restaurantName}}* está confirmada.\n\n📅 {{date}} às {{time}}\n👥 {{partySize}} pessoas\n\nConfirme sua presença até 1 hora antes: {{confirmUrl}}\nPrecisa cancelar? {{cancelUrl}}\n\nAté lá! 🍽️',
    EMAIL:
      'Reserva confirmada!\n\nOlá {{guestName}}, sua reserva no {{restaurantName}} está confirmada.\n\nData: {{date}} {{time}}\nPessoas: {{partySize}}\nConfirmar: {{confirmUrl}}\nCancelar: {{cancelUrl}}\n',
  },
  REMINDER_24H: {
    WHATSAPP:
      '⏰ *Lembrete de reserva*\nOlá {{guestName}}! Sua reserva no *{{restaurantName}}* é amanhã.\n\n📅 {{date}} às {{time}} • {{partySize}} pessoas\n\nConfirme: {{confirmUrl}} | Cancelar: {{cancelUrl}}',
    EMAIL:
      'Lembrete de reserva (24h)\n\nOlá {{guestName}}!\nSua reserva no {{restaurantName}} é amanhã.\n\nData: {{date}} {{time}}\nPessoas: {{partySize}}\nConfirmar: {{confirmUrl}}\nCancelar: {{cancelUrl}}\n',
  },
  REMINDER_2H: {
    WHATSAPP:
      '🍽️ Olá {{guestName}}! Sua reserva no *{{restaurantName}}* é em 2 horas ({{time}}). Até logo! 😊',
    EMAIL:
      'Lembrete de reserva (2h)\n\nOlá {{guestName}}!\nSua reserva no {{restaurantName}} é em 2 horas.\nHorário: {{time}}\n',
  },
  PAYMENT_CONFIRMED: {
    WHATSAPP:
      '💳 *Pagamento confirmado!*\nOlá {{guestName}}, seu sinal para *{{restaurantName}}* foi recebido.\n📅 {{date}} às {{time}} • Obrigado! 🎉',
    EMAIL:
      'Pagamento confirmado\n\nOlá {{guestName}}, seu sinal para {{restaurantName}} foi recebido.\nData: {{date}} {{time}}\n',
  },
  WAITLIST_AVAILABLE: {
    WHATSAPP:
      '🎉 *Mesa disponível no {{restaurantName}}!*\nOlá {{guestName}}, uma mesa ficou disponível!\n\nVocê tem *15 minutos* para confirmar: {{confirmUrl}}\nNão quer mais? {{cancelUrl}}',
    EMAIL:
      'Mesa disponível!\n\nOlá {{guestName}}, uma mesa ficou disponível no {{restaurantName}}.\nConfirmar (15 min): {{confirmUrl}}\nCancelar: {{cancelUrl}}\n',
  },
  POST_VISIT: {
    WHATSAPP:
      '🙏 Olá {{guestName}}, obrigado pela visita ao *{{restaurantName}}*! Como foi sua experiência?\n⭐ {{reviewUrl}}',
    EMAIL:
      'Obrigado pela visita!\n\nOlá {{guestName}}, obrigado pela visita ao {{restaurantName}}.\nAvaliar: {{reviewUrl}}\n',
  },
  CANCELLED: {
    WHATSAPP:
      '❌ Olá {{guestName}}, sua reserva no *{{restaurantName}}* de {{date}} às {{time}} foi cancelada. Até a próxima! 👋',
    EMAIL:
      'Reserva cancelada\n\nOlá {{guestName}}, sua reserva no {{restaurantName}} de {{date}} às {{time}} foi cancelada.\n',
  },
} as const

const prisma = new PrismaClient()

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo.temesa.app' },
    update: {},
    create: {
      clerkId: 'clerk_demo_admin',
      email: 'admin@demo.temesa.app',
      name: 'Admin Demo',
      phone: '+5511999999999',
    },
  })

  const restaurant = await prisma.restaurant.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      name: 'Restaurante Demo',
      slug: 'demo',
      phone: '+5547999999999',
      address: { city: 'Balneário Camboriú', state: 'SC', country: 'BR' },
      operatingHours: {
        monday: { open: '12:00', close: '23:00', enabled: true },
        tuesday: { open: '12:00', close: '23:00', enabled: true },
        wednesday: { open: '12:00', close: '23:00', enabled: true },
        thursday: { open: '12:00', close: '23:00', enabled: true },
        friday: { open: '12:00', close: '23:00', enabled: true },
        saturday: { open: '12:00', close: '23:00', enabled: true },
        sunday: { open: '12:00', close: '23:00', enabled: true },
      },
    },
  })

  await prisma.userRestaurant.upsert({
    where: { userId_restaurantId: { userId: admin.id, restaurantId: restaurant.id } },
    update: { role: 'OWNER' },
    create: { userId: admin.id, restaurantId: restaurant.id, role: 'OWNER' },
  })

  const templateRows = Object.entries(DEFAULT_TEMPLATES).flatMap(([trigger, channels]) => {
    return Object.entries(channels).map(([channel, templatePtBr]) => ({
      restaurantId: restaurant.id,
      trigger: trigger as any,
      channel: channel as any,
      templatePtBr,
      isActive: true,
    }))
  })

  await prisma.notificationTemplate.createMany({
    data: templateRows,
    skipDuplicates: true,
  })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })

