/**
 * MCP Key 管理页面
 *
 * 创建、查看、撤销、删除 MCP API Key
 */

'use client'

import { useState, useMemo } from 'react'
import { App, Button, Table, Tag, Modal, Typography, Space, Alert, Collapse } from 'antd'
import {
  PlusOutlined,
  CopyOutlined,
  DeleteOutlined,
  StopOutlined,
  ApiOutlined,
} from '@ant-design/icons'
import SettingsPageLayout from '@/components/layout/SettingsPageLayout'
import { useMcpKeys, useCreateMcpKey, useRevokeMcpKey, useDeleteMcpKey } from '@/hooks/useMcpKeys'
import type { McpKeyInfo } from '@/services/mcp'

const { Text, Paragraph } = Typography

export default function McpSettingsPage() {
  const [secretModal, setSecretModal] = useState<{ open: boolean; secret: string; prefix: string }>({
    open: false,
    secret: '',
    prefix: '',
  })

  const { modal, message } = App.useApp()
  const { data: keys = [], isLoading } = useMcpKeys()
  const createMutation = useCreateMcpKey()
  const revokeMutation = useRevokeMcpKey()
  const deleteMutation = useDeleteMcpKey()

  const mcpEndpoint = useMemo(() => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/api/mcp`
    }
    return '/api/mcp'
  }, [])

  const handleCreate = () => {
    createMutation.mutate(undefined, {
      onSuccess: (result) => {
        setSecretModal({ open: true, secret: result.secret, prefix: result.prefix })
      },
    })
  }

  const handleRevoke = (keyId: string) => {
    modal.confirm({
      title: '确认撤销',
      content: '撤销后该 Key 将立即失效，此操作不可恢复。确定要撤销吗？',
      okText: '撤销',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        revokeMutation.mutate(keyId)
      },
    })
  }

  const handleDelete = (keyId: string) => {
    modal.confirm({
      title: '确认删除',
      content: '删除后该 Key 记录将被永久移除。确定要删除吗？',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        deleteMutation.mutate(keyId)
      },
    })
  }

  const handleCopy = async (text: string) => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      message.success('已复制到剪贴板')
    } catch {
      message.error('复制失败，请手动复制')
    }
  }

  const columns = [
    {
      title: 'Key 前缀',
      dataIndex: 'prefix',
      key: 'prefix',
      render: (prefix: string) => (
        <Text code style={{ fontSize: 13 }}>{prefix}...</Text>
      ),
    },
    {
      title: '权限',
      dataIndex: 'scope',
      key: 'scope',
      render: (scope: string) => (
        <Tag color={scope === 'read_write' ? 'blue' : 'default'}>
          {scope === 'read_write' ? '读写' : '只读'}
        </Tag>
      ),
    },
    {
      title: '状态',
      key: 'status',
      render: (_: unknown, record: McpKeyInfo) => (
        record.revoked_at
          ? <Tag color="error">已撤销</Tag>
          : <Tag color="success">有效</Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (v: string) => new Date(v).toLocaleString('zh-CN'),
    },
    {
      title: '最后使用',
      dataIndex: 'last_used_at',
      key: 'last_used_at',
      render: (v: string | null) => v ? new Date(v).toLocaleString('zh-CN') : '-',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: McpKeyInfo) => (
        record.revoked_at ? (
          <Button
            type="link"
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          >
            删除
          </Button>
        ) : (
          <Space size={0}>
            <Button
              type="link"
              size="small"
              icon={<StopOutlined />}
              onClick={() => handleRevoke(record.id)}
            >
              撤销
            </Button>
            <Button
              type="link"
              danger
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record.id)}
            >
              删除
            </Button>
          </Space>
        )
      ),
    },
  ]

  return (
    <SettingsPageLayout
      title="MCP 服务"
      subtitle="管理 MCP API Key，供 AI Agent 通过 MCP 协议访问您的数据"
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          loading={createMutation.isPending}
          onClick={handleCreate}
        >
          创建 Key
        </Button>
      }
      size="lg"
    >
      <div style={{ marginBottom: 16 }}>
        <Alert
          type="info"
          showIcon
          icon={<ApiOutlined />}
          title="什么是 MCP？"
          description={
            <span>
              MCP (Model Context Protocol) 是一种标准化协议，允许 AI Agent 安全地访问您的简历和个人信息。
              创建 Key 后，将其配置到支持 MCP 的客户端（如 Claude Desktop）即可使用。
            </span>
          }
        />
      </div>

      <Table
        dataSource={keys}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={false}
        size="middle"
        locale={{ emptyText: '暂无 API Key，点击右上角按钮创建' }}
        style={{ marginBottom: 20 }}
      />

      {/* 接入指南 */}
      <Collapse
        size="small"
        items={[{
          key: 'guide',
          label: <span style={{ fontWeight: 500 }}>📖 接入指南</span>,
          children: (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* MCP 端点地址 */}
              <div>
                <Text strong style={{ fontSize: 13 }}>MCP 端点地址</Text>
                <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Text
                    code
                    style={{ fontSize: 13, flex: 1, wordBreak: 'break-all' }}
                  >
                    {mcpEndpoint}
                  </Text>
                  <Button
                    type="text"
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => handleCopy(mcpEndpoint)}
                  />
                </div>
              </div>

              {/* 鉴权方式 */}
              <div>
                <Text strong style={{ fontSize: 13 }}>鉴权方式</Text>
                <div style={{ marginTop: 6 }}>
                  <Text code style={{ fontSize: 12 }}>Authorization: Bearer &lt;your-key&gt;</Text>
                  <Text type="secondary" style={{ fontSize: 12, margin: '0 8px' }}>或</Text>
                  <Text code style={{ fontSize: 12 }}>X-API-Key: &lt;your-key&gt;</Text>
                </div>
              </div>

              {/* Claude Desktop 配置 */}
              <div>
                <Text strong style={{ fontSize: 13 }}>Claude Desktop 配置</Text>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                  编辑 <Text code style={{ fontSize: 12 }}>claude_desktop_config.json</Text>：
                </Text>
                <div style={{ position: 'relative' }}>
                  <Paragraph
                    code
                    copyable={false}
                    style={{
                      background: '#f6f8fa',
                      padding: '12px 16px',
                      borderRadius: 8,
                      fontSize: 12,
                      margin: 0,
                      whiteSpace: 'pre',
                      lineHeight: 1.6,
                    }}
                  >
{`{
  "mcpServers": {
    "careertrack": {
      "url": "${mcpEndpoint}",
      "headers": {
        "Authorization": "Bearer <your-key>"
      }
    }
  }
}`}
                  </Paragraph>
                  <Button
                    type="text"
                    size="small"
                    icon={<CopyOutlined />}
                    style={{ position: 'absolute', top: 8, right: 8 }}
                    onClick={() => handleCopy(JSON.stringify({
                      mcpServers: {
                        careertrack: {
                          url: mcpEndpoint,
                          headers: { Authorization: 'Bearer <your-key>' },
                        },
                      },
                    }, null, 2))}
                  />
                </div>
              </div>

              {/* Claude Code 配置 */}
              <div>
                <Text strong style={{ fontSize: 13 }}>Claude Code 配置</Text>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                  运行以下命令添加 MCP 服务：
                </Text>
                <div style={{ position: 'relative' }}>
                  <Paragraph
                    code
                    copyable={false}
                    style={{
                      background: '#f6f8fa',
                      padding: '12px 16px',
                      borderRadius: 8,
                      fontSize: 12,
                      margin: 0,
                      whiteSpace: 'pre',
                      lineHeight: 1.6,
                    }}
                  >
{`claude mcp add careertrack \\
  --transport http \\
  --url ${mcpEndpoint} \\
  --header "Authorization: Bearer <your-key>"`}
                  </Paragraph>
                  <Button
                    type="text"
                    size="small"
                    icon={<CopyOutlined />}
                    style={{ position: 'absolute', top: 8, right: 8 }}
                    onClick={() => handleCopy(`claude mcp add careertrack --transport http --url ${mcpEndpoint} --header "Authorization: Bearer <your-key>"`)}
                  />
                </div>
              </div>
            </div>
          ),
        }]}
      />

      {/* 创建成功后显示 Secret */}
      <Modal
        title="🔑 Key 创建成功"
        open={secretModal.open}
        onOk={() => setSecretModal({ ...secretModal, open: false })}
        onCancel={() => setSecretModal({ ...secretModal, open: false })}
        okText="我已保存"
        cancelButtonProps={{ style: { display: 'none' } }}
        width={600}
      >
        <Alert
          type="warning"
          showIcon
          title="请立即保存 Secret Key"
          description="此密钥只会显示一次，关闭后将无法再次查看完整 Key。请妥善保管。"
          style={{ marginBottom: 16 }}
        />
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary">前缀：</Text>
          <Text code>{secretModal.prefix}...</Text>
        </div>
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary">完整 Key：</Text>
          <div style={{ marginTop: 8 }}>
            <Paragraph
              code
              copyable={false}
              style={{
                background: '#f6f8fa',
                padding: '12px 16px',
                borderRadius: 8,
                fontSize: 13,
                wordBreak: 'break-all',
                margin: 0,
              }}
            >
              {secretModal.secret}
            </Paragraph>
          </div>
        </div>
        <Space style={{ marginTop: 8 }}>
          <Button
            icon={<CopyOutlined />}
            onClick={() => handleCopy(secretModal.secret)}
          >
            复制 Key
          </Button>
        </Space>
      </Modal>
    </SettingsPageLayout>
  )
}
