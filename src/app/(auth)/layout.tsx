import { AuthedProviders } from '@/app/providers'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthedProviders>{children}</AuthedProviders>
}

