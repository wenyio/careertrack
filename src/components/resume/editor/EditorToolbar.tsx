/**
 * 编辑器顶部工具栏
 *
 * 包含：返回、简历名称、保存状态、操作按钮
 */

'use client'

import { useState } from 'react'
import { Button, Input, Tooltip, Popover } from 'antd'
import {
  ArrowLeftOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  PrinterOutlined,
  SaveOutlined,
  SettingOutlined,
  LinkOutlined,
} from '@ant-design/icons'
import PublicLinkPopover from '@/components/resume/PublicLinkPopover'
import type { SaveStatus } from '@/stores/resume-editor'

interface EditorToolbarProps {
  resumeName: string
  saveStatus: SaveStatus
  showPreview: boolean
  isPublic?: boolean
  publicSlug?: string | null
  resumeId?: string
  onNameChange: (name: string) => void
  onSave: () => void
  onTogglePreview: () => void
  onPrint: () => void
  onTogglePublic: (isPublic: boolean, slug?: string) => void
  onBack: () => void
  onOpenSettings?: () => void
  /** 隐藏公开链接按钮（游客模式使用） */
  hidePublic?: boolean
}

const SAVE_STATUS_MAP: Record<SaveStatus, { text: string; color: string }> = {
  idle: { text: '', color: '#999' },
  pending: { text: '未保存', color: '#faad14' },
  saving: { text: '保存中...', color: '#1677ff' },
  saved: { text: '已自动保存', color: '#52c41a' },
  manual_saved: { text: '已保存', color: '#52c41a' },
}

export default function EditorToolbar({
  resumeName,
  saveStatus,
  showPreview,
  isPublic = false,
  publicSlug,
  resumeId,
  onNameChange,
  onSave,
  onTogglePreview,
  onPrint,
  onTogglePublic,
  onBack,
  onOpenSettings,
  hidePublic = false,
}: EditorToolbarProps) {
  const status = SAVE_STATUS_MAP[saveStatus]
  const [popoverOpen, setPopoverOpen] = useState(false)

  return (
    <>
      <div
        className="editor-toolbar"
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        minHeight: 56,
        padding: '8px 16px',
        borderBottom: '1px solid #f0f0f0',
        backgroundColor: '#fff',
        gap: 8,
        flexShrink: 0,
      }}
    >
      {/* 返回按钮 */}
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={onBack}
        style={{ flexShrink: 0 }}
      />

      {/* 简历名称 */}
      <Input
        value={resumeName}
        onChange={(e) => onNameChange(e.target.value)}
        variant="borderless"
        style={{
          fontSize: 16,
          fontWeight: 500,
          maxWidth: 240,
          padding: '0 4px',
        }}
        placeholder="未命名简历"
      />

      {/* 保存状态 */}
      {status.text && (
        <span style={{ fontSize: 12, color: status.color, flexShrink: 0 }}>
          {status.text}
        </span>
      )}

      <div style={{ flex: 1 }} />

      {/* 操作按钮 */}
      <Tooltip title="保存">
        <Button
          type="text"
          icon={<SaveOutlined />}
          onClick={onSave}
        />
      </Tooltip>

      <Tooltip title={showPreview ? '隐藏预览' : '显示预览'}>
        <Button
          type="text"
          icon={showPreview ? <EyeInvisibleOutlined /> : <EyeOutlined />}
          onClick={onTogglePreview}
        />
      </Tooltip>

      {onOpenSettings && (
        <Tooltip title="模板与设置">
          <Button
            type="text"
            icon={<SettingOutlined />}
            onClick={onOpenSettings}
          />
        </Tooltip>
      )}

      <Button
        icon={<PrinterOutlined />}
        onClick={onPrint}
        size="small"
      >
        打印
      </Button>

      {!hidePublic && (
        <Popover
          content={
            <PublicLinkPopover
              isPublic={isPublic}
              publicSlug={publicSlug ?? null}
              resumeId={resumeId || ''}
              resumeName={resumeName}
              onTogglePublic={onTogglePublic}
            />
          }
          title={null}
          trigger="click"
          open={popoverOpen}
          onOpenChange={setPopoverOpen}
          placement="bottomRight"
          destroyOnHidden={false}
        >
          <span>
            <Button
              type={isPublic ? 'primary' : 'default'}
              icon={<LinkOutlined />}
              size="small"
            >
              公开
            </Button>
          </span>
        </Popover>
      )}
    </div>

    {/* 移动端响应式 */}
    <style jsx global>{`
      @media (max-width: 768px) {
        .editor-toolbar {
          gap: 6px !important;
          padding: 6px 8px !important;
        }
        .editor-toolbar .ant-input {
          max-width: 160px !important;
          font-size: 14px !important;
        }
      }
    `}</style>
    </>
  )
}
