import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ConfirmationPage } from '@/components/widget/confirmation-page'

export default async function ConfirmarPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const reservation = await prisma.reservation.findFirst({
    where: { confirmToken: token },
    include: { restaurant: { select: { name: true, logoUrl: true, phone: true, themeConfig: true } } },
  })

  // If not found at all — show error page
  const restaurant = reservation?.restaurant ?? null

  const theme = (reservation?.restaurant?.themeConfig as any) ?? {
    primaryColor: '#000000', borderRadius: '0.5rem',
  }

  return (
    <>
      <style>{`
        :root {
          --cp-primary: ${theme.primaryColor};
          --cp-radius:  ${theme.borderRadius ?? '0.5rem'};
        }
        body { background: #0a0a0a; font-family: 'Figtree', sans-serif; }
      `}</style>
      <ConfirmationPage
        token={token}
        reservation={reservation as any}
        restaurant={restaurant as any}
      />
    </>
  )
}
