/**
 * 后台概览页面
 *
 * 展示全站统计数据：用户总数、管理员数量、简历总数、已公开简历数
 * 最近注册用户、最近更新简历
 */

'use client'

import { useRouter } from 'next/navigation'
import { Card, Row, Col, Statistic, Table, Tag, Skeleton } from 'antd'
import {
  UserOutlined,
  TeamOutlined,
  FileTextOutlined,
  GlobalOutlined,
} from '@ant-design/icons'
import { useAdminStats } from '@/hooks/useAdmin'
import { formatDate } from '@/utils/format'
import PageContainer from '@/components/layout/PageContainer'
import type { AdminRecentUser, AdminRecentResume } from '@/types/admin'
import { useI18n } from '@/i18n'

export default function AdminOverviewPage() {
  const router = useRouter()
  const { t } = useI18n()
  const { data: stats, isLoading } = useAdminStats()

  const userColumns = [
    {
      title: t('admin.username'),
      dataIndex: 'username',
      key: 'username',
      render: (username: string, record: AdminRecentUser) => (
        <a onClick={() => router.push(`/admin/users/${record.id}`)}>{username}</a>
      ),
    },
    {
      title: t('admin.role'),
      dataIndex: 'role',
      key: 'role',
      width: 80,
      render: (role: string) => (
        <Tag color={role === 'admin' ? 'red' : 'default'}>
          {role === 'admin' ? t('admin.adminRole') : t('admin.userRole')}
        </Tag>
      ),
    },
    {
      title: t('admin.registeredAt'),
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (v: string) => formatDate(v, 'YYYY-MM-DD HH:mm'),
    },
  ]

  const resumeColumns = [
    {
      title: t('admin.resumeName'),
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: AdminRecentResume) => (
        <a onClick={() => router.push(`/admin/resumes/${record.id}`)}>{name}</a>
      ),
    },
    {
      title: t('admin.owner'),
      dataIndex: 'username',
      key: 'username',
      width: 120,
      render: (username: string, record: AdminRecentResume) => (
        <a onClick={() => router.push(`/admin/users/${record.user_id}`)}>{username}</a>
      ),
    },
    {
      title: t('admin.status'),
      dataIndex: 'is_public',
      key: 'is_public',
      width: 80,
      render: (isPublic: boolean) => (
        <Tag color={isPublic ? 'blue' : 'default'}>
          {isPublic ? t('admin.published') : t('admin.unpublished')}
        </Tag>
      ),
    },
    {
      title: t('admin.updatedAt'),
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 160,
      render: (v: string) => formatDate(v, 'YYYY-MM-DD HH:mm'),
    },
  ]

  return (
    <PageContainer size="lg" title={t('admin.title')} subtitle={t('admin.overviewSubtitle')}>
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : (
        <>
          {/* 统计卡片 */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={12} sm={12} md={6}>
              <Card>
                <Statistic
                  title={t('admin.totalUsers')}
                  value={stats?.total_users ?? 0}
                  prefix={<UserOutlined />}
                />
              </Card>
            </Col>
            <Col xs={12} sm={12} md={6}>
              <Card>
                <Statistic
                  title={t('admin.adminCount')}
                  value={stats?.admin_count ?? 0}
                  prefix={<TeamOutlined />}
                />
              </Card>
            </Col>
            <Col xs={12} sm={12} md={6}>
              <Card>
                <Statistic
                  title={t('admin.totalResumes')}
                  value={stats?.total_resumes ?? 0}
                  prefix={<FileTextOutlined />}
                />
              </Card>
            </Col>
            <Col xs={12} sm={12} md={6}>
              <Card>
                <Statistic
                  title={t('admin.publicResumes')}
                  value={stats?.public_resumes ?? 0}
                  prefix={<GlobalOutlined />}
                />
              </Card>
            </Col>
          </Row>

          {/* 最近注册用户 & 最近更新简历 */}
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card
                title={t('admin.recentUsers')}
                size="small"
                extra={<a onClick={() => router.push('/admin/users')}>{t('admin.viewAll')}</a>}
              >
                <Table
                  dataSource={stats?.recent_users || []}
                  columns={userColumns}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  scroll={{ x: 400 }}
                />
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card
                title={t('admin.recentResumes')}
                size="small"
                extra={<a onClick={() => router.push('/admin/resumes')}>{t('admin.viewAll')}</a>}
              >
                <Table
                  dataSource={stats?.recent_resumes || []}
                  columns={resumeColumns}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  scroll={{ x: 500 }}
                />
              </Card>
            </Col>
          </Row>
        </>
      )}
    </PageContainer>
  )
}
