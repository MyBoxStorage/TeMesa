import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { AuthedProviders } from '@/app/providers'
import { AdminSidebar } from '@/components/admin/admin-sidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) redirect('/sign-in')

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUserId } })
  if (!user?.isAdmin) redirect('/dashboard/reservas')

  return (
    <AuthedProviders>
      <div className="flex h-screen bg-[#0a0a0a] text-white overflow-hidden">

      <AdminSidebar />

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
      </div>
    </AuthedProviders>
  )
}
