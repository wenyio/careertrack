/**
 * 游客数据迁移页面
 *
 * 登录/注册成功后，如果浏览器本地有游客简历数据，
 * 跳转到此页面提示用户选择导入或跳过。
 *
 * 流程：
 * 1. 显示待迁移的游客简历列表
 * 2. 用户选择"导入"或"跳过"
 * 3. 完成后跳转到 /resumes
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Typography, Spin, Result, App, Checkbox } from 'antd'
import {
  ImportOutlined,
  RightOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons'
import { getGuestResumes } from '@/services/guest-resume'
import {
  migrateGuestResumes,
  clearAllGuestData,
  hasGuestData,
  type MigrationResult,
} from '@/services/guest-migration'
import { formatDate } from '@/utils/format'
import AuthShell from '@/components/layout/AuthShell'
import { useI18n } from '@/i18n'

const { Text } = Typography

type MigrationPhase = 'confirm' | 'migrating' | 'done'

export default function MigratePage() {
  const router = useRouter()
  const { message } = App.useApp()
  const { t } = useI18n()
  const [phase, setPhase] = useState<MigrationPhase>('confirm')
  const [result, setResult] = useState<MigrationResult | null>(null)
  const [guestResumes] = useState<ReturnType<typeof getGuestResumes>>(
    () => getGuestResumes(),
  )
  const [clearOnSkip, setClearOnSkip] = useState(false)

  // 如果没有游客数据，直接跳转到 /resumes
  useEffect(() => {
    if (!hasGuestData()) {
      router.replace('/resumes')
    }
  }, [router])

  const handleMigrate = async () => {
    setPhase('migrating')
    try {
      const migrationResult = await migrateGuestResumes()
      setResult(migrationResult)
      setPhase('done')
    } catch {
      message.error(t('auth.migrateException'))
      setPhase('confirm')
    }
  }

  const handleSkip = () => {
    if (clearOnSkip) {
      clearAllGuestData()
      message.info(t('auth.skippedCleared'))
    } else {
      message.info(t('auth.skippedKept'))
    }
    router.replace('/resumes')
  }

  const handleDone = () => {
    router.replace('/resumes')
  }

  // 确认阶段：显示待迁移列表
  if (phase === 'confirm') {
    return (
      <AuthShell
        title={t('auth.migrateTitle')}
        subtitle={t('auth.migrateSubtitle')}
      >
        <div style={{ marginBottom: 20 }}>
          <Text>
            {t('auth.migrateDetected', { count: guestResumes.length })}
          </Text>
        </div>

        <div
          style={{
            border: '1px solid #f0f0f0',
            borderRadius: 8,
            marginBottom: 24,
            overflow: 'hidden',
          }}
        >
          {guestResumes.map((item, index) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                borderBottom: index < guestResumes.length - 1 ? '1px solid #f0f0f0' : 'none',
              }}
            >
              <Text>{item.name}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t('resume.updatedAt', { time: formatDate(item.updated_at, 'MM-DD HH:mm') })}
              </Text>
            </div>
          ))}
        </div>

        <Button
          type="primary"
          icon={<ImportOutlined />}
          block
          size="large"
          onClick={handleMigrate}
        >
          {t('auth.migrateAll')}
        </Button>

        <div style={{ height: 12 }} />

        <Button
          block
          size="large"
          icon={<RightOutlined />}
          onClick={handleSkip}
        >
          {t('auth.skipMigrate')}
        </Button>

        <div style={{ marginTop: 16 }}>
          <Checkbox
            checked={clearOnSkip}
            onChange={(e) => setClearOnSkip(e.target.checked)}
          >
            <Text type="secondary" style={{ fontSize: 13 }}>
              {t('auth.clearGuestData')}
            </Text>
          </Checkbox>
        </div>

        <div style={{ marginTop: 12, textAlign: 'center' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {t('auth.skipHint')}
          </Text>
        </div>
      </AuthShell>
    )
  }

  // 迁移中
  if (phase === 'migrating') {
    return (
      <AuthShell
        title={t('auth.migratingTitle')}
        subtitle={t('auth.migratingSubtitle')}
      >
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 24 }}>
            <Text>{t('auth.migratingCount', { count: guestResumes.length })}</Text>
          </div>
        </div>
      </AuthShell>
    )
  }

  // 完成阶段
  return (
    <AuthShell
      title={t('auth.migrateDoneTitle')}
      subtitle={t('auth.migrateDoneSubtitle')}
    >
      {result && (
        <Result
          status={result.failed === 0 ? 'success' : 'warning'}
          icon={result.failed === 0 ? <CheckCircleOutlined /> : undefined}
          title={
            result.failed === 0
              ? t('auth.migrateSuccessTitle', { success: result.success })
              : t('auth.migratePartialTitle', { success: result.success, failed: result.failed })
          }
          subTitle={
            result.errors.length > 0 ? (
              <div style={{ textAlign: 'left' }}>
                {result.errors.map((err, i) => (
                  <div key={i} style={{ fontSize: 13, color: '#ff4d4f', marginBottom: 4 }}>
                    <CloseCircleOutlined style={{ marginRight: 4 }} />
                    {err.name}: {err.error}
                  </div>
                ))}
              </div>
            ) : undefined
          }
          style={{ padding: '24px 0' }}
        />
      )}

      <Button
        type="primary"
        block
        size="large"
        onClick={handleDone}
      >
        {t('auth.viewMyResumes')}
      </Button>
    </AuthShell>
  )
}
