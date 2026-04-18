import type {
  Customer,
  NotificationChannel,
  NotificationTrigger,
  Reservation,
  Restaurant,
} from '@prisma/client'
import { formatInTimeZone } from 'date-fns-tz'

import { prisma } from '@/lib/prisma'
import { sendWhatsApp, sendWhatsAppImage } from '@/lib/zapi'
import { getResendClient } from '@/lib/resend'
import { DEFAULT_TEMPLATES } from '@/lib/notification-templates'

export { DEFAULT_TEMPLATES }

const EMAIL_SUBJECTS: Record<NotificationTrigger, string> = {
  RESERVATION_CREATED: 'Reserva confirmada em {{restaurantName}}',
  REMINDER_24H:        'Lembrete: sua reserva amanhã em {{restaurantName}}',
  REMINDER_2H:         'Sua reserva em {{restaurantName}} é em 2 horas',
  PAYMENT_CONFIRMED:   'Pagamento confirmado — {{restaurantName}}',
  WAITLIST_AVAILABLE:  'Mesa disponível em {{restaurantName}}!',
  POST_VISIT:          'Obrigado pela visita ao {{restaurantName}}',
  CANCELLED:           'Reserva cancelada — {{restaurantName}}',
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
  if (!appUrl || appUrl.includes('localhost')) {
    console.warn(
      '[Notifications] NEXT_PUBLIC_APP_URL não está configurado para produção. Links de confirmação estarão incorretos.'
    )
  }

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
    reviewUrl: reservation.confirmToken
      ? `${appUrl}/avaliar/${reservation.confirmToken}`
      : `${appUrl}`,
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
      // Para a confirmação de reserva, envia a imagem do restaurante primeiro
      // (cover > logo) para criar uma experiência visual premium antes do texto.
      const imageUrl =
        trigger === 'RESERVATION_CREATED'
          ? (reservation.restaurant.coverUrl ?? reservation.restaurant.logoUrl ?? null)
          : null

      if (imageUrl) {
        await sendWhatsAppImage(reservation.guestPhone, imageUrl, '')
        // Pequena pausa para garantir que a imagem apareça antes do texto
        await new Promise(r => setTimeout(r, 800))
      }

      await sendWhatsApp(reservation.guestPhone, interpolateTemplate(whatsapp, vars))
    } catch (err) {
      console.error('[Notifications] WhatsApp falhou:', trigger, reservation.id, (err as Error).message)
    }
  }

  if (email && reservation.guestEmail) {
    try {
      const resend = getResendClient()
      const from = process.env.RESEND_FROM_EMAIL ?? 'noreply@temesa.app'
      const subjectTemplate = EMAIL_SUBJECTS[trigger] ?? `TeMesa — ${trigger}`
      const subject = interpolateTemplate(subjectTemplate, vars)
      const text = interpolateTemplate(email, vars)
      await resend.emails.send({ from, to: reservation.guestEmail, subject, text })
    } catch (err) {
      console.error('[Notifications] E-mail falhou:', trigger, reservation.id, (err as Error).message)
    }
  }
}

