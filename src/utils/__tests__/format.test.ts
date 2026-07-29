import { describe, expect, it } from 'vitest'
import { formatDateRange } from '@/utils/format'

describe('formatDateRange', () => {
  it('does not render a date when both dates are unfilled', () => {
    expect(formatDateRange(null, null)).toBe('')
    expect(formatDateRange(undefined, undefined)).toBe('')
  })

  it('renders only the start date when the end date is unfilled', () => {
    expect(formatDateRange('2020-07', null)).toBe('2020-07')
  })

  it('renders present only when it is explicitly selected', () => {
    expect(formatDateRange('2020-07', '')).toBe('2020-07 ~ 至今')
  })

  it('renders a complete date range', () => {
    expect(formatDateRange('2020-07', '2023-12')).toBe('2020-07 ~ 2023-12')
  })
})
