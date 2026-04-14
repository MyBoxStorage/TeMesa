'use client'

import { ClerkProvider } from '@clerk/nextjs'
import { ThemeProvider } from 'next-themes'
import type { ReactNode } from 'react'

import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { TrpcProvider } from '@/trpc/react'

export function AppProviders(props: { children: ReactNode }) {
  return (
    <ClerkProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <TooltipProvider>
          <TrpcProvider>
            {props.children}
            <Toaster />
          </TrpcProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ClerkProvider>
  )
}
