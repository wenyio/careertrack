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
  HistoryOutlined,
} from '@ant-design/icons'
import PublicLinkPopover from '@/components/resume/PublicLinkPopover'
import type { SaveStatus } from '@/stores/resume-editor'
import { useI18n } from '@/i18n'

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
  onOpenVersionHistory?: () => void
}

const SAVE_STATUS_COLORS: Record<SaveStatus, string> = {
  idle: '#999',
  pending: '#faad14',
  saving: '#1677ff',
  saved: '#52c41a',
  manual_saved: '#52c41a',
  error: '#ff4d4f',
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
  onOpenVersionHistory,
}: EditorToolbarProps) {
  const { t } = useI18n()
  const saveStatusText: Record<SaveStatus, string> = {
    idle: '',
    pending: t('resumeEditor.savePending'),
    saving: t('resumeEditor.saving'),
    saved: t('resumeEditor.autoSaved'),
    manual_saved: t('resumeEditor.saved'),
    error: t('resumeEditor.saveError'),
  }
  const status = { text: saveStatusText[saveStatus], color: SAVE_STATUS_COLORS[saveStatus] }
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
        aria-label={t('nav.backToResumes')}
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
        placeholder={t('resume.unnamed')}
      />

      {/* 保存状态 */}
      {status.text && (
        <span style={{ fontSize: 12, color: status.color, flexShrink: 0 }}>
          {status.text}
        </span>
      )}

      <div style={{ flex: 1 }} />

      {/* 操作按钮 */}
      <Tooltip title={t('common.save')}>
        <Button
          type="text"
          icon={<SaveOutlined />}
          onClick={onSave}
          aria-label={t('resumeEditor.saveResume')}
        />
      </Tooltip>

      <Tooltip title={showPreview ? t('resumeEditor.hidePreview') : t('resumeEditor.showPreview')}>
        <Button
          type="text"
          icon={showPreview ? <EyeInvisibleOutlined /> : <EyeOutlined />}
          onClick={onTogglePreview}
          aria-label={showPreview ? t('resumeEditor.hidePreview') : t('resumeEditor.showPreview')}
        />
      </Tooltip>

      {onOpenSettings && (
        <Tooltip title={t('resumeEditor.templateSettings')}>
          <Button
            type="text"
            icon={<SettingOutlined />}
            onClick={onOpenSettings}
            aria-label={t('resumeEditor.templateSettings')}
          />
        </Tooltip>
      )}

      {onOpenVersionHistory && (
        <Tooltip title={t('resumeEditor.versionHistory')}>
          <Button type="text" icon={<HistoryOutlined />} onClick={onOpenVersionHistory} aria-label={t('resumeEditor.versionHistory')} />
        </Tooltip>
      )}

      <Button
        icon={<PrinterOutlined />}
        onClick={onPrint}
        size="small"
      >
        {t('resumeEditor.print')}
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
              {t('resumeEditor.public')}
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
