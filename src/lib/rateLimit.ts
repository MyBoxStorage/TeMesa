type Bucket = { resetAt: number; count: number }

const buckets = new Map<string, Bucket>()

export function rateLimitOrThrow(params: {
  key: string
  limit: number
  windowMs: number
  now?: number
}): void {
  const now = params.now ?? Date.now()
  const bucket = buckets.get(params.key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(params.key, { resetAt: now + params.windowMs, count: 1 })
    return
  }
  bucket.count += 1
  if (bucket.count > params.limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
    const err = new Error('RATE_LIMITED')
    ;(err as any).code = 'RATE_LIMITED'
    ;(err as any).retryAfterSeconds = retryAfterSeconds
    throw err
  }
}

