'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME, localeToHtmlLang, type Locale } from './locales'
import { messages, type MessageKey } from './messages'

type Params = Record<string, string | number>

interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: MessageKey, params?: Params) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

function resolveMessage(locale: Locale, key: string): string | undefined {
  const parts = key.split('.')
  let current: unknown = messages[locale]
  for (const part of parts) {
    if (!current || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return typeof current === 'string' ? current : undefined
}

function interpolate(template: string, params?: Params): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (match, name) => (
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match
  ))
}

function persistLocale(nextLocale: Locale) {
  document.cookie = `${LOCALE_COOKIE_NAME}=${nextLocale}; path=/; max-age=31536000; samesite=lax`
  window.localStorage.setItem(LOCALE_COOKIE_NAME, nextLocale)
  document.documentElement.lang = localeToHtmlLang(nextLocale)
}

export function I18nProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: {
  children: React.ReactNode
  initialLocale?: Locale
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale)

  useEffect(() => {
    persistLocale(locale)
  }, [locale])

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale)
  }, [])

  const t = useCallback((key: MessageKey, params?: Params) => {
    const template = resolveMessage(locale, key)
      ?? resolveMessage(DEFAULT_LOCALE, key)
      ?? key
    return interpolate(template, params)
  }, [locale])

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t])

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n(): I18nContextValue {
  const value = useContext(I18nContext)
  if (value) return value

  return {
    locale: DEFAULT_LOCALE,
    setLocale: () => {},
    t: (key, params) => {
      const template = resolveMessage(DEFAULT_LOCALE, key) ?? key
      return interpolate(template, params)
    },
  }
}
