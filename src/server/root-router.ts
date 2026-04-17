import { router } from '@/server/trpc'

import { restaurantRouter } from '@/server/routers/restaurant'
import { shiftsRouter } from '@/server/routers/shifts'
import { tablesRouter } from '@/server/routers/tables'
import { floorPlanRouter } from '@/server/routers/floor-plan'
import { reservationsRouter } from '@/server/routers/reservations'
import { customersRouter } from '@/server/routers/customers'
import { waitlistRouter } from '@/server/routers/waitlist'
import { serversRouter } from '@/server/routers/servers'
import { notificationsRouter } from '@/server/routers/notifications'
import { autoTagsRouter } from '@/server/routers/auto-tags'
import { analyticsRouter } from '@/server/routers/analytics'
import { widgetRouter } from '@/server/routers/widget'
import { adminRouter } from '@/server/routers/admin'
import { recurringRouter } from '@/server/routers/recurring'

export const appRouter = router({
  restaurant: restaurantRouter,
  shifts: shiftsRouter,
  tables: tablesRouter,
  floorPlan: floorPlanRouter,
  reservations: reservationsRouter,
  customers: customersRouter,
  waitlist: waitlistRouter,
  servers: serversRouter,
  notifications: notificationsRouter,
  autoTags: autoTagsRouter,
  analytics: analyticsRouter,
  widget: widgetRouter,
  admin: adminRouter,
  recurring: recurringRouter,
})

export type AppRouter = typeof appRouter

