import type { DescriptionField } from '@/types/resume'
import type { SelfEvaluation } from '@/types/profile'
import { richTextToPlainText } from '@/utils/rich-text'

export const DEFAULT_SELF_EVALUATION_TITLE = '默认自我评价'

export function hasDescriptionContent(value: DescriptionField | undefined): boolean {
  return Boolean(value && richTextToPlainText(value).trim())
}

export function getPrimarySelfEvaluationDescription(
  entries: Partial<SelfEvaluation>[] | undefined,
  fallback?: DescriptionField,
): DescriptionField {
  const firstWithContent = entries?.find((entry) => hasDescriptionContent(entry.description))
  if (firstWithContent?.description) return firstWithContent.description
  return fallback ?? ''
}

export function normalizeSelfEvaluations(
  entries: unknown,
  fallback?: DescriptionField,
): SelfEvaluation[] {
  if (Array.isArray(entries)) {
    return entries
      .filter((entry): entry is Record<string, unknown> =>
        !!entry && typeof entry === 'object' && !Array.isArray(entry),
      )
      .map((entry, index) => ({
        ...entry,
        id: typeof entry.id === 'string' && entry.id ? entry.id : `self-evaluation-${index + 1}`,
        title: typeof entry.title === 'string' ? entry.title : '',
        description: (entry.description ?? '') as DescriptionField,
      }))
  }

  if (hasDescriptionContent(fallback)) {
    return [{
      id: 'legacy-summary',
      title: DEFAULT_SELF_EVALUATION_TITLE,
      description: fallback as DescriptionField,
    }]
  }

  return []
}

export function serializeDescriptionForTextColumn(value: DescriptionField): string {
  return typeof value === 'string' ? value : JSON.stringify(value)
}
