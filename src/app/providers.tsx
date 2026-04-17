'use client'

import { ClerkProvider } from '@clerk/nextjs'
import type { ReactNode } from 'react'

import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { TrpcProvider } from '@/trpc/react'
import { PostHogProvider } from '@/lib/posthog'

export function PublicProviders(props: { children: ReactNode }) {
  return (
    <PostHogProvider>
      <TooltipProvider>
        <TrpcProvider>
          {props.children}
          <Toaster />
        </TrpcProvider>
      </TooltipProvider>
    </PostHogProvider>
  )
}

export function AuthedProviders(props: { children: ReactNode }) {
  return (
    <ClerkProvider>
      {props.children}
    </ClerkProvider>
  )
}
