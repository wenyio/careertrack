/**
 * 管理员 - 用户详情页
 *
 * 包含账号信息、个人信息、简历列表三个 tab
 */

'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  Tabs,
  Descriptions,
  Tag,
  Table,
  Button,
  Empty,
  Skeleton,
  Typography,
  App,
  Avatar,
} from 'antd'
import {
  DeleteOutlined,
  LinkOutlined,
  StopOutlined,
  CheckCircleOutlined,
  GithubOutlined,
} from '@ant-design/icons'
import {
  useAdminUser,
  useUpdateAdminUserRole,
  useDeleteAdminUser,
  useAdminUserResumes,
  useAdminUserProfile,
  useDeleteAdminResume,
  useUpdateUserStatus,
  useAdminUserOAuthAccounts,
  useDeleteAdminUserOAuthAccount,
} from '@/hooks/useAdmin'
import { AUTH_PROVIDER, AUTH_PROVIDER_LABELS } from '@/constants/auth'
import { useAuthStore } from '@/stores/useAuthStore'
import { formatDate } from '@/utils/format'
import PageContainer from '@/components/layout/PageContainer'
import ProfileViewer from '@/components/admin/ProfileViewer'
import type { AdminResumeItem } from '@/types/admin'

const { Text } = Typography

export default function AdminUserDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const { message, modal } = App.useApp()
  const { user: currentUser } = useAuthStore()

  const { data: userDetail, isLoading } = useAdminUser(id)
  const { data: resumes, isLoading: resumesLoading } = useAdminUserResumes(id)
  const { data: profile, isLoading: profileLoading } = useAdminUserProfile(id)
  const { data: oauthAccounts, isLoading: oauthLoading } = useAdminUserOAuthAccounts(id)
  const { mutate: updateRole } = useUpdateAdminUserRole()
  const { mutate: deleteUser } = useDeleteAdminUser()
  const { mutate: deleteResume } = useDeleteAdminResume()
  const { mutate: updateStatus } = useUpdateUserStatus()
  const { mutate: unbindOAuth, isPending: isUnbinding } = useDeleteAdminUserOAuthAccount()

  const [activeTab, setActiveTab] = useState('account')

  const handleRoleChange = () => {
    if (!userDetail) return
    const newRole = userDetail.role === 'admin' ? 'user' : 'admin'
    const label = newRole === 'admin' ? '管理员' : '普通用户'

    if (userDetail.id === currentUser?.id && newRole !== 'admin') {
      message.warning('不能将自己的角色降级为普通用户')
      return
    }

    modal.confirm({
      title: '确认修改角色',
      content: `确定将用户"${userDetail.username}"的角色修改为${label}吗？`,
      okText: '确认',
      cancelText: '取消',
      onOk: () => updateRole({ id: userDetail.id, role: newRole }),
    })
  }

  const handleToggleDisable = () => {
    if (!userDetail) return
    const isDisabled = !!userDetail.disabled_at
    if (isDisabled) {
      // 启用用户
      modal.confirm({
        title: '确认启用用户',
        content: `确定要启用用户"${userDetail.username}"吗？`,
        okText: '确认',
        cancelText: '取消',
        onOk: () => updateStatus({ id: userDetail.id, disabled: false }),
      })
    } else {
      // 禁用用户
      if (userDetail.id === currentUser?.id) {
        message.warning('不能禁用自己的账号')
        return
      }
      modal.confirm({
        title: '确认禁用用户',
        content: `确定要禁用用户"${userDetail.username}"吗？禁用后该用户将无法登录和使用系统。`,
        okText: '禁用',
        okType: 'danger',
        cancelText: '取消',
        onOk: () => updateStatus({ id: userDetail.id, disabled: true }),
      })
    }
  }

  const handleDeleteUser = () => {
    if (!userDetail) return
    if (userDetail.id === currentUser?.id) {
      message.warning('不能删除自己的账号')
      return
    }
    modal.confirm({
      title: '确认删除用户',
      content: `确定要删除用户"${userDetail.username}"吗？该用户的所有简历和个人信息将一并删除，此操作不可恢复。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        deleteUser(userDetail.id, {
          onSuccess: () => router.push('/admin/users'),
        })
      },
    })
  }

  const handleDeleteResume = (resumeId: string, resumeName: string) => {
    modal.confirm({
      title: '确认删除',
      content: `确定要删除简历"${resumeName}"吗？此操作不可恢复。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => deleteResume(resumeId),
    })
  }

  const handleUnbindOAuth = (oauthAccountId: string, provider: string, providerUsername: string | null) => {
    const label = providerUsername ? `${provider} (${providerUsername})` : provider
    modal.confirm({
      title: '确认解绑',
      content: `确定要解绑 ${label} 吗？解绑后该用户将不能再通过此账号登录。`,
      okText: '解绑',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => unbindOAuth({ userId: id, oauthAccountId }),
    })
  }

  const oauthColumns = [
    {
      title: '平台',
      dataIndex: 'provider',
      key: 'provider',
      width: 100,
      render: (provider: string) => (
        <Tag icon={provider === 'github' ? <GithubOutlined /> : undefined} color={provider === 'github' ? 'default' : 'blue'}>
          {provider === 'github' ? 'GitHub' : provider}
        </Tag>
      ),
    },
    {
      title: '用户名',
      dataIndex: 'provider_username',
      key: 'provider_username',
      render: (v: string | null) => v || '-',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      render: (v: string | null) => v || '-',
    },
    {
      title: '头像',
      dataIndex: 'avatar_url',
      key: 'avatar_url',
      width: 60,
      render: (url: string | null) => url ? <Avatar src={url} size="small" /> : '-',
    },
    {
      title: '绑定时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (v: string) => formatDate(v, 'YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: unknown, record: { id: string; provider: string; provider_username: string | null }) => (
        <Button
          type="text"
          size="small"
          danger
          loading={isUnbinding}
          onClick={() => handleUnbindOAuth(record.id, record.provider, record.provider_username)}
        >
          解绑
        </Button>
      ),
    },
  ]

  const resumeColumns = [
    {
      title: '简历名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: AdminResumeItem) => (
        <a onClick={() => router.push(`/admin/resumes/${record.id}`)}>{name}</a>
      ),
    },
    {
      title: '公开状态',
      dataIndex: 'is_public',
      key: 'is_public',
      width: 100,
      render: (isPublic: boolean) => (
        <Tag color={isPublic ? 'blue' : 'default'}>
          {isPublic ? '已公开' : '未公开'}
        </Tag>
      ),
    },
    {
      title: 'public_slug',
      dataIndex: 'public_slug',
      key: 'public_slug',
      width: 150,
      render: (slug: string | null) => slug || '-',
    },
    {
      title: '模板',
      dataIndex: 'template',
      key: 'template',
      width: 100,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (v: string) => formatDate(v, 'YYYY-MM-DD HH:mm'),
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 160,
      render: (v: string) => formatDate(v, 'YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_: unknown, record: AdminResumeItem) => (
        <div style={{ display: 'flex', gap: 4 }}>
          {record.is_public && record.public_slug && (
            <Button
              type="text"
              size="small"
              icon={<LinkOutlined />}
              href={`/resume/${record.public_slug}`}
              target="_blank"
            />
          )}
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteResume(record.id, record.name)}
          />
        </div>
      ),
    },
  ]

  if (isLoading) {
    return (
      <PageContainer size="lg" title="用户详情">
        <Skeleton active paragraph={{ rows: 6 }} />
      </PageContainer>
    )
  }

  if (!userDetail) {
    return (
      <PageContainer size="lg" title="用户详情">
        <Empty description="用户不存在" />
      </PageContainer>
    )
  }

  return (
    <PageContainer
      size="lg"
      title={userDetail.username}
      subtitle="用户详情"
      extra={
        <div style={{ display: 'flex', gap: 8 }}>
          <Button onClick={() => router.push('/admin/users')}>返回用户列表</Button>
          {userDetail.disabled_at ? (
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={handleToggleDisable}
            >
              启用用户
            </Button>
          ) : (
            <Button
              danger
              icon={<StopOutlined />}
              disabled={userDetail.id === currentUser?.id}
              onClick={handleToggleDisable}
            >
              禁用用户
            </Button>
          )}
          <Button
            danger
            icon={<DeleteOutlined />}
            disabled={userDetail.id === currentUser?.id}
            onClick={handleDeleteUser}
          >
            删除用户
          </Button>
        </div>
      }
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'account',
            label: '账号信息',
            children: (
              <Descriptions bordered column={{ xs: 1, sm: 2 }} size="small">
                <Descriptions.Item label="用户名">{userDetail.username}</Descriptions.Item>
                <Descriptions.Item label="角色">
                  <Tag color={userDetail.role === 'admin' ? 'red' : 'default'}>
                    {userDetail.role === 'admin' ? '管理员' : '用户'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="认证来源">
                  {AUTH_PROVIDER_LABELS[userDetail.auth_provider] || `未知 (${userDetail.auth_provider})`}
                </Descriptions.Item>
                <Descriptions.Item label="账号状态">
                  {userDetail.disabled_at ? (
                    <Tag color="red">已禁用</Tag>
                  ) : (
                    <Tag color="green">正常</Tag>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="OTP 二次验证">
                  {userDetail.otp_enabled ? (
                    <Tag color="green">已启用</Tag>
                  ) : (
                    <Tag>未启用</Tag>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="简历数量">
                  {resumes?.length ?? '-'}
                </Descriptions.Item>
                <Descriptions.Item label="注册时间">
                  {formatDate(userDetail.created_at, 'YYYY-MM-DD HH:mm')}
                </Descriptions.Item>
                <Descriptions.Item label="更新时间">
                  {formatDate(userDetail.updated_at, 'YYYY-MM-DD HH:mm')}
                </Descriptions.Item>
                <Descriptions.Item label="角色调整" span={{ xs: 1, sm: 2 }}>
                  <Button
                    type={userDetail.role === 'admin' ? 'default' : 'primary'}
                    disabled={userDetail.id === currentUser?.id && userDetail.role === 'admin'}
                    onClick={handleRoleChange}
                  >
                    {userDetail.role === 'admin' ? '降为普通用户' : '设为管理员'}
                  </Button>
                  {userDetail.id === currentUser?.id && userDetail.role === 'admin' && (
                    <Text type="secondary" style={{ marginLeft: 12, fontSize: 12 }}>
                      不能降级自己
                    </Text>
                  )}
                </Descriptions.Item>
              </Descriptions>
            ),
          },
          {
            key: 'profile',
            label: '个人信息',
            children: profileLoading ? (
              <Skeleton active paragraph={{ rows: 6 }} />
            ) : profile ? (
              <ProfileViewer profile={profile} />
            ) : (
              <Empty description="该用户暂未填写个人信息" />
            ),
          },
          {
            key: 'oauth',
            label: `OAuth 绑定 (${oauthAccounts?.length ?? 0})`,
            children: oauthLoading ? (
              <Skeleton active paragraph={{ rows: 4 }} />
            ) : oauthAccounts && oauthAccounts.length > 0 ? (
              <Table
                dataSource={oauthAccounts}
                columns={oauthColumns}
                rowKey="id"
                pagination={false}
                size="small"
                scroll={{ x: 600 }}
              />
            ) : (
              <Empty description="该用户暂无 OAuth 绑定" />
            ),
          },
          {
            key: 'resumes',
            label: `简历列表 (${resumes?.length ?? 0})`,
            children: (
              <Table
                dataSource={resumes || []}
                columns={resumeColumns}
                rowKey="id"
                loading={resumesLoading}
                pagination={false}
                size="small"
                scroll={{ x: 800 }}
              />
            ),
          },
        ]}
      />
    </PageContainer>
  )
}
