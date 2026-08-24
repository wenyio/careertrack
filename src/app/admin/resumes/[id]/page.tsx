/**
 * 管理员 - 简历详情页
 *
 * 展示简历基础信息、预览、操作按钮
 */

'use client'

import { useRouter, useParams } from 'next/navigation'
import {
  Descriptions,
  Tag,
  Button,
  Modal,
  Skeleton,
  Empty,
  Card,
} from 'antd'
import {
  DeleteOutlined,
  LinkOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useAdminResume, useDeleteAdminResume } from '@/hooks/useAdmin'
import { useAdminUserProfile } from '@/hooks/useAdmin'
import { formatDate } from '@/utils/format'
import { DEFAULT_MODULES_ORDER } from '@/types/resume'
import PageContainer from '@/components/layout/PageContainer'
import { StandardResumePreview } from '@/components/resume/ResumePreviewShared'
import { A4_PAGE_HEIGHT_PX, A4_PAGE_WIDTH_PX } from '@/constants'
import { useI18n } from '@/i18n'

export default function AdminResumeDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { t } = useI18n()
  const id = params.id as string

  const { data: resume, isLoading } = useAdminResume(id)
  const { data: profile } = useAdminUserProfile(resume?.user_id || '')
  const { mutate: deleteResume } = useDeleteAdminResume()

  const handleDelete = () => {
    if (!resume) return
    Modal.confirm({
      title: t('admin.confirmDeleteResumeTitle'),
      content: t('admin.confirmDeleteResumeContent', { name: resume.name }),
      okText: t('common.delete'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: () => {
        deleteResume(resume.id, {
          onSuccess: () => router.push('/admin/resumes'),
        })
      },
    })
  }

  if (isLoading) {
    return (
      <PageContainer size="lg" title={t('admin.resumeDetail')}>
        <Skeleton active paragraph={{ rows: 6 }} />
      </PageContainer>
    )
  }

  if (!resume) {
    return (
      <PageContainer size="lg" title={t('admin.resumeDetail')}>
        <Empty description={t('admin.resumeNotFound')} />
      </PageContainer>
    )
  }

  return (
    <PageContainer
      size="full"
      title={resume.name}
      subtitle={t('admin.resumeDetail')}
      extra={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button
            icon={<UserOutlined />}
            onClick={() => router.push(`/admin/users/${resume.user_id}`)}
          >
            {t('admin.owner')}
          </Button>
          {resume.is_public && resume.public_slug && (
            <Button
              icon={<LinkOutlined />}
              href={`/resume/${resume.public_slug}`}
              target="_blank"
            >
              {t('admin.openPublicLink')}
            </Button>
          )}
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={handleDelete}
          >
            {t('admin.deleteResume')}
          </Button>
        </div>
      }
    >
      {/* 基础信息 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }} size="small">
          <Descriptions.Item label={t('admin.resumeName')}>{resume.name}</Descriptions.Item>
          <Descriptions.Item label={t('admin.owner')}>
            <a onClick={() => router.push(`/admin/users/${resume.user_id}`)}>
              {resume.username}
            </a>
          </Descriptions.Item>
          <Descriptions.Item label={t('admin.publicStatus')}>
            <Tag color={resume.is_public ? 'blue' : 'default'}>
              {resume.is_public ? t('admin.published') : t('admin.unpublished')}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="public_slug">{resume.public_slug || '-'}</Descriptions.Item>
          <Descriptions.Item label={t('admin.template')}>{resume.template}</Descriptions.Item>
          <Descriptions.Item label={t('admin.createdAt')}>
            {formatDate(resume.created_at, 'YYYY-MM-DD HH:mm')}
          </Descriptions.Item>
          <Descriptions.Item label={t('admin.updatedAt')}>
            {formatDate(resume.updated_at, 'YYYY-MM-DD HH:mm')}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 简历预览 */}
      <Card title={t('admin.preview')} size="small">
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            background: '#f5f5f5',
            borderRadius: 8,
            padding: 24,
            overflow: 'auto',
          }}
        >
          <div
            style={{
              width: A4_PAGE_WIDTH_PX,
              minHeight: A4_PAGE_HEIGHT_PX,
              background: '#fff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              transformOrigin: 'top center',
            }}
          >
            <StandardResumePreview
              content={resume.content}
              modulesConfig={resume.modules_config}
              modulesOrder={resume.modules_order || DEFAULT_MODULES_ORDER}
              template={resume.template || 'classic'}
              profile={profile}
            />
          </div>
        </div>
      </Card>
    </PageContainer>
  )
}
