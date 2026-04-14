import { prisma } from '@/lib/prisma'

/**
 * Serverless-safe rate limiter backed by PostgreSQL (Supabase).
 *
 * Uses a single atomic INSERT … ON CONFLICT DO UPDATE so that multiple
 * concurrent serverless instances share the same counter without races.
 *
 * The bucket row is created on first hit and reused until the window expires.
 * When the window expires the count resets to 1 in the same atomic operation.
 *
 * @throws Error with code 'RATE_LIMITED' and retryAfterSeconds when over limit.
 */
export async function rateLimitOrThrow(params: {
  key: string
  limit: number
  windowMs: number
}): Promise<void> {
  const { key, limit, windowMs } = params

  // One atomic round-trip to the DB:
  // - INSERT a fresh bucket (count=1) if the key is new or the window expired.
  // - Otherwise increment the existing count.
  // Returns the resulting count and resetAt so we can evaluate the limit.
  const rows = await prisma.$queryRaw<Array<{ count: number; reset_at: Date }>>`
    INSERT INTO rate_limit_buckets (key, count, "resetAt")
    VALUES (
      ${key},
      1,
      NOW() + INTERVAL '1 millisecond' * ${windowMs}
    )
    ON CONFLICT (key) DO UPDATE SET
      count     = CASE
                    WHEN rate_limit_buckets."resetAt" <= NOW() THEN 1
                    ELSE rate_limit_buckets.count + 1
                  END,
      "resetAt" = CASE
                    WHEN rate_limit_buckets."resetAt" <= NOW()
                    THEN NOW() + INTERVAL '1 millisecond' * ${windowMs}
                    ELSE rate_limit_buckets."resetAt"
                  END
    RETURNING count, "resetAt" AS reset_at
  `

  const row = rows[0]
  if (!row) {
    // Should never happen — RETURNING always yields a row on upsert.
    // Fail open: let the request through rather than blocking legitimate users.
    return
  }

  if (row.count > limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((row.reset_at.getTime() - Date.now()) / 1000))
    const err = new Error('Too many requests')
    ;(err as any).code = 'RATE_LIMITED'
    ;(err as any).retryAfterSeconds = retryAfterSeconds
    throw err
  }
}
