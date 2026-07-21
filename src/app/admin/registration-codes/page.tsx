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

const { Text } = Typography

/** 注册码状态标签 */
function getStatusTag(record: RegistrationCode) {
  if (record.disabled_at) return <Tag color="orange">已禁用</Tag>
  if (record.used_at) return <Tag color="blue">已使用</Tag>
  if (record.expires_at && new Date(record.expires_at) <= new Date()) return <Tag color="red">已过期</Tag>
  return <Tag color="green">未使用</Tag>
}

export default function RegistrationCodesPage() {
  const { message, modal } = App.useApp()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const { data: codes, isLoading } = useRegistrationCodes(statusFilter)
  const { mutate: createCode, isPending: isCreating } = useCreateRegistrationCode()
  const { mutate: updateStatus } = useUpdateRegistrationCodeStatus()
  const { mutate: deleteCode } = useDeleteRegistrationCode()

  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [newCode, setNewCode] = useState<string | null>(null)
  const [form] = Form.useForm()

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
      message.success('注册码已复制到剪贴板')
    }
  }

  const handleCopyRegistrationLink = () => {
    if (newCode) {
      const registrationLink = `${window.location.origin}/auth/register?code=${encodeURIComponent(newCode)}`
      navigator.clipboard.writeText(registrationLink)
      message.success('注册链接已复制到剪贴板')
    }
  }

  const handleToggleDisable = (record: RegistrationCode) => {
    const isDisabled = !!record.disabled_at
    if (isDisabled) {
      modal.confirm({
        title: '确认启用注册码',
        content: '确定要启用该注册码吗？',
        okText: '确认',
        cancelText: '取消',
        onOk: () => updateStatus({ id: record.id, disabled: false }),
      })
    } else {
      modal.confirm({
        title: '确认禁用注册码',
        content: '确定要禁用该注册码吗？禁用后将无法用于注册。',
        okText: '禁用',
        okType: 'danger',
        cancelText: '取消',
        onOk: () => updateStatus({ id: record.id, disabled: true }),
      })
    }
  }

  const handleDelete = (record: RegistrationCode) => {
    modal.confirm({
      title: '确认删除注册码',
      content: '确定要删除该注册码吗？此操作不可恢复。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => deleteCode(record.id),
    })
  }

  const columns = [
    {
      title: '标签',
      dataIndex: 'label',
      key: 'label',
      render: (label: string | null) => label || '-',
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_: unknown, record: RegistrationCode) => getStatusTag(record),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (v: string) => formatDate(v, 'YYYY-MM-DD HH:mm'),
    },
    {
      title: '过期时间',
      dataIndex: 'expires_at',
      key: 'expires_at',
      width: 160,
      render: (v: string | null) => v ? formatDate(v, 'YYYY-MM-DD HH:mm') : '永不过期',
    },
    {
      title: '使用时间',
      dataIndex: 'used_at',
      key: 'used_at',
      width: 160,
      render: (v: string | null) => v ? formatDate(v, 'YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: unknown, record: RegistrationCode) => {
        const isUsed = !!record.used_at
        const isDisabled = !!record.disabled_at
        const isExpired = !!record.expires_at && new Date(record.expires_at) <= new Date()

        // 已使用：所有按钮禁用
        if (isUsed) {
          return (
            <Tooltip title="已使用的注册码不能操作">
              <span style={{ color: '#999', fontSize: 12 }}>已使用，不可操作</span>
            </Tooltip>
          )
        }

        return (
          <div style={{ display: 'flex', gap: 2 }}>
            {isDisabled ? (
              <Tooltip title="启用注册码">
                <Button
                  size="small"
                  type="text"
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleToggleDisable(record)}
                />
              </Tooltip>
            ) : (
              <Tooltip title="禁用注册码">
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
            <Tooltip title="删除注册码">
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
      title="注册码管理"
      subtitle="生成和管理账号密码注册所需的邀请码"
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateModalVisible(true)}
        >
          生成注册码
        </Button>
      }
    >
      {/* 新注册码展示 */}
      {newCode && (
        <Alert
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
          message={
            <div>
              <Text strong>注册码已生成，请立即复制！关闭后将无法再次查看明文。</Text>
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
                    复制注册链接
                  </Button>
                  <Button
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={handleCopyCode}
                  >
                    复制注册码
                  </Button>
                </Space>
              </div>
            </div>
          }
          closable
          afterClose={() => setNewCode(null)}
        />
      )}

      {/* 状态筛选 */}
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Text type="secondary">状态筛选：</Text>
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 120 }}
            options={[
              { value: 'all', label: '全部' },
              { value: 'unused', label: '未使用' },
              { value: 'used', label: '已使用' },
              { value: 'disabled', label: '已禁用' },
              { value: 'expired', label: '已过期' },
            ]}
          />
        </Space>
      </div>

      <Table
        dataSource={codes || []}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={false}
        size="small"
      />

      {/* 创建注册码弹窗 */}
      <Modal
        title="生成注册码"
        open={createModalVisible}
        onOk={handleCreate}
        onCancel={() => { setCreateModalVisible(false); form.resetFields() }}
        confirmLoading={isCreating}
        okText="生成"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="label"
            label="标签（可选）"
            extra="用于记录发放对象或用途，如：张三内测邀请"
          >
            <Input placeholder="如：张三内测邀请" />
          </Form.Item>
          <Form.Item
            name="expires_at"
            label="过期时间（可选）"
            extra="留空表示永不过期"
          >
            <DatePicker showTime style={{ width: '100%' }} placeholder="选择过期时间" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  )
}
