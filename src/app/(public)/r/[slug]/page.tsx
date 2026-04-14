import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { BookingWidget } from '@/components/widget/booking-widget'

export default async function WidgetPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: {
      id: true, name: true, slug: true,
      logoUrl: true, coverUrl: true,
      themeConfig: true, operatingHours: true,
    },
  })
  if (!restaurant) notFound()

  const theme = (restaurant.themeConfig as any) ?? {
    primaryColor: '#000000', accentColor: '#000000',
    fontFamily: 'Figtree', borderRadius: '0.5rem',
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
      <BookingWidget restaurant={restaurant as any} />
    </>
  )
}
