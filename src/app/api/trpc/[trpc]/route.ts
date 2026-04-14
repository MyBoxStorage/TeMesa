import { fetchRequestHandler } from '@trpc/server/adapters/fetch'

import { appRouter } from '@/server/root-router'
import { createTRPCContext } from '@/server/trpc'

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: createTRPCContext,
    onError({ error, path }) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`tRPC failed on ${path ?? '<no-path>'}:`, error)
      }
    },
  })

export { handler as GET, handler as POST }

