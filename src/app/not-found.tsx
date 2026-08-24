/**
 * 404 页面
 *
 * 当访问不存在的页面时显示
 */

'use client'

import { Button, Result } from 'antd'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/i18n'

export default function NotFound() {
  const router = useRouter()
  const { t } = useI18n()

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'var(--background)',
        color: 'var(--foreground)',
      }}
    >
      <Result
        status="404"
        title="404"
        subTitle={t('notFound.subtitle')}
        extra={
          <Button type="primary" onClick={() => router.push('/')}>
            {t('notFound.backHome')}
          </Button>
        }
      />
    </div>
  )
}
