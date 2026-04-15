import type {
  Customer,
  NotificationChannel,
  NotificationTrigger,
  Reservation,
  Restaurant,
} from '@prisma/client'
import { formatInTimeZone } from 'date-fns-tz'

import { prisma } from '@/lib/prisma'
import { sendWhatsApp } from '@/lib/zapi'
import { getResendClient } from '@/lib/resend'

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

function interpolateTemplate(template: string, vars: Record<string, string>): string {
  return template.replaceAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => vars[key] ?? '')
}

export async function sendNotification(params: {
  restaurantId: string
  trigger: NotificationTrigger
  reservation: Reservation & { restaurant: Restaurant; customer?: Customer | null }
  locale?: 'pt-BR' | 'en' | 'es'
}): Promise<void> {
  const { trigger, reservation, restaurantId } = params
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  const confirmUrl = reservation.confirmToken
    ? `${appUrl}/confirmar/${reservation.confirmToken}`
    : `${appUrl}`
  const cancelUrl = reservation.confirmToken
    ? `${appUrl}/confirmar/${reservation.confirmToken}?action=cancel`
    : `${appUrl}`

  const timezone = reservation.restaurant.timezone ?? 'America/Sao_Paulo'
  const vars: Record<string, string> = {
    guestName: reservation.guestName,
    restaurantName: reservation.restaurant.name,
    date: formatInTimeZone(new Date(reservation.date), timezone, 'dd/MM/yyyy'),
    time: formatInTimeZone(new Date(reservation.date), timezone, 'HH:mm'),
    partySize: String(reservation.partySize),
    shiftName: '',
    tableArea: '',
    confirmUrl,
    cancelUrl,
    reviewUrl: `${appUrl}`,
  }

  const templates = await prisma.notificationTemplate.findMany({
    where: { restaurantId, trigger, isActive: true },
  })

  const byChannel = new Map<NotificationChannel, string>()
  for (const t of templates) byChannel.set(t.channel, t.templatePtBr)

  const whatsapp = byChannel.get('WHATSAPP') ?? DEFAULT_TEMPLATES[trigger].WHATSAPP
  const email = byChannel.get('EMAIL') ?? DEFAULT_TEMPLATES[trigger].EMAIL

  if (whatsapp) {
    try {
      await sendWhatsApp(reservation.guestPhone, interpolateTemplate(whatsapp, vars))
    } catch (err) {
      console.error('[Notifications] WhatsApp falhou:', trigger, reservation.id, (err as Error).message)
    }
  }

  if (email && reservation.guestEmail) {
    try {
      const resend = getResendClient()
      const from = process.env.RESEND_FROM_EMAIL ?? 'noreply@temesa.app'
      const subject = `TeMesa • ${trigger}`
      const text = interpolateTemplate(email, vars)
      await resend.emails.send({ from, to: reservation.guestEmail, subject, text })
    } catch (err) {
      console.error('[Notifications] E-mail falhou:', trigger, reservation.id, (err as Error).message)
    }
  }
}

