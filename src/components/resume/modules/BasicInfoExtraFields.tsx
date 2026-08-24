/**
 * Config-driven extra fields for BasicInfoForm.
 *
 * This component owns the stable add/hide/icon/input behavior. The parent form
 * remains responsible for combining the updated `other` object with BasicInfo.
 */

'use client'

import { useState } from 'react'
import {
  Button,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Tag,
  Tooltip,
} from 'antd'
import { CloseOutlined, SmileOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import type { BasicInfo, OtherInfo } from '@/types/profile'
import type {
  BasicInfoDisplayConfig,
  BasicInfoExtraField,
} from '@/types/resume'
import {
  BASIC_INFO_EXTRA_FIELDS,
  EXTRA_FIELDS_MAP,
  type BasicInfoExtraFieldConfig,
} from '@/config/basic-info-fields'
import {
  addVisibleBasicInfoField,
  calculateAgeFromBirthday,
  hasBasicInfoExtraValue,
  normalizeWorkYearsInput,
  removeVisibleBasicInfoField,
  toggleBasicInfoFieldIcon,
} from '@/utils/basic-info-display'
import { useI18n } from '@/i18n'

interface BasicInfoExtraFieldsProps {
  value?: BasicInfo['other']
  importValue?: BasicInfo['other']
  displayConfig?: BasicInfoDisplayConfig
  onChange: (value: OtherInfo) => void
  onDisplayConfigChange?: (config: BasicInfoDisplayConfig) => void
}

export default function BasicInfoExtraFields({
  value,
  importValue,
  displayConfig,
  onChange,
  onDisplayConfigChange,
}: BasicInfoExtraFieldsProps) {
  const isProfileMode = !onDisplayConfigChange
  const visibleFields = isProfileMode
    ? BASIC_INFO_EXTRA_FIELDS.map((fieldConfig) => fieldConfig.field)
    : (displayConfig?.visible_extra_fields || [])
  const fieldIcons = displayConfig?.field_icons || {}
  const [workYearsSearch, setWorkYearsSearch] = useState('')
  const { t } = useI18n()

  const getFieldLabel = (fieldConfig: BasicInfoExtraFieldConfig) =>
    fieldConfig.labelKey ? t(fieldConfig.labelKey) : fieldConfig.label

  const getFieldPlaceholder = (fieldConfig: BasicInfoExtraFieldConfig) =>
    fieldConfig.placeholderKey ? t(fieldConfig.placeholderKey) : fieldConfig.placeholder

  const getOptionLabel = (option: { value: string | number; label: string; labelKey?: string }) => {
    if (option.value === 10 && option.labelKey === 'resume.yearsPlus') {
      return t(option.labelKey, { count: option.value })
    }
    return option.labelKey ? t(option.labelKey) : option.label
  }

  const handleFieldChange = (field: BasicInfoExtraField, fieldValue: unknown) => {
    const updates: Partial<OtherInfo> = {
      [field]: fieldValue,
    }

    // Birthday is the source of the convenience age calculation. Invalid or
    // cleared dates leave an explicitly entered age untouched.
    if (field === 'birthday' && typeof fieldValue === 'string' && fieldValue) {
      const age = calculateAgeFromBirthday(fieldValue)
      if (age !== undefined) updates.age = age
    }

    onChange({ ...value, ...updates } as OtherInfo)
  }

  /** Add the field and copy a profile value only when the resume has none. */
  const handleAddField = (field: BasicInfoExtraField) => {
    if (!onDisplayConfigChange) return
    onDisplayConfigChange(addVisibleBasicInfoField(displayConfig, field))

    const currentValue = value?.[field]
    const profileValue = importValue?.[field]
    if (
      !hasBasicInfoExtraValue(field, currentValue)
      && hasBasicInfoExtraValue(field, profileValue)
    ) {
      handleFieldChange(field, profileValue)
    }
  }

  /** Hiding a field intentionally keeps its value for a later re-add. */
  const handleRemoveField = (field: BasicInfoExtraField) => {
    if (!onDisplayConfigChange) return
    onDisplayConfigChange(removeVisibleBasicInfoField(displayConfig, field))
  }

  const handleToggleIcon = (field: BasicInfoExtraField) => {
    if (!onDisplayConfigChange) return
    const fieldConfig = EXTRA_FIELDS_MAP[field]
    if (!fieldConfig?.iconConfigurable) return

    onDisplayConfigChange(toggleBasicInfoFieldIcon(
      displayConfig,
      field,
      fieldConfig.defaultIcon,
    ))
  }

  const commitWorkYearsSearch = () => {
    const normalizedValue = normalizeWorkYearsInput(workYearsSearch)
    if (normalizedValue !== undefined) {
      handleFieldChange('work_years', normalizedValue)
    }
    setWorkYearsSearch('')
  }

  const getWorkYearsOptions = (
    fieldConfig: BasicInfoExtraFieldConfig,
    fieldValue: unknown,
  ) => {
    const options = (fieldConfig.options || [])
      .map((option) => {
        const normalizedValue = normalizeWorkYearsInput(option.value)
        return normalizedValue === undefined
          ? null
          : { value: normalizedValue, label: getOptionLabel(option) }
      })
      .filter(Boolean) as { value: number; label: string }[]

    const ensureOption = (nextValue: number | undefined) => {
      if (
        nextValue !== undefined
        && !options.some((option) => option.value === nextValue)
      ) {
        options.push({
          value: nextValue,
          label: nextValue === 0 ? t('resume.freshGraduate') : t('resume.years', { count: nextValue }),
        })
      }
    }

    ensureOption(normalizeWorkYearsInput(fieldValue))
    ensureOption(normalizeWorkYearsInput(workYearsSearch))

    return options
  }

  const renderFieldInput = (field: BasicInfoExtraField) => {
    const fieldConfig = EXTRA_FIELDS_MAP[field]
    if (!fieldConfig) return null
    const fieldValue = value?.[field]

    if (field === 'work_years') {
      const normalizedValue = normalizeWorkYearsInput(fieldValue)

      return (
        <Select
          value={normalizedValue}
          onChange={(nextValue) => {
            handleFieldChange(field, nextValue)
            setWorkYearsSearch('')
          }}
          onClear={() => {
            handleFieldChange(field, undefined)
            setWorkYearsSearch('')
          }}
          onBlur={commitWorkYearsSearch}
          onInputKeyDown={(event) => {
            if (event.key === 'Enter') commitWorkYearsSearch()
          }}
          placeholder={getFieldPlaceholder(fieldConfig)}
          options={getWorkYearsOptions(fieldConfig, fieldValue)}
          showSearch={{
            onSearch: setWorkYearsSearch,
            optionFilterProp: 'label',
            searchValue: workYearsSearch,
          }}
          allowClear
        />
      )
    }

    switch (fieldConfig.kind) {
      case 'select':
        return (
          <Select
            value={fieldValue as string | number}
            onChange={(nextValue) => handleFieldChange(field, nextValue)}
            placeholder={getFieldPlaceholder(fieldConfig)}
            options={fieldConfig.options ? fieldConfig.options.map((option) => ({
              ...option,
              label: getOptionLabel(option),
            })) : []}
            allowClear
          />
        )
      case 'number':
        return (
          <InputNumber
            value={fieldValue as number}
            onChange={(nextValue) => handleFieldChange(field, nextValue ?? 0)}
            placeholder={getFieldPlaceholder(fieldConfig)}
            min={0}
            style={{ width: '100%' }}
          />
        )
      case 'date':
        return (
          <DatePicker
            value={fieldValue ? dayjs(fieldValue as string) : null}
            onChange={(_date, dateString) =>
              handleFieldChange(field, dateString || '')
            }
            placeholder={getFieldPlaceholder(fieldConfig)}
            style={{ width: '100%' }}
          />
        )
      case 'month':
        return (
          <DatePicker
            picker="month"
            value={fieldValue ? dayjs(fieldValue as string) : null}
            onChange={(_date, dateString) =>
              handleFieldChange(field, dateString || '')
            }
            placeholder={getFieldPlaceholder(fieldConfig) || t('basicInfo.select')}
            format="YYYY-MM"
            style={{ width: '100%' }}
          />
        )
      default:
        return (
          <Input
            value={fieldValue as string}
            onChange={(event) => handleFieldChange(field, event.target.value)}
            placeholder={getFieldPlaceholder(fieldConfig)}
            allowClear
          />
        )
    }
  }

  const availableFields = BASIC_INFO_EXTRA_FIELDS.filter(
    (fieldConfig) => !visibleFields.includes(fieldConfig.field),
  )

  return (
    <>
      {visibleFields.length > 0 && (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          {visibleFields.map((field) => {
            const fieldConfig = EXTRA_FIELDS_MAP[field]
            if (!fieldConfig) return null
            const hasIcon = !!fieldIcons[field]
            const label = getFieldLabel(fieldConfig)

            return (
              <Col key={field} xs={24} sm={12} md={8}>
                <div style={{ position: 'relative' }}>
                  <Form.Item
                    label={
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        {label}
                        {fieldConfig.iconConfigurable
                          && onDisplayConfigChange && (
                          <Tooltip title={hasIcon ? t('basicInfo.hideIcon') : t('basicInfo.showIcon')}>
                            <Button
                              type="text"
                              size="small"
                              icon={<SmileOutlined />}
                              aria-label={
                                hasIcon
                                  ? t('basicInfo.hideFieldIconAria', { label })
                                  : t('basicInfo.showFieldIconAria', { label })
                              }
                              style={{
                                width: 20,
                                height: 20,
                                color: hasIcon ? '#1677ff' : '#bbb',
                                fontSize: 12,
                              }}
                              onClick={(event) => {
                                event.stopPropagation()
                                handleToggleIcon(field)
                              }}
                            />
                          </Tooltip>
                        )}
                      </span>
                    }
                  >
                    {renderFieldInput(field)}
                  </Form.Item>
                  {onDisplayConfigChange && (
                    <Tooltip title={t('basicInfo.removeField')}>
                      <Button
                        type="text"
                        size="small"
                        icon={<CloseOutlined />}
                        aria-label={t('basicInfo.removeFieldAria', { label })}
                        style={{
                          position: 'absolute',
                          top: -6,
                          right: -8,
                          width: 24,
                          height: 24,
                          color: '#999',
                          fontSize: 10,
                        }}
                        onClick={() => handleRemoveField(field)}
                      />
                    </Tooltip>
                  )}
                </div>
              </Col>
            )
          })}
        </Row>
      )}

      {availableFields.length > 0 && onDisplayConfigChange && (
        <div
          style={{
            marginTop: 12,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          {availableFields.map((fieldConfig) => (
            (() => {
              const label = getFieldLabel(fieldConfig)
              return (
            <Tag
              key={fieldConfig.field}
              color="blue"
              role="button"
              tabIndex={0}
              aria-label={t('basicInfo.addFieldAria', { label })}
              style={{ cursor: 'pointer' }}
              onClick={() => handleAddField(fieldConfig.field)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  handleAddField(fieldConfig.field)
                }
              }}
            >
              + {label}
            </Tag>
              )
            })()
          ))}
        </div>
      )}
    </>
  )
}
