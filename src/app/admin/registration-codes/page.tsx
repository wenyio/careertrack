/**
 * 管理员 - 注册码管理页
 *
 * 生成注册码（明文仅展示一次）、查看注册码元数据列表
 */

'use client'

import { useState } from 'react'
import {
  Button,
  Table,
  Tag,
  Modal,
  Form,
  Input,
  DatePicker,
  Typography,
  Select,
  Space,
  App,
  Alert,
  Tooltip,
} from 'antd'
import { PlusOutlined, CopyOutlined, StopOutlined, CheckCircleOutlined, DeleteOutlined } from '@ant-design/icons'
import {
  useRegistrationCodes,
  useCreateRegistrationCode,
  useUpdateRegistrationCodeStatus,
  useDeleteRegistrationCode,
} from '@/hooks/useAdmin'
import { formatDate } from '@/utils/format'
import PageContainer from '@/components/layout/PageContainer'
import type { RegistrationCode } from '@/types/admin'
import { useI18n } from '@/i18n'

const { Text } = Typography

/** 注册码状态标签 */
function getStatusTag(record: RegistrationCode, t: (key: string, params?: Record<string, string | number>) => string) {
  if (record.disabled_at) return <Tag color="orange">{t('admin.disabled')}</Tag>
  if (record.used_at) return <Tag color="blue">{t('admin.used')}</Tag>
  if (record.expires_at && new Date(record.expires_at) <= new Date()) return <Tag color="red">{t('admin.expired')}</Tag>
  return <Tag color="green">{t('admin.unused')}</Tag>
}

