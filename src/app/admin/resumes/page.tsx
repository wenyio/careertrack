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
import { useI18n } from '@/i18n'

export default function AdminResumesPage() {
  const router = useRouter()
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const [publicFilter, setPublicFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
  const { data: resumePage, isLoading } = useAdminResumes(
    search,
    publicFilter,
    page,
    pageSize,
  )
  const { mutate: deleteResume } = useDeleteAdminResume()
  const { mutate: batchDelete, isPending: isBatchDeleting } = useBatchDeleteAdminResumes()
  const resumes = resumePage?.items

  const handleDelete = (id: string, name: string) => {
    Modal.confirm({
      title: t('admin.confirmDeleteResumeTitle'),
      content: t('admin.confirmDeleteResumeContent', { name }),
      okText: t('common.delete'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: () => deleteResume(id, {
        onSuccess: () => {
          if (page > 1 && resumes?.length === 1) setPage(page - 1)
        },
      }),
    })
  }

  const handleBatchDelete = () => {
    const selected = (resumes || []).filter((r) => selectedRowKeys.includes(r.id))
    if (selected.length === 0) return
    Modal.confirm({
      title: t('admin.confirmBatchDeleteResumesTitle'),
      content: t('admin.confirmBatchDeleteResumesContent', { count: selected.length }),
      okText: t('common.delete'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: () => {
        batchDelete(selectedRowKeys, {
          onSuccess: () => {
            if (page > 1 && selected.length === resumes?.length) {
              setPage(page - 1)
            }
            setSelectedRowKeys([])
          },
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
      title: t('admin.resumeName'),
      dataIndex: 'name',
      key: 'name',
      fixed: 'left' as const,
      width: 160,
      render: (name: string, record: AdminResumeItem) => (
        <a onClick={() => router.push(`/admin/resumes/${record.id}`)}>{name}</a>
      ),
    },
    {
      title: t('admin.owner'),
      dataIndex: 'username',
      key: 'username',
      width: 120,
      render: (username: string, record: AdminResumeItem) => (
        <a onClick={() => router.push(`/admin/users/${record.user_id}`)}>{username}</a>
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
      width: 160,
      ellipsis: true,
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
      width: 170,
      render: (v: string) => formatDate(v, 'YYYY-MM-DD HH:mm'),
    },
    {
      title: t('admin.updatedAt'),
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 170,
      render: (v: string) => formatDate(v, 'YYYY-MM-DD HH:mm'),
    },
    {
      title: t('admin.action'),
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
    <PageContainer size="full" title={t('admin.resumesTitle')} subtitle={t('admin.resumesSubtitle')}>
      <Card size="small">
        <div style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <Input.Search
            placeholder={t('admin.searchResumes')}
            allowClear
            onSearch={(value) => {
              setSearch(value)
              setPage(1)
              setSelectedRowKeys([])
            }}
            style={{ maxWidth: 320 }}
          />
          <Select
            value={publicFilter}
            onChange={(value) => {
              setPublicFilter(value)
              setPage(1)
              setSelectedRowKeys([])
            }}
            style={{ width: 120 }}
            options={[
              { label: t('admin.all'), value: 'all' },
              { label: t('admin.published'), value: 'true' },
              { label: t('admin.unpublished'), value: 'false' },
            ]}
          />
          {selectedRowKeys.length > 0 && (
            <>
              <span style={{ color: '#666', fontSize: 13 }}>{t('admin.selectedCount', { count: selectedRowKeys.length })}</span>
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
          dataSource={resumes || []}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          rowSelection={rowSelection}
          pagination={{
            current: page,
            pageSize,
            total: resumePage?.pagination.total || 0,
            showSizeChanger: true,
            showTotal: (total) => t('admin.totalResumesText', { total }),
            onChange: (nextPage, nextPageSize) => {
              setPage(nextPageSize === pageSize ? nextPage : 1)
              setPageSize(nextPageSize)
              setSelectedRowKeys([])
            },
          }}
          scroll={{ x: 1000 }}
          size="middle"
        />
      </Card>
    </PageContainer>
  )
}
