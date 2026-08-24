import type { JobIntention, JobIntentionEntry } from '@/types/profile'

export const DEFAULT_JOB_INTENTION_TITLE = '默认求职意向'

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export function normalizeJobIntention(value: unknown): JobIntention {
  const source = value && typeof value === 'object'
    ? value as Record<string, unknown>
    : {}

  return {
    current_status: normalizeText(source.current_status),
    position: normalizeText(source.position),
    expected_city: normalizeText(source.expected_city),
    expected_salary: normalizeText(source.expected_salary),
  }
}

export function hasJobIntentionContent(value: unknown): boolean {
  const intention = normalizeJobIntention(value)
  return Boolean(
    intention.current_status.trim()
    || intention.position.trim()
    || intention.expected_city.trim()
    || intention.expected_salary.trim()
  )
}

export function toJobIntentionEntry(
  value: unknown,
  index: number,
  fallbackId?: string,
): JobIntentionEntry {
  const source = value && typeof value === 'object'
    ? value as Record<string, unknown>
    : {}
  const intention = normalizeJobIntention(source)
  const id = normalizeText(source.id).trim() || fallbackId || `job-intention-${index + 1}`
  const title = normalizeText(source.title).trim()
    || intention.position.trim()
    || DEFAULT_JOB_INTENTION_TITLE

  return {
    ...source,
    id,
    title,
    ...intention,
  } as JobIntentionEntry
}

export function normalizeJobIntentions(
  entries?: unknown,
  fallback?: unknown,
): JobIntentionEntry[] {
  if (Array.isArray(entries) && entries.length > 0) {
    return entries.map((entry, index) => toJobIntentionEntry(entry, index))
  }

  if (hasJobIntentionContent(fallback)) {
    return [toJobIntentionEntry(fallback, 0, 'legacy-job-intention')]
  }

  return []
}

export function getPrimaryJobIntention(
  entries?: unknown,
  fallback?: unknown,
): JobIntention {
  const normalizedEntries = normalizeJobIntentions(entries, fallback)
  return normalizedEntries[0]
    ? normalizeJobIntention(normalizedEntries[0])
    : normalizeJobIntention(fallback)
}

export function syncPrimaryJobIntentionEntry(
  entries: unknown,
  intention: unknown,
): JobIntentionEntry[] {
  const normalizedIntention = normalizeJobIntention(intention)
  const currentEntries = normalizeJobIntentions(entries)
  const first = currentEntries[0]
  const primary = {
    ...(first || {}),
    id: first?.id || 'legacy-job-intention',
    title: first?.title || normalizedIntention.position || DEFAULT_JOB_INTENTION_TITLE,
    ...normalizedIntention,
  }

  return [primary, ...currentEntries.slice(1)]
}
