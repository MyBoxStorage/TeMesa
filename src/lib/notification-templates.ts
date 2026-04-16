import type { NotificationChannel, NotificationTrigger } from '@prisma/client'

export const DEFAULT_TEMPLATES: Record<
  NotificationTrigger,
  Partial<Record<NotificationChannel, string>>
> = {
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
}