export default function RegistrationCodesPage() {
  const { message, modal } = App.useApp()
  const { t } = useI18n()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const { data: codePage, isLoading } = useRegistrationCodes(
    statusFilter,
    page,
    pageSize,
  )
  const { mutate: createCode, isPending: isCreating } = useCreateRegistrationCode()
  const { mutate: updateStatus } = useUpdateRegistrationCodeStatus()
  const { mutate: deleteCode } = useDeleteRegistrationCode()

  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [newCode, setNewCode] = useState<string | null>(null)
  const [form] = Form.useForm()
  const codes = codePage?.items

  const handleCreate = () => {
    form.validateFields().then((values) => {
      const data: { label?: string; expires_at?: string } = {}
      if (values.label) data.label = values.label
      if (values.expires_at) data.expires_at = values.expires_at.toISOString()

      createCode(data, {
        onSuccess: (result) => {
          setNewCode(result.code || null)
          setCreateModalVisible(false)
          form.resetFields()
        },
      })
    })
  }

  const handleCopyCode = () => {
    if (newCode) {
      navigator.clipboard.writeText(newCode)
      message.success(t('admin.codeCopied'))
    }
  }

  const handleCopyRegistrationLink = () => {
    if (newCode) {
      const registrationLink = `${window.location.origin}/auth/register?code=${encodeURIComponent(newCode)}`
      navigator.clipboard.writeText(registrationLink)
      message.success(t('admin.registrationLinkCopied'))
    }
  }

  const handleToggleDisable = (record: RegistrationCode) => {
    const isDisabled = !!record.disabled_at
    if (isDisabled) {
      modal.confirm({
        title: t('admin.confirmEnableCodeTitle'),
        content: t('admin.confirmEnableCodeContent'),
        okText: t('common.confirm'),
        cancelText: t('common.cancel'),
        onOk: () => updateStatus({ id: record.id, disabled: false }),
      })
    } else {
      modal.confirm({
        title: t('admin.confirmDisableCodeTitle'),
        content: t('admin.confirmDisableCodeContent'),
        okText: t('admin.disableCode'),
        okType: 'danger',
        cancelText: t('common.cancel'),
        onOk: () => updateStatus({ id: record.id, disabled: true }),
      })
    }
  }

  const handleDelete = (record: RegistrationCode) => {
    modal.confirm({
      title: t('admin.confirmDeleteCodeTitle'),
      content: t('admin.confirmDeleteCodeContent'),
      okText: t('common.delete'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: () => deleteCode(record.id, {
        onSuccess: () => {
          if (page > 1 && codes?.length === 1) setPage(page - 1)
        },
      }),
    })
  }

  const columns = [
    {
      title: t('admin.label'),
      dataIndex: 'label',
      key: 'label',
      render: (label: string | null) => label || '-',
    },
    {
      title: t('admin.status'),
      key: 'status',
      width: 100,
      render: (_: unknown, record: RegistrationCode) => getStatusTag(record, t),
    },
    {
      title: t('admin.createdAt'),
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (v: string) => formatDate(v, 'YYYY-MM-DD HH:mm'),
    },
    {
      title: t('admin.expiresAt'),
      dataIndex: 'expires_at',
      key: 'expires_at',
      width: 160,
      render: (v: string | null) => v ? formatDate(v, 'YYYY-MM-DD HH:mm') : t('admin.neverExpires'),
    },
    {
      title: t('admin.usedAt'),
      dataIndex: 'used_at',
      key: 'used_at',
      width: 160,
      render: (v: string | null) => v ? formatDate(v, 'YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: t('admin.action'),
      key: 'action',
      width: 150,
      render: (_: unknown, record: RegistrationCode) => {
        const isUsed = !!record.used_at
        const isDisabled = !!record.disabled_at
        const isExpired = !!record.expires_at && new Date(record.expires_at) <= new Date()

        // 已使用：所有按钮禁用
        if (isUsed) {
          return (
            <Tooltip title={t('admin.usedCodeCannotOperate')}>
              <span style={{ color: '#999', fontSize: 12 }}>{t('admin.usedCodeNoAction')}</span>
            </Tooltip>
          )
        }

        return (
          <div style={{ display: 'flex', gap: 2 }}>
            {isDisabled ? (
              <Tooltip title={t('admin.enableCode')}>
                <Button
                  size="small"
                  type="text"
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleToggleDisable(record)}
                />
              </Tooltip>
            ) : (
              <Tooltip title={t('admin.disableCode')}>
                <Button
                  size="small"
                  type="text"
                  danger
                  icon={<StopOutlined />}
                  disabled={isExpired}
                  onClick={() => handleToggleDisable(record)}
                />
              </Tooltip>
            )}
            <Tooltip title={t('admin.deleteCode')}>
              <Button
                size="small"
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDelete(record)}
              />
            </Tooltip>
          </div>
        )
      },
    },
  ]

  return (
    <PageContainer
      size="lg"
      title={t('admin.registrationCodesTitle')}
      subtitle={t('admin.registrationCodesSubtitle')}
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateModalVisible(true)}
        >
          {t('admin.generateRegistrationCode')}
        </Button>
      }
    >
      {/* 新注册码展示 */}
      {newCode && (
        <Alert
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
          title={
            <div>
              <Text strong>{t('admin.codeGeneratedWarning')}</Text>
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Text
                  code
                  copyable={false}
                  style={{ fontSize: 14, wordBreak: 'break-all' }}
                >
                  {newCode}
                </Text>
                <Space size={4}>
                  <Button
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={handleCopyRegistrationLink}
                  >
                    {t('admin.copyRegistrationLink')}
                  </Button>
                  <Button
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={handleCopyCode}
                  >
                    {t('admin.copyRegistrationCode')}
                  </Button>
                </Space>
              </div>
            </div>
          }
          closable={{ afterClose: () => setNewCode(null) }}
        />
      )}

      {/* 状态筛选 */}
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Text type="secondary">{t('admin.statusFilter')}</Text>
          <Select
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value)
              setPage(1)
            }}
            style={{ width: 120 }}
            options={[
              { value: 'all', label: t('admin.all') },
              { value: 'unused', label: t('admin.unused') },
              { value: 'used', label: t('admin.used') },
              { value: 'disabled', label: t('admin.disabled') },
              { value: 'expired', label: t('admin.expired') },
            ]}
          />
        </Space>
      </div>

      <Table
        dataSource={codes || []}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: page,
          pageSize,
          total: codePage?.pagination.total || 0,
          showSizeChanger: true,
          showTotal: (total) => t('admin.totalCodesText', { total }),
          onChange: (nextPage, nextPageSize) => {
            setPage(nextPageSize === pageSize ? nextPage : 1)
            setPageSize(nextPageSize)
          },
        }}
        size="small"
      />

      {/* 创建注册码弹窗 */}
      <Modal
        title={t('admin.generateRegistrationCode')}
        open={createModalVisible}
        onOk={handleCreate}
        onCancel={() => { setCreateModalVisible(false); form.resetFields() }}
        confirmLoading={isCreating}
        okText={t('admin.generate')}
        cancelText={t('common.cancel')}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="label"
            label={t('admin.labelOptional')}
            extra={t('admin.labelHelp')}
          >
            <Input placeholder={t('admin.labelPlaceholder')} />
          </Form.Item>
          <Form.Item
            name="expires_at"
            label={t('admin.expiresOptional')}
            extra={t('admin.expiresHelp')}
          >
            <DatePicker showTime style={{ width: '100%' }} placeholder={t('admin.expiresPlaceholder')} />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  )
}
