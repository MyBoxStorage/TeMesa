'use client'

import { ClerkProvider } from '@clerk/nextjs'
import type { ReactNode } from 'react'

import { TrpcProvider } from '@/trpc/react'

export function AppProviders(props: { children: ReactNode }) {
  return (
    <ClerkProvider>
      <TrpcProvider>{props.children}</TrpcProvider>
    </ClerkProvider>
  )
}
