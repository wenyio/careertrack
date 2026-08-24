export const SUPPORTED_LOCALES = ['zh-CN', 'en-US'] as const

export type Locale = typeof SUPPORTED_LOCALES[number]

export const DEFAULT_LOCALE: Locale = 'zh-CN'
export const LOCALE_COOKIE_NAME = 'careertrack_locale'

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && SUPPORTED_LOCALES.includes(value as Locale)
}

export function normalizeLocale(value: unknown): Locale {
  if (isLocale(value)) return value
  if (typeof value !== 'string') return DEFAULT_LOCALE

  const lower = value.toLowerCase()
  if (lower.startsWith('en')) return 'en-US'
  if (lower.startsWith('zh')) return 'zh-CN'
  return DEFAULT_LOCALE
}

export function localeToHtmlLang(locale: Locale): string {
  return locale
}

export function localeToAntdKey(locale: Locale): 'zh' | 'en' {
  return locale === 'en-US' ? 'en' : 'zh'
}
