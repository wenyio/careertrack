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
import { AUTH_PROVIDER_LABELS } from '@/constants/auth'
import { formatDate } from '@/utils/format'
import PageContainer from '@/components/layout/PageContainer'
import type { AdminUserItem } from '@/types/admin'
import type { TableRowSelection } from 'antd/es/table/interface'

export default function AdminUsersPage() {
  const router = useRouter()
  const { message, modal } = App.useApp()
  const { user: currentUser } = useAuthStore()
  const [search, setSearch] = useState('')
  const [pageSize, setPageSize] = useState(20)
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
  const { data: users, isLoading } = useAdminUsers(search)
  const { mutate: updateRole } = useUpdateAdminUserRole()
  const { mutate: deleteUser } = useDeleteAdminUser()
  const { mutate: batchDelete, isPending: isBatchDeleting } = useBatchDeleteAdminUsers()
  const { mutate: batchRole, isPending: isBatchRole } = useBatchUpdateAdminUserRole()
  const { mutate: updateStatus } = useUpdateUserStatus()

  const handleRoleChange = (record: AdminUserItem) => {
    const newRole = record.role === 'admin' ? 'user' : 'admin'
    const label = newRole === 'admin' ? '管理员' : '普通用户'

    if (record.id === currentUser?.id && newRole !== 'admin') {
      message.warning('不能将自己的角色降级为普通用户')
      return
    }

    modal.confirm({
      title: '确认修改角色',
      content: `确定将用户"${record.username}"的角色修改为${label}吗？`,
      okText: '确认',
      cancelText: '取消',
      onOk: () => updateRole({ id: record.id, role: newRole }),
    })
  }

  const handleToggleDisable = (record: AdminUserItem) => {
    const isDisabled = !!record.disabled_at
    if (isDisabled) {
      modal.confirm({
        title: '确认启用用户',
        content: `确定要启用用户"${record.username}"吗？`,
        okText: '确认',
        cancelText: '取消',
        onOk: () => updateStatus({ id: record.id, disabled: false }),
      })
    } else {
      if (record.id === currentUser?.id) {
        message.warning('不能禁用自己的账号')
        return
      }
      modal.confirm({
        title: '确认禁用用户',
        content: `确定要禁用用户"${record.username}"吗？`,
        okText: '禁用',
        okType: 'danger',
        cancelText: '取消',
        onOk: () => updateStatus({ id: record.id, disabled: true }),
      })
    }
  }

  const handleDelete = (record: AdminUserItem) => {
    if (record.id === currentUser?.id) {
      message.warning('不能删除自己的账号')
      return
    }
    modal.confirm({
      title: '确认删除用户',
      content: `确定要删除用户"${record.username}"吗？该用户的所有简历和个人信息将一并删除，此操作不可恢复。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => deleteUser(record.id),
    })
  }

  const getSelectedUsers = () =>
    (users || []).filter((u) => selectedRowKeys.includes(u.id))

  const handleBatchDelete = () => {
    const selected = getSelectedUsers()
    if (selected.length === 0) return
    modal.confirm({
      title: '确认批量删除',
      content: `确定要删除选中的 ${selected.length} 个用户吗？他们的所有简历和个人信息将一并删除，此操作不可恢复。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        batchDelete(selectedRowKeys, {
          onSuccess: () => setSelectedRowKeys([]),
        })
      },
    })
  }

  const handleBatchRole = (role: 'admin' | 'user') => {
    const selected = getSelectedUsers()
    if (selected.length === 0) return
    const label = role === 'admin' ? '管理员' : '普通用户'
    modal.confirm({
      title: '确认批量修改',
      content: `确定将选中的 ${selected.length} 个用户的角色修改为${label}吗？`,
      okText: '确认',
      cancelText: '取消',
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
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      fixed: 'left' as const,
      width: 140,
      render: (username: string, record: AdminUserItem) => (
        <a onClick={() => router.push(`/admin/users/${record.id}`)}>{username}</a>
      ),
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      render: (role: string) => (
        <Tag color={role === 'admin' ? 'red' : 'default'}>
          {role === 'admin' ? '管理员' : '用户'}
        </Tag>
      ),
    },
    {
      title: '认证来源',
      dataIndex: 'auth_provider',
      key: 'auth_provider',
      width: 130,
      render: (authProvider: number) => (
        AUTH_PROVIDER_LABELS[authProvider] || `未知 (${authProvider})`
      ),
    },
    {
      title: '状态',
      key: 'status',
      width: 90,
      render: (_: unknown, record: AdminUserItem) => (
        record.disabled_at ? <Tag color="red">已禁用</Tag> : <Tag color="green">正常</Tag>
      ),
    },
    {
      title: 'OTP',
      dataIndex: 'otp_enabled',
      key: 'otp_enabled',
      width: 90,
      render: (v: boolean) => v ? <Tag color="green">已启用</Tag> : <Tag>未启用</Tag>,
    },
    {
      title: '简历数',
      dataIndex: 'resume_count',
      key: 'resume_count',
      width: 80,
    },
    {
      title: '注册时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      render: (v: string) => formatDate(v, 'YYYY-MM-DD HH:mm'),
    },
    {
      title: '管理员',
      key: 'admin',
      width: 90,
      fixed: 'right' as const,
      render: (_: unknown, record: AdminUserItem) => {
        const isSelf = record.id === currentUser?.id
        const isAdmin = record.role === 'admin'
        return (
          <Tooltip title={isSelf && isAdmin ? '不能取消自己的管理员权限' : undefined}>
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
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right' as const,
      render: (_: unknown, record: AdminUserItem) => {
        const isSelf = record.id === currentUser?.id
        const isDisabled = !!record.disabled_at
        return (
          <div style={{ display: 'flex', gap: 2 }}>
            <Tooltip title={isDisabled ? '启用用户' : '禁用用户'}>
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
    <PageContainer size="full" title="用户管理" subtitle="查看和管理所有用户">
      <Card size="small">
        <div style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <Input.Search
            placeholder="搜索用户名"
            allowClear
            onSearch={setSearch}
            style={{ maxWidth: 300 }}
          />
          {selectedRowKeys.length > 0 && (
            <>
              <span style={{ color: '#666', fontSize: 13 }}>已选 {selectedRowKeys.length} 项</span>
              <Button
                size="small"
                icon={<ArrowUpOutlined />}
                loading={isBatchRole}
                onClick={() => handleBatchRole('admin')}
              >
                批量升为管理员
              </Button>
              <Button
                size="small"
                icon={<ArrowDownOutlined />}
                loading={isBatchRole}
                onClick={() => handleBatchRole('user')}
              >
                批量降为用户
              </Button>
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                loading={isBatchDeleting}
                onClick={handleBatchDelete}
              >
                批量删除
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
          pagination={{ pageSize, showSizeChanger: true, showTotal: (total) => `共 ${total} 个用户`, onChange: (_page, size) => { if (size !== pageSize) setPageSize(size) } }}
          scroll={{ x: 700 }}
          size="middle"
        />
      </Card>
    </PageContainer>
  )
}
