/**
 * 自我评价表单
 */

'use client'

import { useMemo, useState } from 'react'
import { Form, Button, Modal, Input, Radio, Space, Empty, App, Select } from 'antd'
import { ImportOutlined, SyncOutlined } from '@ant-design/icons'
import type { DescriptionField } from '@/types/resume'
import type { ProfileEntrySyncMode, SelfEvaluation } from '@/types/profile'
import RichTextEditor from '@/components/resume/editor/RichTextEditor'
import { ArrayFormItemCard, AddItemButton } from '@/components/common/ArrayFormCard'
import { generateId } from '@/utils/format'
import { deepClone } from '@/utils/format'
import { richTextToPlainText } from '@/utils/rich-text'
import { useSyncProfileEntry } from '@/hooks/useProfile'
import {
  DEFAULT_SELF_EVALUATION_TITLE,
  hasDescriptionContent,
  normalizeSelfEvaluations,
} from '@/utils/self-evaluation'

interface SummaryFormProps {
  value?: DescriptionField
  defaultValue?: DescriptionField
  onChange: (value: DescriptionField) => void
  /** 个人信息中的旧版简介，用于简历编辑模式下的手动导入兜底 */
  importValue?: DescriptionField
  /** profile 模式下的多条自我评价草稿 */
  profileValue?: Partial<SelfEvaluation>[]
  /** profile 模式下已保存的多条自我评价 */
  defaultProfileValue?: SelfEvaluation[]
  /** 简历编辑模式下可导入的多条自我评价 */
  importEntries?: SelfEvaluation[]
  mode?: 'profile' | 'resume'
  canSyncProfile?: boolean
  onProfileChange?: (value: Partial<SelfEvaluation>[]) => void
}

function truncateDescription(value: DescriptionField | undefined, maxLen = 80): string {
  const text = richTextToPlainText(value || '')
  if (text.length <= maxLen) return text
  return `${text.slice(0, maxLen)}...`
}

function createSelfEvaluation(): Partial<SelfEvaluation> {
  return {
    id: generateId(),
    title: '',
    description: '',
  }
}

