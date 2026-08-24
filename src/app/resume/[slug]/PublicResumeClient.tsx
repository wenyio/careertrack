/**
 * Public resume client boundary.
 *
 * Loads the public DTO only when SSR data is unavailable, normalizes the two
 * database JSON representations, and delegates A4 presentation behavior to
 * PublicPaginatedResume.
 */

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Typography, Spin, Button, Result } from 'antd'
import { getPublicResume } from '@/services/resume'
import PublicPaginatedResume from '@/components/resume/public/PublicPaginatedResume'
import BrandMark from '@/components/layout/BrandMark'
import type {
  ModulesConfig,
  ResumeContent,
  ResumeModuleType,
  ResumeTemplateId,
} from '@/types/resume'
import {
  DEFAULT_MODULES_CONFIG,
  DEFAULT_MODULES_ORDER,
} from '@/types/resume'
import { parseJsonValue } from '@/utils/safe-json'
import { useI18n } from '@/i18n'

const { Text } = Typography

/** API data can contain SQLite JSON strings or PostgreSQL decoded values. */
interface RawResumeData {
  name?: string
  content?: unknown
  modules_config?: unknown
  modules_order?: unknown
  template?: string
  public_slug?: string
  is_public?: boolean
}

interface PublicResumeClientProps {
  slug: string
  /** Server-provided data prevents a duplicate client request on public pages. */
  initialData?: RawResumeData | null
}

export default function PublicResumeClient({
  slug,
  initialData,
}: PublicResumeClientProps) {
  const [resume, setResume] = useState<RawResumeData | null>(
    initialData ?? null,
  )
  const [loading, setLoading] = useState(!initialData)
  const [error, setError] = useState<string | null>(null)
  const { t } = useI18n()

  useEffect(() => {
    if (initialData) return

    let cancelled = false
    const fetchResume = async () => {
      try {
        const data = await getPublicResume(slug)
        if (!cancelled) setResume(data as unknown as RawResumeData)
      } catch (fetchError: unknown) {
        if (!cancelled) {
          const axiosError = fetchError as { response?: { status?: number } }
          setError(
            axiosError.response?.status === 404
              ? t('resume.publicNotFound')
              : t('resume.operationFailed'),
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchResume()
    return () => {
      cancelled = true
    }
  }, [slug, initialData, t])

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f7f8fa',
        }}
      >
        <Spin size="large" />
      </div>
    )
  }

  if (error || !resume) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f7f8fa',
        }}
      >
        <Result
          status="404"
          title={t('resume.publicNotFound')}
          subTitle={error || t('resume.publicNotFoundSubtitle')}
          extra={
            <Link href="/">
              <Button type="primary">{t('resume.createMine')}</Button>
            </Link>
          }
        />
      </div>
    )
  }

  const content = parseJsonValue<ResumeContent>(resume.content, {})
  const modulesConfig: ModulesConfig = {
    ...DEFAULT_MODULES_CONFIG,
    ...parseJsonValue<Partial<ModulesConfig>>(resume.modules_config, {}),
    basic_info: true,
  }
  const rawModulesOrder = parseJsonValue<ResumeModuleType[]>(
    resume.modules_order,
    [],
  )
  const modulesOrder =
    Array.isArray(rawModulesOrder) && rawModulesOrder.length > 0
      ? rawModulesOrder
      : DEFAULT_MODULES_ORDER
  const template =
    (resume.template as ResumeTemplateId | undefined) || 'classic'

  return (
    <div
      className="public-resume-shell"
      style={{
        minHeight: '100vh',
        background: '#f7f8fa',
        padding: '40px 16px',
      }}
    >
      <PublicPaginatedResume
        content={content}
        basicInfo={content.basic_info}
        modulesConfig={modulesConfig}
        modulesOrder={modulesOrder}
        template={template}
      />

      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <Text
          type="secondary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            fontSize: 13,
          }}
        >
          {t('resume.poweredByPrefix')}
          <BrandMark size={16} radius={4} />
          <Link
            href="/"
            style={{ color: 'inherit', textDecoration: 'none', margin: '0 4px' }}
          >
            {t('common.appName')}
          </Link>
          {t('resume.poweredBySuffix')}
        </Text>
      </div>

      <style jsx global>{`
        @media (max-width: 768px) {
          .public-resume-shell {
            padding: 16px !important;
          }
        }
      `}</style>
    </div>
  )
}
