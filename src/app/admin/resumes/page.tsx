/**
 * 管理员 - 简历管理列表
 *
 * 支持按名称/用户名/slug 搜索、公开状态筛选、批量操作
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Table, Tag, Input, Select, Button, Modal, Card } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'
import { useAdminResumes, useDeleteAdminResume, useBatchDeleteAdminResumes } from '@/hooks/useAdmin'
import { formatDate } from '@/utils/format'
import PageContainer from '@/components/layout/PageContainer'
import type { AdminResumeItem } from '@/types/admin'
import type { TableRowSelection } from 'antd/es/table/interface'

export default function AdminResumesPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [publicFilter, setPublicFilter] = useState<string>('all')
  const [pageSize, setPageSize] = useState(20)
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
  const { data: resumes, isLoading } = useAdminResumes(search, publicFilter)
  const { mutate: deleteResume } = useDeleteAdminResume()
  const { mutate: batchDelete, isPending: isBatchDeleting } = useBatchDeleteAdminResumes()

  const handleDelete = (id: string, name: string) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除简历"${name}"吗？此操作不可恢复。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => deleteResume(id),
    })
  }

  const handleBatchDelete = () => {
    const selected = (resumes || []).filter((r) => selectedRowKeys.includes(r.id))
    if (selected.length === 0) return
    Modal.confirm({
      title: '确认批量删除',
      content: `确定要删除选中的 ${selected.length} 份简历吗？此操作不可恢复。`,
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

  const rowSelection: TableRowSelection<AdminResumeItem> = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys as string[]),
  }

  const columns = [
    {
      title: '简历名称',
      dataIndex: 'name',
      key: 'name',
      fixed: 'left' as const,
      width: 160,
      render: (name: string, record: AdminResumeItem) => (
        <a onClick={() => router.push(`/admin/resumes/${record.id}`)}>{name}</a>
      ),
    },
    {
      title: '所属用户',
      dataIndex: 'username',
      key: 'username',
      width: 120,
      render: (username: string, record: AdminResumeItem) => (
        <a onClick={() => router.push(`/admin/users/${record.user_id}`)}>{username}</a>
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
      width: 160,
      ellipsis: true,
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
      width: 170,
      render: (v: string) => formatDate(v, 'YYYY-MM-DD HH:mm'),
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 170,
      render: (v: string) => formatDate(v, 'YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 70,
      fixed: 'right' as const,
      render: (_: unknown, record: AdminResumeItem) => (
        <Button
          type="text"
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleDelete(record.id, record.name)}
        />
      ),
    },
  ]

  return (
    <PageContainer size="full" title="简历管理" subtitle="查看和管理所有简历">
      <Card size="small">
        <div style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <Input.Search
            placeholder="搜索简历名称、用户名、slug"
            allowClear
            onSearch={setSearch}
            style={{ maxWidth: 320 }}
          />
          <Select
            value={publicFilter}
            onChange={setPublicFilter}
            style={{ width: 120 }}
            options={[
              { label: '全部', value: 'all' },
              { label: '已公开', value: 'true' },
              { label: '未公开', value: 'false' },
            ]}
          />
          {selectedRowKeys.length > 0 && (
            <>
              <span style={{ color: '#666', fontSize: 13 }}>已选 {selectedRowKeys.length} 项</span>
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
          dataSource={resumes || []}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          rowSelection={rowSelection}
          pagination={{ pageSize, showSizeChanger: true, showTotal: (total) => `共 ${total} 份简历`, onChange: (_page, size) => { if (size !== pageSize) setPageSize(size) } }}
          scroll={{ x: 1000 }}
          size="middle"
        />
      </Card>
    </PageContainer>
  )
}
