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
import { useI18n } from '@/i18n'

const { Text, Paragraph } = Typography

export default function McpSettingsPage() {
  const { locale, t } = useI18n()
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
      title: t('mcp.confirmRevokeTitle'),
      content: t('mcp.confirmRevokeContent'),
      okText: t('mcp.revoke'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: () => {
        revokeMutation.mutate(keyId)
      },
    })
  }

  const handleDelete = (keyId: string) => {
    modal.confirm({
      title: t('mcp.confirmDeleteTitle'),
      content: t('mcp.confirmDeleteContent'),
      okText: t('common.delete'),
      okType: 'danger',
      cancelText: t('common.cancel'),
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
        // Clipboard API 的兼容降级，供不支持 navigator.clipboard 的旧浏览器使用。
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      message.success(t('mcp.copied'))
    } catch {
      message.error(t('mcp.copyFailed'))
    }
  }

  const columns = [
    {
      title: t('mcp.prefix'),
      dataIndex: 'prefix',
      key: 'prefix',
      render: (prefix: string) => (
        <Text code style={{ fontSize: 13 }}>{prefix}...</Text>
      ),
    },
    {
      title: t('mcp.scope'),
      dataIndex: 'scope',
      key: 'scope',
      render: (scope: string) => (
        <Tag color={scope === 'read_write' ? 'blue' : 'default'}>
          {scope === 'read_write' ? t('mcp.readWrite') : t('mcp.readOnly')}
        </Tag>
      ),
    },
    {
      title: t('mcp.status'),
      key: 'status',
      render: (_: unknown, record: McpKeyInfo) => (
        record.revoked_at
          ? <Tag color="error">{t('mcp.revoked')}</Tag>
          : <Tag color="success">{t('mcp.valid')}</Tag>
      ),
    },
    {
      title: t('mcp.createdAt'),
      dataIndex: 'created_at',
      key: 'created_at',
      render: (v: string) => new Date(v).toLocaleString(locale),
    },
    {
      title: t('mcp.lastUsedAt'),
      dataIndex: 'last_used_at',
      key: 'last_used_at',
      render: (v: string | null) => v ? new Date(v).toLocaleString(locale) : '-',
    },
    {
      title: t('mcp.action'),
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
            {t('common.delete')}
          </Button>
        ) : (
          <Space size={0}>
            <Button
              type="link"
              size="small"
              icon={<StopOutlined />}
              onClick={() => handleRevoke(record.id)}
            >
              {t('mcp.revoke')}
            </Button>
            <Button
              type="link"
              danger
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record.id)}
            >
              {t('common.delete')}
            </Button>
          </Space>
        )
      ),
    },
  ]

  return (
    <SettingsPageLayout
      title={t('mcp.title')}
      subtitle={t('mcp.subtitle')}
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          loading={createMutation.isPending}
          onClick={handleCreate}
        >
          {t('mcp.createKey')}
        </Button>
      }
      size="lg"
    >
      <div style={{ marginBottom: 16 }}>
        <Alert
          type="info"
          showIcon
          icon={<ApiOutlined />}
          title={t('mcp.whatIsMcp')}
          description={<span>{t('mcp.description')}</span>}
        />
      </div>

      <Table
        dataSource={keys}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={false}
        size="middle"
        locale={{ emptyText: t('mcp.empty') }}
        style={{ marginBottom: 20 }}
      />

      {/* 接入指南 */}
      <Collapse
        size="small"
        items={[{
          key: 'guide',
          label: <span style={{ fontWeight: 500 }}>{t('mcp.guide')}</span>,
          children: (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* MCP 端点地址 */}
              <div>
                <Text strong style={{ fontSize: 13 }}>{t('mcp.endpoint')}</Text>
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
                <Text strong style={{ fontSize: 13 }}>{t('mcp.authMethod')}</Text>
                <div style={{ marginTop: 6 }}>
                  <Text code style={{ fontSize: 12 }}>Authorization: Bearer &lt;your-key&gt;</Text>
                  <Text type="secondary" style={{ fontSize: 12, margin: '0 8px' }}>{t('mcp.or')}</Text>
                  <Text code style={{ fontSize: 12 }}>X-API-Key: &lt;your-key&gt;</Text>
                </div>
              </div>

              {/* Claude Desktop 配置 */}
              <div>
                <Text strong style={{ fontSize: 13 }}>{t('mcp.claudeDesktopConfig')}</Text>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                  {t('mcp.editConfigPrefix')}
                  <Text code style={{ fontSize: 12 }}>claude_desktop_config.json</Text>
                  {t('mcp.editConfigSuffix')}
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
                <Text strong style={{ fontSize: 13 }}>{t('mcp.claudeCodeConfig')}</Text>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                  {t('mcp.runCommand')}
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
        title={t('mcp.secretCreatedTitle')}
        open={secretModal.open}
        onOk={() => setSecretModal({ ...secretModal, open: false })}
        onCancel={() => setSecretModal({ ...secretModal, open: false })}
        okText={t('mcp.saved')}
        cancelButtonProps={{ style: { display: 'none' } }}
        width={600}
      >
        <Alert
          type="warning"
          showIcon
          title={t('mcp.saveSecretNow')}
          description={t('mcp.secretDescription')}
          style={{ marginBottom: 16 }}
        />
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary">{t('mcp.prefix')}:</Text>
          <Text code>{secretModal.prefix}...</Text>
        </div>
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary">{t('mcp.fullKey')}</Text>
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
            {t('mcp.copyKey')}
          </Button>
        </Space>
      </Modal>
    </SettingsPageLayout>
  )
}
