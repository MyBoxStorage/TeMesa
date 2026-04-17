import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/r/(.*)',
  '/confirmar/(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/convite(.*)',
  '/onboarding(.*)',
  '/api/trpc/(.*)',
  '/api/widget/(.*)',
  '/api/bc-connect/(.*)',
  '/api/webhooks/(.*)',
  '/api/cron/(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

