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

export default function AdminOverviewPage() {
  const router = useRouter()
  const { data: stats, isLoading } = useAdminStats()

  const userColumns = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      render: (username: string, record: AdminRecentUser) => (
        <a onClick={() => router.push(`/admin/users/${record.id}`)}>{username}</a>
      ),
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 80,
      render: (role: string) => (
        <Tag color={role === 'admin' ? 'red' : 'default'}>
          {role === 'admin' ? '管理员' : '用户'}
        </Tag>
      ),
    },
    {
      title: '注册时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (v: string) => formatDate(v, 'YYYY-MM-DD HH:mm'),
    },
  ]

  const resumeColumns = [
    {
      title: '简历名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: AdminRecentResume) => (
        <a onClick={() => router.push(`/admin/resumes/${record.id}`)}>{name}</a>
      ),
    },
    {
      title: '所属用户',
      dataIndex: 'username',
      key: 'username',
      width: 120,
      render: (username: string, record: AdminRecentResume) => (
        <a onClick={() => router.push(`/admin/users/${record.user_id}`)}>{username}</a>
      ),
    },
    {
      title: '状态',
      dataIndex: 'is_public',
      key: 'is_public',
      width: 80,
      render: (isPublic: boolean) => (
        <Tag color={isPublic ? 'blue' : 'default'}>
          {isPublic ? '已公开' : '未公开'}
        </Tag>
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 160,
      render: (v: string) => formatDate(v, 'YYYY-MM-DD HH:mm'),
    },
  ]

  return (
    <PageContainer size="lg" title="管理后台" subtitle="全站概览数据">
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : (
        <>
          {/* 统计卡片 */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={12} sm={12} md={6}>
              <Card>
                <Statistic
                  title="用户总数"
                  value={stats?.total_users ?? 0}
                  prefix={<UserOutlined />}
                />
              </Card>
            </Col>
            <Col xs={12} sm={12} md={6}>
              <Card>
                <Statistic
                  title="管理员数量"
                  value={stats?.admin_count ?? 0}
                  prefix={<TeamOutlined />}
                />
              </Card>
            </Col>
            <Col xs={12} sm={12} md={6}>
              <Card>
                <Statistic
                  title="简历总数"
                  value={stats?.total_resumes ?? 0}
                  prefix={<FileTextOutlined />}
                />
              </Card>
            </Col>
            <Col xs={12} sm={12} md={6}>
              <Card>
                <Statistic
                  title="已公开简历"
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
                title="最近注册用户"
                size="small"
                extra={<a onClick={() => router.push('/admin/users')}>查看全部</a>}
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
                title="最近更新简历"
                size="small"
                extra={<a onClick={() => router.push('/admin/resumes')}>查看全部</a>}
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
