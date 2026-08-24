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
import { AUTH_PROVIDER } from '@/constants/auth'
import { useAuthStore } from '@/stores/useAuthStore'
import { formatDate } from '@/utils/format'
import PageContainer from '@/components/layout/PageContainer'
import ProfileViewer from '@/components/admin/ProfileViewer'
import type { AdminResumeItem } from '@/types/admin'
import { useI18n } from '@/i18n'

const { Text } = Typography

const ACCOUNT_DESCRIPTION_COLUMNS = {
  xs: 1,
  sm: 2,
  md: 2,
  lg: 2,
  xl: 2,
  xxl: 2,
  xxxl: 2,
} as const

export default function AdminUserDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { t } = useI18n()
  const id = params.id as string
  const { message, modal } = App.useApp()
  const { user: currentUser } = useAuthStore()
  const [resumePageNumber, setResumePageNumber] = useState(1)
  const [resumePageSize, setResumePageSize] = useState(20)

  const { data: userDetail, isLoading } = useAdminUser(id)
  const { data: resumePage, isLoading: resumesLoading } = useAdminUserResumes(
    id,
    resumePageNumber,
    resumePageSize,
  )
  const { data: profile, isLoading: profileLoading } = useAdminUserProfile(id)
  const { data: oauthAccounts, isLoading: oauthLoading } = useAdminUserOAuthAccounts(id)
  const { mutate: updateRole } = useUpdateAdminUserRole()
  const { mutate: deleteUser } = useDeleteAdminUser()
  const { mutate: deleteResume } = useDeleteAdminResume()
  const { mutate: updateStatus } = useUpdateUserStatus()
  const { mutate: unbindOAuth, isPending: isUnbinding } = useDeleteAdminUserOAuthAccount()

  const [activeTab, setActiveTab] = useState('account')
  const resumes = resumePage?.items
  const authProviderLabel = (authProvider: number) => {
    if (authProvider === AUTH_PROVIDER.PASSWORD) return t('admin.passwordProvider')
    if (authProvider === AUTH_PROVIDER.GITHUB) return 'GitHub'
    if (authProvider === (AUTH_PROVIDER.PASSWORD | AUTH_PROVIDER.GITHUB)) {
      return t('admin.passwordGithubProvider')
    }
    return t('admin.unknownProvider', { provider: authProvider })
  }

  const handleRoleChange = () => {
    if (!userDetail) return
    const newRole = userDetail.role === 'admin' ? 'user' : 'admin'
    const label = newRole === 'admin' ? t('admin.adminRole') : t('admin.normalUserRole')

    if (userDetail.id === currentUser?.id && newRole !== 'admin') {
      message.warning(t('admin.cannotDemoteSelfLong'))
      return
    }

    modal.confirm({
      title: t('admin.confirmRoleTitle'),
      content: t('admin.confirmRoleContent', { username: userDetail.username, role: label }),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      onOk: () => updateRole({ id: userDetail.id, role: newRole }),
    })
  }

  const handleToggleDisable = () => {
    if (!userDetail) return
    const isDisabled = !!userDetail.disabled_at
    if (isDisabled) {
      // 启用用户
      modal.confirm({
        title: t('admin.confirmEnableUserTitle'),
        content: t('admin.confirmEnableUserContent', { username: userDetail.username }),
        okText: t('common.confirm'),
        cancelText: t('common.cancel'),
        onOk: () => updateStatus({ id: userDetail.id, disabled: false }),
      })
    } else {
      // 禁用用户
      if (userDetail.id === currentUser?.id) {
        message.warning(t('admin.cannotDisableSelf'))
        return
      }
      modal.confirm({
        title: t('admin.confirmDisableUserTitle'),
        content: t('admin.confirmDisableUserDetailContent', { username: userDetail.username }),
        okText: t('admin.disableUser'),
        okType: 'danger',
        cancelText: t('common.cancel'),
        onOk: () => updateStatus({ id: userDetail.id, disabled: true }),
      })
    }
  }

  const handleDeleteUser = () => {
    if (!userDetail) return
    if (userDetail.id === currentUser?.id) {
      message.warning(t('admin.cannotDeleteSelf'))
      return
    }
    modal.confirm({
      title: t('admin.confirmDeleteUserTitle'),
      content: t('admin.confirmDeleteUserContent', { username: userDetail.username }),
      okText: t('common.delete'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: () => {
        deleteUser(userDetail.id, {
          onSuccess: () => router.push('/admin/users'),
        })
      },
    })
  }

  const handleDeleteResume = (resumeId: string, resumeName: string) => {
    modal.confirm({
      title: t('admin.confirmDeleteResumeTitle'),
      content: t('admin.confirmDeleteResumeContent', { name: resumeName }),
      okText: t('common.delete'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: () => deleteResume(resumeId, {
        onSuccess: () => {
          if (resumePageNumber > 1 && resumes?.length === 1) {
            setResumePageNumber(resumePageNumber - 1)
          }
        },
      }),
    })
  }

  const handleUnbindOAuth = (oauthAccountId: string, provider: string, providerUsername: string | null) => {
    const label = providerUsername ? `${provider} (${providerUsername})` : provider
    modal.confirm({
      title: t('admin.confirmUnbindTitle'),
      content: t('admin.confirmUnbindContent', { label }),
      okText: t('admin.unbind'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: () => unbindOAuth({ userId: id, oauthAccountId }),
    })
  }

  const oauthColumns = [
    {
      title: 'OAuth',
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
      title: t('admin.username'),
      dataIndex: 'provider_username',
      key: 'provider_username',
      render: (v: string | null) => v || '-',
    },
    {
      title: t('admin.email'),
      dataIndex: 'email',
      key: 'email',
      render: (v: string | null) => v || '-',
    },
    {
      title: t('admin.avatar'),
      dataIndex: 'avatar_url',
      key: 'avatar_url',
      width: 60,
      render: (url: string | null) => url ? <Avatar src={url} size="small" /> : '-',
    },
    {
      title: t('admin.boundAt'),
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (v: string) => formatDate(v, 'YYYY-MM-DD HH:mm'),
    },
    {
      title: t('admin.action'),
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
          {t('admin.unbind')}
        </Button>
      ),
    },
  ]

  const resumeColumns = [
    {
      title: t('admin.resumeName'),
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: AdminResumeItem) => (
        <a onClick={() => router.push(`/admin/resumes/${record.id}`)}>{name}</a>
      ),
    },
    {
      title: t('admin.publicStatus'),
      dataIndex: 'is_public',
      key: 'is_public',
      width: 100,
      render: (isPublic: boolean) => (
        <Tag color={isPublic ? 'blue' : 'default'}>
          {isPublic ? t('admin.published') : t('admin.unpublished')}
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
      title: t('admin.template'),
      dataIndex: 'template',
      key: 'template',
      width: 100,
    },
    {
      title: t('admin.createdAt'),
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (v: string) => formatDate(v, 'YYYY-MM-DD HH:mm'),
    },
    {
      title: t('admin.updatedAt'),
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 160,
      render: (v: string) => formatDate(v, 'YYYY-MM-DD HH:mm'),
    },
    {
      title: t('admin.action'),
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
      <PageContainer size="lg" title={t('admin.userDetail')}>
        <Skeleton active paragraph={{ rows: 6 }} />
      </PageContainer>
    )
  }

  if (!userDetail) {
    return (
      <PageContainer size="lg" title={t('admin.userDetail')}>
        <Empty description={t('admin.userNotFound')} />
      </PageContainer>
    )
  }

  return (
    <PageContainer
      size="lg"
      title={userDetail.username}
      subtitle={t('admin.userDetail')}
      extra={
        <div style={{ display: 'flex', gap: 8 }}>
          <Button onClick={() => router.push('/admin/users')}>{t('admin.backToUsers')}</Button>
          {userDetail.disabled_at ? (
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={handleToggleDisable}
            >
              {t('admin.enableUser')}
            </Button>
          ) : (
            <Button
              danger
              icon={<StopOutlined />}
              disabled={userDetail.id === currentUser?.id}
              onClick={handleToggleDisable}
            >
              {t('admin.disableUser')}
            </Button>
          )}
          <Button
            danger
            icon={<DeleteOutlined />}
            disabled={userDetail.id === currentUser?.id}
            onClick={handleDeleteUser}
          >
            {t('admin.deleteUser')}
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
            label: t('admin.accountInfo'),
            children: (
              <Descriptions bordered column={ACCOUNT_DESCRIPTION_COLUMNS} size="small">
                <Descriptions.Item label={t('admin.username')}>{userDetail.username}</Descriptions.Item>
                <Descriptions.Item label={t('admin.role')}>
                  <Tag color={userDetail.role === 'admin' ? 'red' : 'default'}>
                    {userDetail.role === 'admin' ? t('admin.adminRole') : t('admin.userRole')}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label={t('admin.authProvider')}>
                  {authProviderLabel(userDetail.auth_provider)}
                </Descriptions.Item>
                <Descriptions.Item label={t('admin.accountStatus')}>
                  {userDetail.disabled_at ? (
                    <Tag color="red">{t('admin.disabled')}</Tag>
                  ) : (
                    <Tag color="green">{t('admin.normal')}</Tag>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label={t('security.otpTab')}>
                  {userDetail.otp_enabled ? (
                    <Tag color="green">{t('admin.enabled')}</Tag>
                  ) : (
                    <Tag>{t('admin.notEnabled')}</Tag>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label={t('admin.resumeTotalCount')}>
                  {resumePage?.pagination.total ?? '-'}
                </Descriptions.Item>
                <Descriptions.Item label={t('admin.registeredAt')}>
                  {formatDate(userDetail.created_at, 'YYYY-MM-DD HH:mm')}
                </Descriptions.Item>
                <Descriptions.Item label={t('admin.updatedAt')}>
                  {formatDate(userDetail.updated_at, 'YYYY-MM-DD HH:mm')}
                </Descriptions.Item>
                <Descriptions.Item label={t('admin.roleAdjustment')} span={ACCOUNT_DESCRIPTION_COLUMNS}>
                  <Button
                    type={userDetail.role === 'admin' ? 'default' : 'primary'}
                    disabled={userDetail.id === currentUser?.id && userDetail.role === 'admin'}
                    onClick={handleRoleChange}
                  >
                    {userDetail.role === 'admin' ? t('admin.demoteToUser') : t('admin.promoteToAdmin')}
                  </Button>
                  {userDetail.id === currentUser?.id && userDetail.role === 'admin' && (
                    <Text type="secondary" style={{ marginLeft: 12, fontSize: 12 }}>
                      {t('admin.cannotDemoteSelf')}
                    </Text>
                  )}
                </Descriptions.Item>
              </Descriptions>
            ),
          },
          {
            key: 'profile',
            label: t('admin.profile'),
            children: profileLoading ? (
              <Skeleton active paragraph={{ rows: 6 }} />
            ) : profile ? (
              <ProfileViewer profile={profile} />
            ) : (
              <Empty description={t('admin.noProfile')} />
            ),
          },
          {
            key: 'oauth',
            label: t('admin.oauthBindings', { count: oauthAccounts?.length ?? 0 }),
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
              <Empty description={t('admin.noOauth')} />
            ),
          },
          {
            key: 'resumes',
            label: t('admin.resumeList', { count: resumePage?.pagination.total ?? 0 }),
            children: (
              <Table
                dataSource={resumes || []}
                columns={resumeColumns}
                rowKey="id"
                loading={resumesLoading}
                pagination={{
                  current: resumePageNumber,
                  pageSize: resumePageSize,
                  total: resumePage?.pagination.total || 0,
                  showSizeChanger: true,
                  showTotal: (total) => t('admin.totalResumesText', { total }),
                  onChange: (nextPage, nextPageSize) => {
                    setResumePageNumber(
                      nextPageSize === resumePageSize ? nextPage : 1,
                    )
                    setResumePageSize(nextPageSize)
                  },
                }}
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
