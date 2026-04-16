import { clerkMiddleware } from '@clerk/nextjs/server'

export default clerkMiddleware(async (auth, req) => {
  // Only protect non-public routes. Public routes are excluded from matcher
  // (so Clerk middleware doesn't run at all for /r/* and /confirmar/*).
  const pathname = req.nextUrl.pathname
  const isPublic =
    pathname.startsWith('/r/') ||
    pathname === '/r' ||
    pathname.startsWith('/confirmar/') ||
    pathname === '/confirmar' ||
    pathname.startsWith('/sign-in') ||
    pathname.startsWith('/sign-up') ||
    pathname.startsWith('/convite') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/api/trpc') ||
    pathname.startsWith('/api/webhooks') ||
    pathname.startsWith('/api/cron') ||
    pathname.startsWith('/api/widget')

  if (!isPublic) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Exclude static files, Next internals, AND widget public routes.
    '/((?!_next|r/|confirmar/|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}

