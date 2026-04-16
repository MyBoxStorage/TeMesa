import { AuthedProviders } from '@/app/providers'

export default function DashboardGroupLayout({ children }: { children: React.ReactNode }) {
  return <AuthedProviders>{children}</AuthedProviders>
}

