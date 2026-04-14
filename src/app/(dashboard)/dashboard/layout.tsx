import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { UserButton } from '@clerk/nextjs'

import { prisma } from '@/lib/prisma'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await prisma.user.findUnique({ where: { clerkId: userId } })
  if (!user) redirect('/onboarding')

  const membership = await prisma.userRestaurant.findFirst({
    where: { userId: user.id },
    include: { restaurant: true },
    orderBy: { createdAt: 'asc' },
  })

  if (!membership?.restaurant) redirect('/onboarding')

  const onboarding = membership.restaurant.onboardingStatus as unknown
  const needsOnboarding =
    onboarding &&
    typeof onboarding === 'object' &&
    'restaurant' in onboarding &&
    (onboarding as { restaurant?: boolean }).restaurant === false

  // Evita loop: onboarding é rota pública fora do grupo (dashboard)
  if (needsOnboarding) redirect('/onboarding')

  const nav = [
    { href: '/dashboard/reservas', label: 'Reservas' },
    { href: '/dashboard/mesas', label: 'Mesas' },
    { href: '/dashboard/waitlist', label: 'Waitlist' },
    { href: '/dashboard/clientes', label: 'Clientes' },
    { href: '/dashboard/garcons', label: 'Garçons' },
    { href: '/dashboard/relatorios', label: 'Relatórios' },
    { href: '/dashboard/configuracoes', label: 'Configurações' },
  ] as const

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="font-semibold">TeMesa</div>
            <nav className="hidden flex-wrap gap-3 text-sm text-zinc-700 md:flex">
              {nav.map((item) => (
                <Link key={item.href} className="hover:text-black" href={item.href}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <UserButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  )
}
