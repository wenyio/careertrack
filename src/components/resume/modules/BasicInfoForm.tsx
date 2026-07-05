/**
 * 基本信息表单
 *
 * 默认显示姓名、电话、邮箱、头像、求职意向。
 * 额外字段通过"更多"标签手动添加，支持删除和图标配置。
 */

'use client'

import { Form, Input, InputNumber, Select, Card, Row, Col, Tag, Button, Tooltip, DatePicker, Modal, Switch } from 'antd'
import { CloseOutlined, SmileOutlined, ImportOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import type { BasicInfo } from '@/types/profile'
import type { BasicInfoDisplayConfig, BasicInfoExtraField } from '@/types/resume'
import GravatarToggle from '@/components/common/GravatarToggle'
import {
  CURRENT_STATUS_OPTIONS,
  SALARY_OPTIONS,
} from '@/constants'
import { BASIC_INFO_EXTRA_FIELDS, EXTRA_FIELDS_MAP } from '@/config/basic-info-fields'

interface BasicInfoFormProps {
  value?: Partial<BasicInfo>
  defaultValue?: BasicInfo
  onChange: (value: Partial<BasicInfo>) => void
  /** 基本信息展示配置 */
  displayConfig?: BasicInfoDisplayConfig
  /** 展示配置变更 */
  onDisplayConfigChange?: (config: BasicInfoDisplayConfig) => void
  /** 个人信息数据，用于简历编辑模式下的手动导入 */
  importValue?: BasicInfo
}

export default function BasicInfoForm({
  value,
  defaultValue,
  onChange,
  displayConfig,
  onDisplayConfigChange,
  importValue,
}: BasicInfoFormProps) {
  // profile 页面（无 onDisplayConfigChange）合并 defaultValue；简历编辑模式只用 value
  const isProfileMode = !onDisplayConfigChange
  const showImportButton = !isProfileMode && !!importValue

  const handleImportFromProfile = () => {
    Modal.confirm({
      title: '从个人信息填充',
      content: '这将覆盖当前简历的基本信息内容，确定继续吗？',
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        onChange(structuredClone(importValue) as Partial<BasicInfo>)
      },
    })
  }
  const data = isProfileMode ? { ...defaultValue, ...value } : (value || {})
  const visibleExtraFields = isProfileMode
    ? BASIC_INFO_EXTRA_FIELDS.map((f) => f.field)
    : (displayConfig?.visible_extra_fields || [])
  const fieldIcons = displayConfig?.field_icons || {}

  const handleChange = (field: string, val: unknown) => {
    onChange({ ...data, [field]: val })
  }

  const handleNestedChange = (parent: string, field: string, val: unknown) => {
    const parentObj = (data as Record<string, Record<string, unknown>>)?.[parent] || {}
    const updates: Record<string, unknown> = { [field]: val }

    // 生日变更时自动计算年龄
    if (parent === 'other' && field === 'birthday' && typeof val === 'string' && val) {
      const birth = dayjs(val)
      if (birth.isValid()) {
        const now = dayjs()
        let age = now.year() - birth.year()
        if (now.month() < birth.month() || (now.month() === birth.month() && now.date() < birth.date())) {
          age--
        }
        if (age >= 0 && age < 150) {
          updates.age = age
        }
      }
    }

    onChange({
      ...data,
      [parent]: { ...parentObj, ...updates },
    })
  }

  /** 添加额外字段（隐藏不删值，添加时可按需从 profile 拷贝一次） */
  const handleAddExtraField = (field: BasicInfoExtraField) => {
    if (!onDisplayConfigChange) return
    const newConfig: BasicInfoDisplayConfig = {
      ...displayConfig,
      visible_extra_fields: [...visibleExtraFields, field],
    }
    onDisplayConfigChange(newConfig)

    // 如果当前简历没有该字段值，但 importValue 有，则拷贝一次
    const currentValue = (data?.other as unknown as Record<string, unknown>)?.[field]
    const hasValue = currentValue !== undefined && currentValue !== null && currentValue !== ''
      && !(field === 'age' && currentValue === 0) // age=0 视为无值
    if (!hasValue && importValue?.other) {
      const profileValue = (importValue.other as unknown as Record<string, unknown>)[field]
      const profileHasValue = profileValue !== undefined && profileValue !== null && profileValue !== ''
        && !(typeof profileValue === 'number' && profileValue === 0 && field === 'age')
      if (profileHasValue) {
        const other = { ...(data?.other || {}) } as Record<string, unknown>
        other[field] = profileValue
        onChange({ ...data, other: other as unknown as BasicInfo['other'] })
      }
    }
  }

  /** 叉掉额外字段（只隐藏，不清空值） */
  const handleRemoveExtraField = (field: BasicInfoExtraField) => {
    if (!onDisplayConfigChange) return
    const newConfig: BasicInfoDisplayConfig = {
      visible_extra_fields: visibleExtraFields.filter((f) => f !== field),
      field_icons: displayConfig?.field_icons,
    }
    onDisplayConfigChange(newConfig)
    // 不清空 data.other[field]，保留值以便再次添加时恢复
  }

  /** 切换字段图标 */
  const handleToggleIcon = (field: string) => {
    if (!onDisplayConfigChange) return
    const config = EXTRA_FIELDS_MAP[field as BasicInfoExtraField]
    if (!config?.iconConfigurable) return

    const currentIcon = fieldIcons[field as keyof typeof fieldIcons]
    const newIcons = { ...fieldIcons }

    if (currentIcon) {
      delete newIcons[field as keyof typeof newIcons]
    } else {
      newIcons[field as keyof typeof newIcons] = config.defaultIcon
    }

    onDisplayConfigChange({
      visible_extra_fields: displayConfig?.visible_extra_fields || [],
      ...displayConfig,
      field_icons: newIcons,
    })
  }

  /** 渲染额外字段输入控件 */
  function renderExtraFieldInput(field: BasicInfoExtraField) {
    const config = EXTRA_FIELDS_MAP[field]
    if (!config) return null

    const otherValue = (data as Record<string, Record<string, unknown>>)?.other?.[field]

    switch (config.kind) {
      case 'select':
        return (
          <Select
            value={otherValue as string | number}
            onChange={(val) => handleNestedChange('other', field, val)}
            placeholder={config.placeholder}
            options={config.options ? [...config.options] : []}
            allowClear
          />
        )
      case 'number':
        return (
          <InputNumber
            value={otherValue as number}
            onChange={(val) => handleNestedChange('other', field, val ?? 0)}
            placeholder={config.placeholder}
            min={0}
            style={{ width: '100%' }}
          />
        )
      case 'date':
        return (
          <DatePicker
            value={otherValue ? dayjs(otherValue as string) : null}
            onChange={(_date, dateString) => handleNestedChange('other', field, dateString || '')}
            placeholder={config.placeholder}
            style={{ width: '100%' }}
          />
        )
      case 'month':
        return (
          <DatePicker
            picker="month"
            value={otherValue ? dayjs(otherValue as string) : null}
            onChange={(_date, dateString) => handleNestedChange('other', field, dateString || '')}
            placeholder={config.placeholder || '请选择月份'}
            format="YYYY-MM"
            style={{ width: '100%' }}
          />
        )
      default:
        return (
          <Input
            value={otherValue as string}
            onChange={(e) => handleNestedChange('other', field, e.target.value)}
            placeholder={config.placeholder}
            allowClear
          />
        )
    }
  }

  /** 未添加的额外字段列表 */
  const availableExtraFields = BASIC_INFO_EXTRA_FIELDS.filter(
    (f) => !visibleExtraFields.includes(f.field),
  )

  return (
    <Form layout="vertical">
      {showImportButton && (
        <Button
          type="dashed"
          icon={<ImportOutlined />}
          onClick={handleImportFromProfile}
          style={{ marginBottom: 16, width: '100%' }}
        >
          从个人信息填充
        </Button>
      )}
      <Card title="基本信息" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Form.Item label="姓名">
              <Input
                value={data?.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="请输入姓名"
                allowClear
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Form.Item label="电话">
              <Input
                value={data?.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="请输入电话"
                allowClear
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Form.Item label="邮箱">
              <Input
                value={data?.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="请输入邮箱"
                allowClear
              />
            </Form.Item>
          </Col>
        </Row>
        <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <GravatarToggle
            avatar={data?.avatar}
            email={data?.email}
            showManualInput={!isProfileMode}
            onAvatarChange={(url) => handleChange('avatar', url)}
          />
          {onDisplayConfigChange && (
            <Tooltip title="开启后头像显示在姓名左侧（仅 classic / minimal / black-white 模板）">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#666' }}>
                头像靠左
                <Switch
                  size="small"
                  checked={displayConfig?.avatar_left ?? false}
                  onChange={(checked) =>
                    onDisplayConfigChange({
                      ...displayConfig,
                      visible_extra_fields: displayConfig?.visible_extra_fields || [],
                      avatar_left: checked,
                    })
                  }
                />
              </span>
            </Tooltip>
          )}
        </div>

        {/* 已添加的额外字段 */}
        {visibleExtraFields.length > 0 && (
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            {visibleExtraFields.map((field) => {
              const config = EXTRA_FIELDS_MAP[field]
              if (!config) return null
              const hasIcon = !!fieldIcons[field]

              return (
                <Col key={field} xs={24} sm={12} md={8}>
                  <div style={{ position: 'relative' }}>
                    <Form.Item
                      label={
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          {config.label}
                          {config.iconConfigurable && onDisplayConfigChange && (
                            <Tooltip title={hasIcon ? '隐藏图标' : '显示图标'}>
                              <SmileOutlined
                                style={{
                                  cursor: 'pointer',
                                  color: hasIcon ? '#1677ff' : '#bbb',
                                  fontSize: 12,
                                }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleToggleIcon(field)
                                }}
                              />
                            </Tooltip>
                          )}
                        </span>
                      }
                    >
                      {renderExtraFieldInput(field)}
                    </Form.Item>
                    {onDisplayConfigChange && (
                      <Tooltip title="移除此字段">
                        <CloseOutlined
                          style={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            color: '#999',
                            cursor: 'pointer',
                            fontSize: 10,
                          }}
                          onClick={() => handleRemoveExtraField(field)}
                        />
                      </Tooltip>
                    )}
                  </div>
                </Col>
              )
            })}
          </Row>
        )}

        {/* 更多字段入口 */}
        {availableExtraFields.length > 0 && onDisplayConfigChange && (
          <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {availableExtraFields.map((config) => (
              <Tag
                key={config.field}
                color="blue"
                style={{ cursor: 'pointer' }}
                onClick={() => handleAddExtraField(config.field)}
              >
                + {config.label}
              </Tag>
            ))}
          </div>
        )}
      </Card>

      <Card title="求职意向" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Form.Item label="当前状态">
              <Select
                value={data?.job_intention?.current_status}
                onChange={(val) => handleNestedChange('job_intention', 'current_status', val)}
                placeholder="请选择"
                options={[...CURRENT_STATUS_OPTIONS]}
                allowClear
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Form.Item label="期望职位">
              <Input
                value={data?.job_intention?.position}
                onChange={(e) => handleNestedChange('job_intention', 'position', e.target.value)}
                placeholder="请输入期望职位"
                allowClear
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Form.Item label="期望工作地">
              <Input
                value={data?.job_intention?.expected_city}
                onChange={(e) => handleNestedChange('job_intention', 'expected_city', e.target.value)}
                placeholder="请输入期望工作地"
                allowClear
              />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Form.Item label="期望薪资">
              <Select
                value={data?.job_intention?.expected_salary}
                onChange={(val) => handleNestedChange('job_intention', 'expected_salary', val)}
                placeholder="请选择"
                options={[...SALARY_OPTIONS]}
                allowClear
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>
    </Form>
  )
}
