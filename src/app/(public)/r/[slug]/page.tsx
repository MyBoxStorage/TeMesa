import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { BookingWidget } from '@/components/widget/booking-widget'

export default async function WidgetPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      coverUrl: true,
      themeConfig: true,
      operatingHours: true,
      settings: true,
      shifts: {
        where: { isActive: true },
        select: { daysOfWeek: true },
      },
    },
  })

  if (!restaurant) notFound()

  const theme = (restaurant.themeConfig as Record<string, string> | null) ?? {
    primaryColor: '#000000',
    accentColor: '#000000',
    fontFamily: 'Figtree',
    borderRadius: '0.5rem',
  }

  // Derivar dias da semana ativos a partir dos turnos ativos
  const activeDaysOfWeek = [
    ...new Set(restaurant.shifts.flatMap((s) => s.daysOfWeek as number[])),
  ]

  // Datas bloqueadas armazenadas em restaurant.settings.blockedDates
  const settings = (restaurant.settings ?? {}) as Record<string, unknown>
  const blockedDates = (settings.blockedDates ?? []) as string[]

  const restaurantProps = {
    id: restaurant.id,
    name: restaurant.name,
    slug: restaurant.slug,
    logoUrl: restaurant.logoUrl,
    coverUrl: restaurant.coverUrl,
    themeConfig: restaurant.themeConfig as Record<string, unknown> | null,
    activeDaysOfWeek,
    blockedDates,
  }

  return (
    <>
      <style>{`
        :root {
          --widget-primary: ${theme.primaryColor};
          --widget-accent:  ${theme.accentColor ?? theme.primaryColor};
          --widget-radius:  ${theme.borderRadius ?? '0.5rem'};
          --widget-font:    ${theme.fontFamily ?? 'Figtree'};
        }
        body { font-family: var(--widget-font), sans-serif; background: #0a0a0a; }
      `}</style>
      <BookingWidget restaurant={restaurantProps} />
    </>
  )
}
