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

export default function AdminResumeDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const { data: resume, isLoading } = useAdminResume(id)
  const { data: profile } = useAdminUserProfile(resume?.user_id || '')
  const { mutate: deleteResume } = useDeleteAdminResume()

  const handleDelete = () => {
    if (!resume) return
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除简历"${resume.name}"吗？此操作不可恢复。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        deleteResume(resume.id, {
          onSuccess: () => router.push('/admin/resumes'),
        })
      },
    })
  }

  if (isLoading) {
    return (
      <PageContainer size="lg" title="简历详情">
        <Skeleton active paragraph={{ rows: 6 }} />
      </PageContainer>
    )
  }

  if (!resume) {
    return (
      <PageContainer size="lg" title="简历详情">
        <Empty description="简历不存在" />
      </PageContainer>
    )
  }

  return (
    <PageContainer
      size="full"
      title={resume.name}
      subtitle="简历详情"
      extra={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button
            icon={<UserOutlined />}
            onClick={() => router.push(`/admin/users/${resume.user_id}`)}
          >
            所属用户
          </Button>
          {resume.is_public && resume.public_slug && (
            <Button
              icon={<LinkOutlined />}
              href={`/resume/${resume.public_slug}`}
              target="_blank"
            >
              查看公开链接
            </Button>
          )}
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={handleDelete}
          >
            删除简历
          </Button>
        </div>
      }
    >
      {/* 基础信息 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }} size="small">
          <Descriptions.Item label="简历名称">{resume.name}</Descriptions.Item>
          <Descriptions.Item label="所属用户">
            <a onClick={() => router.push(`/admin/users/${resume.user_id}`)}>
              {resume.username}
            </a>
          </Descriptions.Item>
          <Descriptions.Item label="公开状态">
            <Tag color={resume.is_public ? 'blue' : 'default'}>
              {resume.is_public ? '已公开' : '未公开'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="public_slug">{resume.public_slug || '-'}</Descriptions.Item>
          <Descriptions.Item label="模板">{resume.template}</Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {formatDate(resume.created_at, 'YYYY-MM-DD HH:mm')}
          </Descriptions.Item>
          <Descriptions.Item label="更新时间">
            {formatDate(resume.updated_at, 'YYYY-MM-DD HH:mm')}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 简历预览 */}
      <Card title="简历预览" size="small">
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
              width: 794,
              minHeight: 1123,
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
