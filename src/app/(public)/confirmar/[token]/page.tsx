import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { ConfirmationPage } from '@/components/widget/confirmation-page'
import { formatInTimeZone } from 'date-fns-tz'

// ── Open Graph dinâmico ────────────────────────────────────────────────────────
// O WhatsApp busca estas tags ao renderizar o card de preview do link.
// Isso elimina a necessidade de enviar a imagem como mensagem separada.
export async function generateMetadata(
  { params }: { params: Promise<{ token: string }> },
): Promise<Metadata> {
  const { token } = await params

  const reservation = await prisma.reservation.findFirst({
    where: { confirmToken: token },
    include: {
      restaurant: {
        select: { name: true, coverUrl: true, logoUrl: true, timezone: true },
      },
    },
  })

  if (reservation) {
    const r = reservation.restaurant
    const tz = r.timezone ?? 'America/Sao_Paulo'
    const date = formatInTimeZone(new Date(reservation.date), tz, 'dd/MM/yyyy')
    const time = formatInTimeZone(new Date(reservation.date), tz, 'HH:mm')
    const image = r.coverUrl ?? r.logoUrl ?? undefined

    const title = `Sua reserva no ${r.name} está confirmada ✅`
    const description = `📅 ${date} às ${time}h · 👥 ${reservation.partySize} pessoa${reservation.partySize !== 1 ? 's' : ''}`

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        siteName: r.name,
        ...(image && {
          images: [{ url: image, width: 1200, height: 630, alt: r.name }],
        }),
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        ...(image && { images: [image] }),
      },
    }
  }

  const waitlist = await prisma.waitlistEntry.findFirst({
    where: { confirmToken: token },
    include: {
      restaurant: { select: { name: true, coverUrl: true, logoUrl: true } },
    },
  })

  if (waitlist) {
    const r = waitlist.restaurant
    const image = r.coverUrl ?? r.logoUrl ?? undefined
    const title = `Mesa disponível — ${r.name}`
    const description = `Confirme em poucos minutos para garantir sua mesa · ${waitlist.partySize} pessoa${waitlist.partySize !== 1 ? 's' : ''}`
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        siteName: r.name,
        ...(image && {
          images: [{ url: image, width: 1200, height: 630, alt: r.name }],
        }),
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        ...(image && { images: [image] }),
      },
    }
  }

  return { title: 'Reserva — TeMesa' }
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default async function ConfirmarPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ action?: string }>
}) {
  const { token } = await params
  const { action } = await searchParams
  const urlIntent = action === 'cancel' ? 'cancel' : null

  const reservation = await prisma.reservation.findFirst({
    where: { confirmToken: token },
    include: {
      restaurant: {
        select: { name: true, logoUrl: true, coverUrl: true, phone: true, themeConfig: true },
      },
      table: { select: { name: true, area: true } },
    },
  })

  const waitlistEntry =
    reservation == null
      ? await prisma.waitlistEntry.findFirst({
          where: { confirmToken: token },
          include: {
            restaurant: {
              select: { name: true, logoUrl: true, coverUrl: true, phone: true, themeConfig: true },
            },
          },
        })
      : null

  const restaurant = reservation?.restaurant ?? waitlistEntry?.restaurant ?? null
  const theme = (restaurant?.themeConfig as Record<string, unknown> | null) ?? {
    primaryColor: '#000000',
    borderRadius: '0.5rem',
  }

  return (
    <>
      <style>{`
        :root {
          --cp-primary: ${(theme as { primaryColor?: string }).primaryColor ?? '#000000'};
          --cp-radius:  ${(theme as { borderRadius?: string }).borderRadius ?? '0.5rem'};
        }
        body { background: #0a0a0a; font-family: 'Figtree', sans-serif; }
      `}</style>
      <ConfirmationPage
        token={token}
        reservation={reservation}
        waitlistEntry={waitlistEntry}
        restaurant={restaurant}
        urlIntent={urlIntent}
      />
    </>
  )
}
