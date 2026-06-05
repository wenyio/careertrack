/**
 * 通用数组模块表单组件
 *
 * 根据字段配置自动渲染表单，统一三列布局。
 * 支持 input、select、dateRange、month、richText 字段类型。
 * 支持从个人信息导入已有条目。
 */

'use client'

import { useState, useMemo, useCallback } from 'react'
import { Form, Input, Select, DatePicker, Modal, Checkbox, List, Empty, Button, Space, Tooltip } from 'antd'
import { ImportOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import type { ModuleFieldConfig } from '@/config/module-fields'
import type { ArrayModuleImportConfig } from '@/config/profile-import'
import type { DescriptionField } from '@/types/resume'
import { isFieldHiddenOnItem, toggleHiddenFieldOnItem } from '@/utils/resume-preview'
import RichTextEditor from '@/components/resume/editor/RichTextEditor'
import { ArrayFormItemCard, AddItemButton } from '@/components/common/ArrayFormCard'
import DateRangeField from '@/components/common/DateRangeField'
import { FormGrid, FormGridNormal, FormGridWide, FormGridFull } from '@/components/common/FormGrid'
import { generateId, deepClone } from '@/utils/format'

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
}: ArrayModuleFormProps<T>) {
  const isResumeMode = mode === 'resume'

  /** 切换某条目某字段的隐藏状态 */
  const handleToggleHidden = useCallback((index: number, field: string) => {
    const newItems = [...items]
    newItems[index] = toggleHiddenFieldOnItem(newItems[index] as Record<string, unknown>, field) as Partial<T>
    onChange(newItems)
  }, [items, onChange])
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [selectedIndices, setSelectedIndices] = useState<number[]>([])

  // 构建已有条目的去重签名集合
  const existingSignatures = useMemo(() => {
    if (!importConfig) return new Set<string>()
    const sigs = new Set<string>()
    for (const item of items) {
      if (item.id) sigs.add(item.id)
      sigs.add(importConfig.getSignature(item as T))
    }
    return sigs
  }, [items, importConfig])

  // 可导入的条目（排除已存在的）
  const availableImportItems = useMemo(() => {
    if (!importItems || !importConfig) return []
    return importItems.map((item, index) => {
      const isDuplicate = (item.id && existingSignatures.has(item.id))
        || existingSignatures.has(importConfig.getSignature(item))
      return { item, index, isDuplicate }
    })
  }, [importItems, importConfig, existingSignatures])

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

    let input: React.ReactNode

    switch (field.kind) {
      case 'select':
        input = (
          <Select
            value={value as string}
            onChange={(val) => handleChange(index, field.field, val)}
            placeholder={field.placeholder}
            options={field.options ? [...field.options] : []}
            allowClear
          />
        )
        break

      case 'dateRange': {
        // dateRange 字段使用 field 和 field + '_end'（实际是 start_date/end_date）
        const startDate = (item as Record<string, unknown>)[field.field] as string
        const endDateField = field.field === 'start_date' ? 'end_date' : field.field.replace('start_', 'end_')
        const endDate = (item as Record<string, unknown>)[endDateField] as string
        input = (
          <DateRangeField
            startDate={startDate}
            endDate={endDate}
            onChange={(start, end) => handleMultiChange(index, { [field.field]: start, [endDateField]: end })}
            label={field.label}
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
            placeholder={field.placeholder || '请选择月份'}
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
            placeholder={field.placeholder}
            minHeight={80}
          />
        )
        break

      default:
        input = (
          <Input
            value={value as string}
            onChange={(e) => handleChange(index, field.field, e.target.value)}
            placeholder={field.placeholder}
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
        {field.label}
        <Tooltip title={hidden ? '显示此字段' : '隐藏此字段（不删除值）'}>
          {hidden
            ? <EyeInvisibleOutlined style={{ color: '#999', cursor: 'pointer', fontSize: 12 }} onClick={() => handleToggleHidden(index, field.field)} />
            : <EyeOutlined style={{ color: '#1677ff', cursor: 'pointer', fontSize: 12 }} onClick={() => handleToggleHidden(index, field.field)} />}
        </Tooltip>
      </span>
    ) : field.label

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
              <List
                dataSource={availableImportItems}
                renderItem={({ item, index, isDuplicate }) => (
                  <List.Item
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
                  </List.Item>
                )}
              />
            </Checkbox.Group>
          )}
        </Modal>
      )}
    </div>
  )
}
