const DEFAULT_APP_TIMEZONE = 'Asia/Shanghai'

export function getAppTimeZone(): string {
  return (typeof process !== 'undefined' ? process.env.APP_TIMEZONE?.trim() : undefined) || DEFAULT_APP_TIMEZONE
}

export function toUtcIsoString(value: unknown): string {
  if (value instanceof Date) return value.toISOString()
  if (typeof value !== 'string') throw new Error('Invalid timestamp value')

  const trimmed = value.trim()
  if (!trimmed) throw new Error('Invalid timestamp value')

  const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(trimmed)
  const normalized = hasTimezone
    ? trimmed
    : `${trimmed.replace(' ', 'T')}Z`
  const date = new Date(normalized)
  if (Number.isNaN(date.getTime())) throw new Error('Invalid timestamp value')
  return date.toISOString()
}

export function nowUtcIsoString(): string {
  return new Date().toISOString()
}

export function appTodayDateOnly(now = new Date(), timeZone = getAppTimeZone()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value
  if (!year || !month || !day) throw new Error(`Invalid APP_TIMEZONE: ${timeZone}`)
  return `${year}-${month}-${day}`
}

export function addDateOnlyDays(dateOnly: string, days: number): string {
  const [year, month, day] = dateOnly.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + days))
  return date.toISOString().slice(0, 10)
}

export function appDateOnlyAfterDays(days: number, now = new Date(), timeZone = getAppTimeZone()): string {
  return addDateOnlyDays(appTodayDateOnly(now, timeZone), days)
}
