/**
 * 通用数组模块表单组件
 *
 * 根据字段配置自动渲染表单，统一三列布局。
 * 支持 input、select、dateRange、month、richText 字段类型。
 * 支持从个人信息导入已有条目。
 */

'use client'

import { useState, useMemo, useCallback } from 'react'
import { Form, Input, Select, DatePicker, Modal, Checkbox, Empty, Button, Space, Tooltip, Radio } from 'antd'
import { ImportOutlined, EyeOutlined, EyeInvisibleOutlined, SyncOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import type { ModuleFieldConfig } from '@/config/module-fields'
import type { ArrayModuleImportConfig } from '@/config/profile-import'
import type { DescriptionField } from '@/types/resume'
import type { ProfileArrayField, ProfileEntrySyncMode } from '@/types/profile'
import { isFieldHiddenOnItem, toggleHiddenFieldOnItem } from '@/utils/resume-preview'
import { buildExistingImportSignatures, isDuplicateImportItem, normalizeSignature } from '@/utils/profile-import'
import { useSyncProfileEntry } from '@/hooks/useProfile'
import RichTextEditor from '@/components/resume/editor/RichTextEditor'
import { ArrayFormItemCard, AddItemButton } from '@/components/common/ArrayFormCard'
import DateRangeField from '@/components/common/DateRangeField'
import { FormGrid, FormGridNormal, FormGridWide, FormGridFull } from '@/components/common/FormGrid'
import { generateId, deepClone } from '@/utils/format'
import { useI18n } from '@/i18n'

type EntrySyncMode = ProfileEntrySyncMode | 'pull'

interface ArrayModuleFormProps<T extends { id?: string }> {
  items: Partial<T>[]
  fields: ModuleFieldConfig[]
  addText: string
  createItem: () => Partial<T>
  onChange: (items: Partial<T>[]) => void
  /** 个人信息中对应模块的数据，作为导入源 */
  importItems?: T[]
  /** 导入 Modal 的配置 */
  importConfig?: ArrayModuleImportConfig<T>
  /** profile 模式不显示隐藏开关和导入按钮，resume 模式显示 */
  mode?: 'profile' | 'resume'
  /** 登录用户的简历编辑模式可同步单条记录到个人信息 */
  profileSyncField?: ProfileArrayField
}

function getGridSpan(span?: string) {
  switch (span) {
    case 'wide': return FormGridWide
    case 'full': return FormGridFull
    default: return FormGridNormal
  }
}

export default function ArrayModuleForm<T extends { id?: string }>({
  items,
  fields,
  addText,
  createItem,
  onChange,
  importItems,
  importConfig,
  mode,
  profileSyncField,
}: ArrayModuleFormProps<T>) {
  const isResumeMode = mode === 'resume'
  const canSyncToProfile = isResumeMode && !!profileSyncField
  const { t } = useI18n()
  const { mutateAsync: syncProfileEntry, isPending: isSyncingProfileEntry } = useSyncProfileEntry()

  /** 切换某条目某字段的隐藏状态 */
  const handleToggleHidden = useCallback((index: number, field: string) => {
    const newItems = [...items]
    newItems[index] = toggleHiddenFieldOnItem(newItems[index] as Record<string, unknown>, field) as Partial<T>
    onChange(newItems)
  }, [items, onChange])
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [selectedIndices, setSelectedIndices] = useState<number[]>([])
  const [syncModalOpen, setSyncModalOpen] = useState(false)
  const [syncItemIndex, setSyncItemIndex] = useState<number | null>(null)
  const [syncMode, setSyncMode] = useState<EntrySyncMode>('create')
  const [syncTargetId, setSyncTargetId] = useState<string | undefined>()

  // 构建已有条目的去重签名集合
  const existingSignatures = useMemo(() => {
    return buildExistingImportSignatures(items, importConfig)
  }, [items, importConfig])

  // 可导入的条目（排除已存在的）
  const availableImportItems = useMemo(() => {
    if (!importItems || !importConfig) return []
    return importItems.map((item, index) => {
      const isDuplicate = isDuplicateImportItem(item, importConfig, existingSignatures)
      return { item, index, isDuplicate }
    })
  }, [importItems, importConfig, existingSignatures])

  const profileTargetOptions = useMemo(() => {
    if (!importItems || !importConfig) return []
    return importItems
      .filter((item) => item.id)
      .map((item) => {
        const subtitle = importConfig.getItemSubtitle?.(item)
        return {
          value: item.id as string,
          label: [
            importConfig.getItemTitle(item),
            subtitle,
          ].filter(Boolean).join(' · '),
        }
      })
  }, [importItems, importConfig])

  const handleAdd = () => {
    onChange([...items, createItem()])
  }

  const handleRemove = (index: number) => {
    onChange(items.filter((_, i) => i !== index))
  }

  const handleChange = (index: number, field: string, val: unknown) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: val }
    onChange(newItems)
  }

  const handleMultiChange = (index: number, updates: Record<string, unknown>) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], ...updates }
    onChange(newItems)
  }

  const handleOpenImport = () => {
    setSelectedIndices([])
    setImportModalOpen(true)
  }

  const findBestProfileTargetId = (item: Partial<T>) => {
    if (!importItems || !importConfig) return undefined
    const signature = normalizeSignature(importConfig.getSignature(item as T))
    if (!signature) return undefined
    return importItems.find((profileItem) =>
      normalizeSignature(importConfig.getSignature(profileItem)) === signature
    )?.id
  }

  const handleOpenSync = (index: number) => {
    const targetId = findBestProfileTargetId(items[index])
    setSyncItemIndex(index)
    setSyncTargetId(targetId)
    setSyncMode(targetId ? 'replace' : 'create')
    setSyncModalOpen(true)
  }

  const handlePullFromProfile = () => {
    if (syncItemIndex === null || !syncTargetId || !importItems) return
    const source = importItems.find((item) => item.id === syncTargetId)
    if (!source) return

    const currentItem = items[syncItemIndex] as Record<string, unknown>
    const nextItem = deepClone(source) as Record<string, unknown>
    const currentId = currentItem.id
    const hiddenFields = currentItem._hidden_fields

    nextItem.id = typeof currentId === 'string' && currentId ? currentId : generateId()
    if (Array.isArray(hiddenFields) && hiddenFields.length > 0) {
      nextItem._hidden_fields = [...hiddenFields]
    } else {
      delete nextItem._hidden_fields
    }

    const nextItems = [...items]
    nextItems[syncItemIndex] = nextItem as Partial<T>
    onChange(nextItems)
    setSyncModalOpen(false)
    setSyncItemIndex(null)
    setSyncTargetId(undefined)
  }

  const handleConfirmSync = async () => {
    if (!profileSyncField || syncItemIndex === null) return
    if (syncMode === 'pull') {
      handlePullFromProfile()
      return
    }
    if (syncMode === 'replace' && !syncTargetId) return

    await syncProfileEntry({
      field: profileSyncField,
      mode: syncMode,
      target_id: syncMode === 'replace' ? syncTargetId : undefined,
      entry: items[syncItemIndex] as Record<string, unknown>,
    })

    setSyncModalOpen(false)
    setSyncItemIndex(null)
    setSyncTargetId(undefined)
  }

  const handleConfirmImport = () => {
    const selected = selectedIndices
      .map((i) => availableImportItems[i])
      .filter(Boolean)
      .filter((entry) => !entry.isDuplicate)

    if (selected.length === 0) {
      setImportModalOpen(false)
      return
    }

    const imported = selected.map(({ item }) => {
      const cloned = deepClone(item)
      cloned.id = generateId()
      // 导入时不带入隐藏字段配置
      delete (cloned as Record<string, unknown>)._hidden_fields
      return cloned
    })

    onChange([...items, ...imported])
    setImportModalOpen(false)
    setSelectedIndices([])
  }

  /** 渲染单个字段 */
  function renderField(field: ModuleFieldConfig, item: Partial<T>, index: number) {
    const GridSpan = getGridSpan(field.span)
    const value = (item as Record<string, unknown>)[field.field]
    const label = field.labelKey ? t(field.labelKey) : field.label
    const placeholder = field.placeholderKey ? t(field.placeholderKey) : field.placeholder

    let input: React.ReactNode

    switch (field.kind) {
      case 'select':
        input = (
          <Select
            value={value as string}
            onChange={(val) => handleChange(index, field.field, val)}
            placeholder={placeholder}
            options={field.options ? field.options.map((option) => ({
              ...option,
              label: 'labelKey' in option && option.labelKey ? t(option.labelKey as string) : option.label,
            })) : []}
            allowClear
          />
        )
        break

      case 'dateRange': {
        // dateRange 字段使用 field 和 field + '_end'（实际是 start_date/end_date）
        const startDate = (item as Record<string, unknown>)[field.field] as string | null | undefined
        const endDateField = field.field === 'start_date' ? 'end_date' : field.field.replace('start_', 'end_')
        const endDate = (item as Record<string, unknown>)[endDateField] as string | null | undefined
        input = (
          <DateRangeField
            startDate={startDate}
            endDate={endDate}
            onChange={(start, end) => handleMultiChange(index, { [field.field]: start, [endDateField]: end })}
            label={label}
          />
        )
        break
      }

      case 'month':
        input = (
          <DatePicker
            picker="month"
            value={value ? dayjs(value as string) : null}
            onChange={(_date, dateString) => handleChange(index, field.field, dateString || '')}
            placeholder={placeholder || t('basicInfo.select')}
            format="YYYY-MM"
            style={{ width: '100%' }}
          />
        )
        break

      case 'richText':
        input = (
          <RichTextEditor
            value={value as DescriptionField}
            onChange={(val) => handleChange(index, field.field, val)}
            placeholder={placeholder}
            minHeight={80}
          />
        )
        break

      default:
        input = (
          <Input
            value={value as string}
            onChange={(e) => handleChange(index, field.field, e.target.value)}
            placeholder={placeholder}
            allowClear
          />
        )
    }

    // dateRange 由 DateRangeField 自带 label，不需要额外 Form.Item 包裹
    if (field.kind === 'dateRange') {
      return <GridSpan key={field.field}>{input}</GridSpan>
    }

    // 构建 label：hideable 字段在 resume 模式下显示隐藏开关
    const hidden = isResumeMode && field.hideable && isFieldHiddenOnItem(item, field.field)
    const labelNode = isResumeMode && field.hideable ? (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {label}
        <Tooltip title={hidden ? '显示此字段' : '隐藏此字段（不删除值）'}>
          <Button
            type="text"
            size="small"
            aria-label={`${hidden ? '显示' : '隐藏'}第 ${index + 1} 项${label}`}
            icon={hidden
              ? <EyeInvisibleOutlined style={{ color: '#999', fontSize: 12 }} />
              : <EyeOutlined style={{ color: '#1677ff', fontSize: 12 }} />}
            onClick={() => handleToggleHidden(index, field.field)}
            style={{ width: 20, height: 20, padding: 0 }}
          />
        </Tooltip>
      </span>
    ) : label

    return (
      <GridSpan key={field.field}>
        <Form.Item label={labelNode}>{input}</Form.Item>
      </GridSpan>
    )
  }

  const showImportButton = importItems && importItems.length > 0 && importConfig

  return (
    <div>
      {items.map((item, index) => (
        <ArrayFormItemCard
          key={item.id || index}
          id={item.id}
          index={index}
          onRemove={() => handleRemove(index)}
          actions={canSyncToProfile && (
            <Tooltip title="同步记录">
              <Button
                type="text"
                aria-label={`同步第 ${index + 1} 项记录`}
                icon={<SyncOutlined />}
                onClick={() => handleOpenSync(index)}
              />
            </Tooltip>
          )}
        >
          <Form layout="vertical">
            <FormGrid>
              {fields.map((field) => renderField(field, item, index))}
            </FormGrid>
          </Form>
        </ArrayFormItemCard>
      ))}

      <Space style={{ width: '100%' }}>
        <AddItemButton text={addText} onClick={handleAdd} />
        {showImportButton && (
          <Button
            type="dashed"
            onClick={handleOpenImport}
            icon={<ImportOutlined />}
            style={{ minWidth: 160 }}
          >
            从个人信息导入
          </Button>
        )}
      </Space>

      {showImportButton && (
        <Modal
          title={importConfig.modalTitle}
          open={importModalOpen}
          onOk={handleConfirmImport}
          onCancel={() => setImportModalOpen(false)}
          okText="导入选中"
          cancelText="取消"
          okButtonProps={{ disabled: selectedIndices.length === 0 }}
          width={520}
        >
          {availableImportItems.length === 0 ? (
            <Empty description={importConfig.emptyText} />
          ) : (
            <Checkbox.Group
              value={selectedIndices}
              onChange={(values) => setSelectedIndices(values as number[])}
              style={{ width: '100%' }}
            >
              <div aria-label={importConfig.modalTitle}>
                {availableImportItems.map(({ item, index, isDuplicate }) => (
                  <div
                    key={index}
                    style={{
                      opacity: isDuplicate ? 0.45 : 1,
                      padding: '8px 0',
                    }}
                  >
                    <Checkbox value={index} disabled={isDuplicate}>
                      <div>
                        <div style={{ fontWeight: 500 }}>
                          {importConfig.getItemTitle(item)}
                        </div>
                        {importConfig.getItemSubtitle && (
                          <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
                            {importConfig.getItemSubtitle(item)}
                          </div>
                        )}
                        {isDuplicate && (
                          <div style={{ fontSize: 12, color: '#faad14', marginTop: 2 }}>
                            已存在
                          </div>
                        )}
                      </div>
                    </Checkbox>
                  </div>
                ))}
              </div>
            </Checkbox.Group>
          )}
        </Modal>
      )}

      {canSyncToProfile && (
        <Modal
          title="同步记录"
          open={syncModalOpen}
          onOk={handleConfirmSync}
          onCancel={() => setSyncModalOpen(false)}
          okText={syncMode === 'pull' ? '更新当前记录' : '同步'}
          cancelText="取消"
          confirmLoading={isSyncingProfileEntry}
          okButtonProps={{
            disabled: (syncMode === 'replace' || syncMode === 'pull') && !syncTargetId,
          }}
        >
          <Radio.Group
            value={syncMode}
            onChange={(event) => setSyncMode(event.target.value as EntrySyncMode)}
            style={{ display: 'grid', gap: 12, width: '100%' }}
          >
            <Radio value="create">新增为个人信息记录</Radio>
            <Radio value="replace" disabled={profileTargetOptions.length === 0}>
              覆盖已有记录
            </Radio>
            <Radio value="pull" disabled={profileTargetOptions.length === 0}>
              从个人信息更新当前记录
            </Radio>
          </Radio.Group>

          {(syncMode === 'replace' || syncMode === 'pull') && (
            <div style={{ marginTop: 12 }}>
              {profileTargetOptions.length === 0 ? (
                <Empty description="个人信息中暂无可用记录" />
              ) : (
                <Select
                  value={syncTargetId}
                  onChange={setSyncTargetId}
                  placeholder={syncMode === 'pull' ? '选择用于更新当前记录的个人信息记录' : '选择要覆盖的个人信息记录'}
                  options={profileTargetOptions}
                  style={{ width: '100%' }}
                  showSearch={{ optionFilterProp: 'label' }}
                />
              )}
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
