import { notFound } from 'next/navigation'

import { prisma } from '@/lib/prisma'

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    select: { name: true, slug: true },
  })
  if (!restaurant) notFound()

  return (
    <div className="mx-auto max-w-3xl p-8 space-y-3">
      <h1 className="text-2xl font-semibold">{restaurant.name}</h1>
      <p className="text-sm text-zinc-600">
        Widget público (iframe) — placeholder. Slug: <span className="font-mono">{restaurant.slug}</span>
      </p>
    </div>
  )
}
