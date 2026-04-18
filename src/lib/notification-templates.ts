import type { NotificationChannel, NotificationTrigger } from '@prisma/client'

export const DEFAULT_TEMPLATES: Record<
  NotificationTrigger,
  Partial<Record<NotificationChannel, string>>
> = {
  RESERVATION_CREATED: {
    WHATSAPP:
      '🎉 *Reserva confirmada!*\n\n' +
      'Olá *{{guestName}}*! Sua mesa no *{{restaurantName}}* está garantida. Te esperamos! ✨\n\n' +
      '📅 *{{date}}*\n' +
      '⏰ *{{time}}h*\n' +
      '👥 *{{partySize}} pessoa(s)*\n\n' +
      '━━━━━━━━━━━━━━━━\n' +
      'Vai confirmar presença? Responda:\n' +
      '✅ *SIM* — estarei lá\n' +
      '❌ *NÃO* — preciso cancelar\n' +
      '━━━━━━━━━━━━━━━━\n\n' +
      'Ou acesse:\n' +
      '{{confirmUrl}}',
    EMAIL:
      'Reserva confirmada!\n\n' +
      'Olá {{guestName}}, sua reserva no {{restaurantName}} está confirmada.\n\n' +
      'Data: {{date}}\nHorário: {{time}}h\nPessoas: {{partySize}}\n\n' +
      'Confirmar presença: {{confirmUrl}}\nCancelar: {{cancelUrl}}\n',
  },

  REMINDER_24H: {
    WHATSAPP:
      '⏰ *Lembrete — amanhã no {{restaurantName}}*\n\n' +
      'Olá *{{guestName}}*! Sua reserva é amanhã às *{{time}}h* para *{{partySize}} pessoa(s)*.\n\n' +
      'Ainda vem? Responda:\n' +
      '✅ *SIM* — confirmo presença\n' +
      '❌ *NÃO* — preciso cancelar',
    EMAIL:
      'Lembrete — sua reserva é amanhã!\n\n' +
      'Olá {{guestName}}, sua reserva no {{restaurantName}} é amanhã.\n\n' +
      'Data: {{date}}\nHorário: {{time}}h\nPessoas: {{partySize}}\n\n' +
      'Confirmar: {{confirmUrl}}\nCancelar: {{cancelUrl}}\n',
  },

  REMINDER_2H: {
    WHATSAPP:
      '🍽️ *Nos vemos em breve, {{guestName}}!*\n\n' +
      'Sua reserva no *{{restaurantName}}* começa em 2 horas — às *{{time}}h*.\n\n' +
      'Ainda vem? Responda:\n' +
      '✅ *SIM* — estou a caminho\n' +
      '❌ *NÃO* — preciso cancelar',
    EMAIL:
      'Sua reserva começa em 2 horas!\n\n' +
      'Olá {{guestName}}, sua reserva no {{restaurantName}} é em 2 horas.\n' +
      'Horário: {{time}}h\n',
  },

  PAYMENT_CONFIRMED: {
    WHATSAPP:
      '💳 *Pagamento confirmado!*\n\n' +
      'Olá *{{guestName}}*! Recebemos seu sinal para *{{restaurantName}}*.\n\n' +
      '📅 *{{date}}* às *{{time}}h* · *{{partySize}} pessoa(s)*\n\n' +
      '_Sua vaga está garantida. Até lá! 🥂_',
    EMAIL:
      'Pagamento confirmado!\n\n' +
      'Olá {{guestName}}, seu sinal para {{restaurantName}} foi recebido.\n' +
      'Data: {{date}} {{time}}h\n',
  },

  WAITLIST_AVAILABLE: {
    WHATSAPP:
      '🎉 *Mesa disponível!*\n\n' +
      'Olá *{{guestName}}*! Uma mesa ficou disponível no *{{restaurantName}}*.\n\n' +
      '⚡ Você tem *15 minutos* para confirmar!\n\n' +
      '✅ *SIM* — quero a mesa\n' +
      '❌ *NÃO* — pode liberar\n\n' +
      '{{confirmUrl}}',
    EMAIL:
      'Mesa disponível!\n\n' +
      'Olá {{guestName}}, uma mesa ficou disponível no {{restaurantName}}.\n' +
      'Confirmar (15 min): {{confirmUrl}}\nCancelar: {{cancelUrl}}\n',
  },

  POST_VISIT: {
    WHATSAPP:
      '🙏 *Obrigado pela visita, {{guestName}}!*\n\n' +
      'Foi um prazer ter você no *{{restaurantName}}*.\n\n' +
      'Sua opinião nos ajuda muito — deixe uma avaliação:\n' +
      '⭐ {{reviewUrl}}\n\n' +
      '_Esperamos te ver novamente em breve! 💛_',
    EMAIL:
      'Obrigado pela visita!\n\n' +
      'Olá {{guestName}}, obrigado por visitar o {{restaurantName}}.\n' +
      'Avaliar: {{reviewUrl}}\n',
  },

  CANCELLED: {
    WHATSAPP:
      '❌ *Reserva cancelada*\n\n' +
      'Olá *{{guestName}}*, sua reserva no *{{restaurantName}}* de *{{date}}* às *{{time}}h* foi cancelada.\n\n' +
      '_Esperamos te receber em outra oportunidade! 👋_',
    EMAIL:
      'Reserva cancelada\n\n' +
      'Olá {{guestName}}, sua reserva no {{restaurantName}} de {{date}} às {{time}}h foi cancelada.\n',
  },
}
