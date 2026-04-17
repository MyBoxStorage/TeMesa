import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono, Figtree } from "next/font/google"
import "./globals.css"
import { cn } from "@/lib/utils"
import { PublicProviders } from "./providers"

const figtree   = Figtree({ subsets: ['latin'], variable: '--font-sans' })
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "TeMesa",
  description: "SaaS white-label de gestão de reservas para restaurantes",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TeMesa",
  },
  icons: {
    apple: "/icon-192.png",
  },
}

export const viewport: Viewport = {
  themeColor: "#09090b",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      // "dark" fixo: o dashboard usa dark mode; o widget usa cores hardcoded.
      // next-themes removido pois injeta <script> incompatível com React 19.
      className={cn(
        "dark h-full antialiased",
        geistSans.variable,
        geistMono.variable,
        figtree.variable,
        "font-sans"
      )}
    >
      <body className="min-h-full flex flex-col">
        <PublicProviders>{children}</PublicProviders>
      </body>
    </html>
  )
}
