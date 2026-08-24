/**
 * 管理员 - 用户管理列表
 *
 * 支持按用户名搜索、角色修改、批量操作
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Table, Tag, Input, Button, App, Switch, Tooltip, Card } from 'antd'
import { DeleteOutlined, ArrowUpOutlined, ArrowDownOutlined, StopOutlined, CheckCircleOutlined } from '@ant-design/icons'
import {
  useAdminUsers,
  useUpdateAdminUserRole,
  useDeleteAdminUser,
  useBatchDeleteAdminUsers,
  useBatchUpdateAdminUserRole,
  useUpdateUserStatus,
} from '@/hooks/useAdmin'
import { useAuthStore } from '@/stores/useAuthStore'
import { AUTH_PROVIDER } from '@/constants/auth'
import { formatDate } from '@/utils/format'
import PageContainer from '@/components/layout/PageContainer'
import type { AdminUserItem } from '@/types/admin'
import type { TableRowSelection } from 'antd/es/table/interface'
import { useI18n } from '@/i18n'

export default function AdminUsersPage() {
  const router = useRouter()
  const { message, modal } = App.useApp()
  const { t } = useI18n()
  const { user: currentUser } = useAuthStore()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
  const { data: userPage, isLoading } = useAdminUsers(search, page, pageSize)
  const { mutate: updateRole } = useUpdateAdminUserRole()
  const { mutate: deleteUser } = useDeleteAdminUser()
  const { mutate: batchDelete, isPending: isBatchDeleting } = useBatchDeleteAdminUsers()
  const { mutate: batchRole, isPending: isBatchRole } = useBatchUpdateAdminUserRole()
  const { mutate: updateStatus } = useUpdateUserStatus()
  const users = userPage?.items
  const authProviderLabel = (authProvider: number) => {
    if (authProvider === AUTH_PROVIDER.PASSWORD) return t('admin.passwordProvider')
    if (authProvider === AUTH_PROVIDER.GITHUB) return 'GitHub'
    if (authProvider === (AUTH_PROVIDER.PASSWORD | AUTH_PROVIDER.GITHUB)) {
      return t('admin.passwordGithubProvider')
    }
    return t('admin.unknownProvider', { provider: authProvider })
  }

  const handleRoleChange = (record: AdminUserItem) => {
    const newRole = record.role === 'admin' ? 'user' : 'admin'
    const label = newRole === 'admin' ? t('admin.adminRole') : t('admin.normalUserRole')

    if (record.id === currentUser?.id && newRole !== 'admin') {
      message.warning(t('admin.cannotDemoteSelfLong'))
      return
    }

    modal.confirm({
      title: t('admin.confirmRoleTitle'),
      content: t('admin.confirmRoleContent', { username: record.username, role: label }),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      onOk: () => updateRole({ id: record.id, role: newRole }),
    })
  }

  const handleToggleDisable = (record: AdminUserItem) => {
    const isDisabled = !!record.disabled_at
    if (isDisabled) {
      modal.confirm({
        title: t('admin.confirmEnableUserTitle'),
        content: t('admin.confirmEnableUserContent', { username: record.username }),
        okText: t('common.confirm'),
        cancelText: t('common.cancel'),
        onOk: () => updateStatus({ id: record.id, disabled: false }),
      })
    } else {
      if (record.id === currentUser?.id) {
        message.warning(t('admin.cannotDisableSelf'))
        return
      }
      modal.confirm({
        title: t('admin.confirmDisableUserTitle'),
        content: t('admin.confirmDisableUserContent', { username: record.username }),
        okText: t('admin.disableUser'),
        okType: 'danger',
        cancelText: t('common.cancel'),
        onOk: () => updateStatus({ id: record.id, disabled: true }),
      })
    }
  }

  const handleDelete = (record: AdminUserItem) => {
    if (record.id === currentUser?.id) {
      message.warning(t('admin.cannotDeleteSelf'))
      return
    }
    modal.confirm({
      title: t('admin.confirmDeleteUserTitle'),
      content: t('admin.confirmDeleteUserContent', { username: record.username }),
      okText: t('common.delete'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: () => deleteUser(record.id, {
        onSuccess: () => {
          if (page > 1 && users?.length === 1) setPage(page - 1)
        },
      }),
    })
  }

  const getSelectedUsers = () =>
    (users || []).filter((u) => selectedRowKeys.includes(u.id))

  const handleBatchDelete = () => {
    const selected = getSelectedUsers()
    if (selected.length === 0) return
    modal.confirm({
      title: t('admin.confirmBatchDeleteUsersTitle'),
      content: t('admin.confirmBatchDeleteUsersContent', { count: selected.length }),
      okText: t('common.delete'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: () => {
        batchDelete(selectedRowKeys, {
          onSuccess: () => {
            if (page > 1 && selected.length === users?.length) {
              setPage(page - 1)
            }
            setSelectedRowKeys([])
          },
        })
      },
    })
  }

  const handleBatchRole = (role: 'admin' | 'user') => {
    const selected = getSelectedUsers()
    if (selected.length === 0) return
    const label = role === 'admin' ? t('admin.adminRole') : t('admin.normalUserRole')
    modal.confirm({
      title: t('admin.confirmBatchRoleTitle'),
      content: t('admin.confirmBatchRoleContent', { count: selected.length, role: label }),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      onOk: () => {
        batchRole({ ids: selectedRowKeys, role }, {
          onSuccess: () => setSelectedRowKeys([]),
        })
      },
    })
  }

  const rowSelection: TableRowSelection<AdminUserItem> = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys as string[]),
    getCheckboxProps: (record) => ({
      disabled: record.id === currentUser?.id,
    }),
  }

  const columns = [
    {
      title: t('admin.username'),
      dataIndex: 'username',
      key: 'username',
      fixed: 'left' as const,
      width: 140,
      render: (username: string, record: AdminUserItem) => (
        <a onClick={() => router.push(`/admin/users/${record.id}`)}>{username}</a>
      ),
    },
    {
      title: t('admin.role'),
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (role: string) => (
        <Tag color={role === 'admin' ? 'red' : 'default'}>
          {role === 'admin' ? t('admin.adminRole') : t('admin.userRole')}
        </Tag>
      ),
    },
    {
      title: t('admin.authProvider'),
      dataIndex: 'auth_provider',
      key: 'auth_provider',
      width: 130,
      render: (authProvider: number) => (
        authProviderLabel(authProvider)
      ),
    },
    {
      title: t('admin.status'),
      key: 'status',
      width: 90,
      render: (_: unknown, record: AdminUserItem) => (
        record.disabled_at ? <Tag color="red">{t('admin.disabled')}</Tag> : <Tag color="green">{t('admin.normal')}</Tag>
      ),
    },
    {
      title: 'OTP',
      dataIndex: 'otp_enabled',
      key: 'otp_enabled',
      width: 90,
      render: (v: boolean) => v ? <Tag color="green">{t('admin.enabled')}</Tag> : <Tag>{t('admin.notEnabled')}</Tag>,
    },
    {
      title: t('admin.resumeCount'),
      dataIndex: 'resume_count',
      key: 'resume_count',
      width: 80,
    },
    {
      title: t('admin.registeredAt'),
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      render: (v: string) => formatDate(v, 'YYYY-MM-DD HH:mm'),
    },
    {
      title: t('admin.adminColumn'),
      key: 'admin',
      width: 90,
      fixed: 'right' as const,
      render: (_: unknown, record: AdminUserItem) => {
        const isSelf = record.id === currentUser?.id
        const isAdmin = record.role === 'admin'
        return (
          <Tooltip title={isSelf && isAdmin ? t('admin.cannotCancelOwnAdmin') : undefined}>
            <Switch
              checked={isAdmin}
              size="small"
              disabled={isSelf && isAdmin}
              onChange={() => handleRoleChange(record)}
            />
          </Tooltip>
        )
      },
    },
    {
      title: t('admin.action'),
      key: 'action',
      width: 100,
      fixed: 'right' as const,
      render: (_: unknown, record: AdminUserItem) => {
        const isSelf = record.id === currentUser?.id
        const isDisabled = !!record.disabled_at
        return (
          <div style={{ display: 'flex', gap: 2 }}>
            <Tooltip title={isDisabled ? t('admin.enableUser') : t('admin.disableUser')}>
              <Button
                size="small"
                type="text"
                danger={!isDisabled}
                icon={isDisabled ? <CheckCircleOutlined /> : <StopOutlined />}
                disabled={isSelf && !isDisabled}
                onClick={() => handleToggleDisable(record)}
              />
            </Tooltip>
            <Button
              size="small"
              type="text"
              danger
              icon={<DeleteOutlined />}
              disabled={isSelf}
              onClick={() => handleDelete(record)}
            />
          </div>
        )
      },
    },
  ]

  return (
    <PageContainer size="full" title={t('admin.usersTitle')} subtitle={t('admin.usersSubtitle')}>
      <Card size="small">
        <div style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <Input.Search
            placeholder={t('admin.searchUsername')}
            allowClear
            onSearch={(value) => {
              setSearch(value)
              setPage(1)
              setSelectedRowKeys([])
            }}
            style={{ maxWidth: 300 }}
          />
          {selectedRowKeys.length > 0 && (
            <>
              <span style={{ color: '#666', fontSize: 13 }}>{t('admin.selectedCount', { count: selectedRowKeys.length })}</span>
              <Button
                size="small"
                icon={<ArrowUpOutlined />}
                loading={isBatchRole}
                onClick={() => handleBatchRole('admin')}
              >
                {t('admin.batchPromote')}
              </Button>
              <Button
                size="small"
                icon={<ArrowDownOutlined />}
                loading={isBatchRole}
                onClick={() => handleBatchRole('user')}
              >
                {t('admin.batchDemote')}
              </Button>
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                loading={isBatchDeleting}
                onClick={handleBatchDelete}
              >
                {t('admin.batchDelete')}
              </Button>
            </>
          )}
        </div>
        <Table
          dataSource={users || []}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          rowSelection={rowSelection}
          pagination={{
            current: page,
            pageSize,
            total: userPage?.pagination.total || 0,
            showSizeChanger: true,
            showTotal: (total) => t('admin.totalUsersText', { total }),
            onChange: (nextPage, nextPageSize) => {
              setPage(nextPageSize === pageSize ? nextPage : 1)
              setPageSize(nextPageSize)
              setSelectedRowKeys([])
            },
          }}
          scroll={{ x: 700 }}
          size="middle"
        />
      </Card>
    </PageContainer>
  )
}
