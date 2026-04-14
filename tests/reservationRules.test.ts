import { describe, expect, it } from 'vitest'

import { confirmTokenExpiresAt, reliabilityScore } from '@/lib/reservationRules'

describe('reservation rules', () => {
  it('computes reliabilityScore within [0,100]', () => {
    expect(reliabilityScore({ noShowCount: 0, visitCount: 0 })).toBe(100)
    expect(reliabilityScore({ noShowCount: 1, visitCount: 0 })).toBe(85)
    expect(reliabilityScore({ noShowCount: 0, visitCount: 10 })).toBe(100)
    expect(reliabilityScore({ noShowCount: 10, visitCount: 0 })).toBe(0)
  })

  it('sets confirmTokenExpiresAt to date-1h', () => {
    const d = new Date('2026-01-01T12:00:00.000Z')
    expect(confirmTokenExpiresAt(d).toISOString()).toBe('2026-01-01T11:00:00.000Z')
  })
})

