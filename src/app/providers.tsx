'use client'

import { ClerkProvider } from '@clerk/nextjs'
import type { ReactNode } from 'react'

import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { TrpcProvider } from '@/trpc/react'

export function PublicProviders(props: { children: ReactNode }) {
  return (
    <TooltipProvider>
      <TrpcProvider>
        {props.children}
        <Toaster />
      </TrpcProvider>
    </TooltipProvider>
  )
}

export function AuthedProviders(props: { children: ReactNode }) {
  return (
    <ClerkProvider>
      {props.children}
    </ClerkProvider>
  )
}
