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

const { Text } = Typography

type MigrationPhase = 'confirm' | 'migrating' | 'done'

export default function MigratePage() {
  const router = useRouter()
  const { message } = App.useApp()
  const [phase, setPhase] = useState<MigrationPhase>('confirm')
  const [result, setResult] = useState<MigrationResult | null>(null)
  const [guestResumes, setGuestResumes] = useState<ReturnType<typeof getGuestResumes>>([])
  const [clearOnSkip, setClearOnSkip] = useState(false)

  // 如果没有游客数据，直接跳转到 /resumes
  useEffect(() => {
    if (!hasGuestData()) {
      router.replace('/resumes')
    } else {
      setGuestResumes(getGuestResumes())
    }
  }, [router])

  const handleMigrate = async () => {
    setPhase('migrating')
    try {
      const migrationResult = await migrateGuestResumes()
      setResult(migrationResult)
      setPhase('done')
    } catch {
      message.error('迁移过程发生异常')
      setPhase('confirm')
    }
  }

  const handleSkip = () => {
    if (clearOnSkip) {
      clearAllGuestData()
      message.info('已跳过，游客数据已清除')
    } else {
      message.info('已跳过，游客数据保留在浏览器本地')
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
        title="导入游客数据"
        subtitle="将浏览器本地的游客简历导入到您的账号"
      >
        <div style={{ marginBottom: 20 }}>
          <Text>
            检测到您有 <Text strong>{guestResumes.length}</Text> 份游客简历保存在浏览器本地，
            是否导入到您的账号？
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
                更新于 {formatDate(item.updated_at, 'MM-DD HH:mm')}
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
          导入全部简历
        </Button>

        <div style={{ height: 12 }} />

        <Button
          block
          size="large"
          icon={<RightOutlined />}
          onClick={handleSkip}
        >
          跳过，不导入
        </Button>

        <div style={{ marginTop: 16 }}>
          <Checkbox
            checked={clearOnSkip}
            onChange={(e) => setClearOnSkip(e.target.checked)}
          >
            <Text type="secondary" style={{ fontSize: 13 }}>
              同时清除浏览器本地的游客数据
            </Text>
          </Checkbox>
        </div>

        <div style={{ marginTop: 12, textAlign: 'center' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            跳过后游客数据将保留，下次登录仍可导入。
          </Text>
        </div>
      </AuthShell>
    )
  }

  // 迁移中
  if (phase === 'migrating') {
    return (
      <AuthShell
        title="正在导入"
        subtitle="请稍候，正在将游客简历导入到您的账号..."
      >
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 24 }}>
            <Text>正在导入 {guestResumes.length} 份简历...</Text>
          </div>
        </div>
      </AuthShell>
    )
  }

  // 完成阶段
  return (
    <AuthShell
      title="导入完成"
      subtitle="游客简历导入结果"
    >
      {result && (
        <Result
          status={result.failed === 0 ? 'success' : 'warning'}
          icon={result.failed === 0 ? <CheckCircleOutlined /> : undefined}
          title={
            result.failed === 0
              ? `成功导入 ${result.success} 份简历`
              : `导入完成：成功 ${result.success}，失败 ${result.failed}`
          }
          subTitle={
            result.errors.length > 0 ? (
              <div style={{ textAlign: 'left' }}>
                {result.errors.map((err, i) => (
                  <div key={i} style={{ fontSize: 13, color: '#ff4d4f', marginBottom: 4 }}>
                    <CloseCircleOutlined style={{ marginRight: 4 }} />
                    {err.name}：{err.error}
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
        查看我的简历
      </Button>
    </AuthShell>
  )
}