export default function SummaryForm({
  value,
  defaultValue,
  onChange,
  importValue,
  profileValue,
  defaultProfileValue,
  importEntries,
  mode = 'resume',
  canSyncProfile,
  onProfileChange,
}: SummaryFormProps) {
  const { modal } = App.useApp()
  const { mutateAsync: syncProfileEntry, isPending: isSyncingProfileEntry } = useSyncProfileEntry()
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [syncModalOpen, setSyncModalOpen] = useState(false)
  const [syncMode, setSyncMode] = useState<ProfileEntrySyncMode>('create')
  const [syncTitle, setSyncTitle] = useState('')
  const [syncTargetId, setSyncTargetId] = useState<string | undefined>()
  const candidates = useMemo(() => {
    const entries = normalizeSelfEvaluations(importEntries, importValue)
      .filter((entry) => hasDescriptionContent(entry.description))
    return entries
  }, [importEntries, importValue])
  const [selectedImportId, setSelectedImportId] = useState<string | undefined>(() => candidates[0]?.id)
  const showImportButton = mode !== 'profile' && candidates.length > 0
  const currentDescription = value || defaultValue || ''
  const canSyncCurrentEvaluation = mode !== 'profile' && !!canSyncProfile && hasDescriptionContent(currentDescription)
  const profileTargetOptions = useMemo(() => {
    return candidates.map((entry, index) => ({
      value: entry.id,
      label: entry.title || `自我评价 ${index + 1}`,
    }))
  }, [candidates])

  const profileItems = useMemo(() => {
    if (mode !== 'profile') return []
    if (profileValue !== undefined) return profileValue
    const source = normalizeSelfEvaluations(defaultProfileValue, defaultValue)
    return source.length > 0 ? source : [createSelfEvaluation()]
  }, [defaultProfileValue, defaultValue, mode, profileValue])

  const handleProfileItemsChange = (items: Partial<SelfEvaluation>[]) => {
    onProfileChange?.(items)
  }

  const handleProfileFieldChange = (index: number, field: keyof SelfEvaluation, fieldValue: unknown) => {
    const next = [...profileItems]
    next[index] = { ...next[index], [field]: fieldValue }
    handleProfileItemsChange(next)
  }

  const handleAddProfileItem = () => {
    handleProfileItemsChange([...profileItems, createSelfEvaluation()])
  }

  const handleRemoveProfileItem = (index: number) => {
    handleProfileItemsChange(profileItems.filter((_, itemIndex) => itemIndex !== index))
  }

  const openImportModal = () => {
    setSelectedImportId(candidates[0]?.id)
    setImportModalOpen(true)
  }

  const handleConfirmImport = () => {
    const selected = candidates.find((entry) => entry.id === selectedImportId) || candidates[0]
    if (!selected) return
    onChange(deepClone(selected.description) as DescriptionField)
    setImportModalOpen(false)
  }

  const findBestSyncTargetId = () => {
    const currentText = richTextToPlainText(currentDescription).trim()
    if (!currentText) return undefined
    return candidates.find((entry) =>
      richTextToPlainText(entry.description).trim() === currentText
    )?.id
  }

  const handleOpenSyncModal = () => {
    const targetId = findBestSyncTargetId()
    const target = candidates.find((entry) => entry.id === targetId)
    setSyncTargetId(targetId)
    setSyncMode(targetId ? 'replace' : 'create')
    setSyncTitle(target?.title || '')
    setSyncModalOpen(true)
  }

  const handleConfirmSync = async () => {
    if (!hasDescriptionContent(currentDescription)) return
    if (syncMode === 'replace' && !syncTargetId) return

    await syncProfileEntry({
      field: 'self_evaluations',
      mode: syncMode,
      target_id: syncMode === 'replace' ? syncTargetId : undefined,
      entry: {
        title: syncTitle.trim(),
        description: deepClone(currentDescription),
      },
    })

    setSyncModalOpen(false)
    setSyncTargetId(undefined)
    setSyncTitle('')
  }

  const handleImportFromProfile = () => {
    if (candidates.length > 1) {
      openImportModal()
      return
    }

    const selected = candidates[0]
    if (!selected) return

    modal.confirm({
      title: '从个人信息填充',
      content: '这将覆盖当前简历的自我评价内容，确定继续吗？',
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        onChange(deepClone(selected.description) as DescriptionField)
      },
    })
  }

  if (mode === 'profile') {
    return (
      <Form layout="vertical">
        {profileItems.map((item, index) => (
          <ArrayFormItemCard
            key={item.id || index}
            id={item.id}
            index={index}
            onRemove={() => handleRemoveProfileItem(index)}
          >
            <Form.Item label="标题">
              <Input
                value={item.title}
                onChange={(event) => handleProfileFieldChange(index, 'title', event.target.value)}
                placeholder={index === 0 ? DEFAULT_SELF_EVALUATION_TITLE : '例如：产品岗位版本、技术岗位版本'}
              />
            </Form.Item>
            <Form.Item label="自我评价">
              <RichTextEditor
                value={item.description || ''}
                onChange={(nextValue) => handleProfileFieldChange(index, 'description', nextValue)}
                placeholder="请输入自我评价，概述您的优势、经历和职业目标..."
                minHeight={160}
              />
            </Form.Item>
          </ArrayFormItemCard>
        ))}
        <AddItemButton text="添加自我评价" onClick={handleAddProfileItem} />
      </Form>
    )
  }

  return (
    <Form layout="vertical">
      {(showImportButton || canSyncCurrentEvaluation) && (
        <Space.Compact block style={{ marginBottom: 16 }}>
          {showImportButton && (
            <Button
              type="dashed"
              icon={<ImportOutlined />}
              onClick={handleImportFromProfile}
              style={{ width: canSyncCurrentEvaluation ? '50%' : '100%' }}
            >
              从个人信息填充
            </Button>
          )}
          {canSyncCurrentEvaluation && (
            <Button
              type="dashed"
              icon={<SyncOutlined />}
              onClick={handleOpenSyncModal}
              loading={isSyncingProfileEntry}
              style={{ width: showImportButton ? '50%' : '100%' }}
            >
              同步到个人信息
            </Button>
          )}
        </Space.Compact>
      )}
      <Form.Item label="自我评价">
        <RichTextEditor
          value={value || defaultValue || ''}
          onChange={onChange}
          placeholder="请输入自我评价，概述您的优势、经历和职业目标..."
          minHeight={160}
        />
      </Form.Item>
      <Modal
        title="选择一条自我评价"
        open={importModalOpen}
        okText="导入"
        cancelText="取消"
        onOk={handleConfirmImport}
        onCancel={() => setImportModalOpen(false)}
        okButtonProps={{ disabled: !selectedImportId }}
      >
        {candidates.length === 0 ? (
          <Empty description="个人信息中暂无自我评价" />
        ) : (
          <Radio.Group
            value={selectedImportId}
            onChange={(event) => setSelectedImportId(event.target.value)}
            style={{ width: '100%' }}
          >
            <Space orientation="vertical" style={{ width: '100%' }}>
              {candidates.map((entry, index) => (
                <Radio key={entry.id} value={entry.id} style={{ width: '100%' }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>
                      {entry.title || `自我评价 ${index + 1}`}
                    </div>
                    <div style={{ color: '#666', fontSize: 13, marginTop: 4 }}>
                      {truncateDescription(entry.description)}
                    </div>
                  </div>
                </Radio>
              ))}
            </Space>
          </Radio.Group>
        )}
      </Modal>
      <Modal
        title="同步到个人信息"
        open={syncModalOpen}
        okText={syncMode === 'create' ? '新增' : '覆盖'}
        cancelText="取消"
        onOk={handleConfirmSync}
        onCancel={() => setSyncModalOpen(false)}
        confirmLoading={isSyncingProfileEntry}
        okButtonProps={{
          disabled: syncMode === 'replace' && !syncTargetId,
        }}
      >
        <Radio.Group
          value={syncMode}
          onChange={(event) => setSyncMode(event.target.value)}
          style={{ width: '100%', marginBottom: 16 }}
        >
          <Space orientation="vertical">
            <Radio value="create">新增为一条自我评价</Radio>
            <Radio value="replace" disabled={profileTargetOptions.length === 0}>
              覆盖已有自我评价
            </Radio>
          </Space>
        </Radio.Group>

        {syncMode === 'create' ? (
          <Form.Item label="标题">
            <Input
              value={syncTitle}
              onChange={(event) => setSyncTitle(event.target.value)}
              placeholder="例如：技术岗位版本"
            />
          </Form.Item>
        ) : (
          <Form.Item label="选择要覆盖的自我评价">
            <Select
              value={syncTargetId}
              onChange={(nextTargetId) => {
                setSyncTargetId(nextTargetId)
                const target = candidates.find((entry) => entry.id === nextTargetId)
                setSyncTitle(target?.title || '')
              }}
              options={profileTargetOptions}
              placeholder="请选择已有自我评价"
            />
          </Form.Item>
        )}
      </Modal>
    </Form>
  )
}
