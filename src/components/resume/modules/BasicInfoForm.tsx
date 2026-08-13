/**
 * 基本信息表单
 *
 * 默认显示姓名、电话、邮箱、头像、求职意向。
 * 额外字段通过"更多"标签手动添加，支持删除和图标配置。
 */

'use client'

import {
  AutoComplete,
  Button,
  Card,
  Col,
  Form,
  Input,
  Modal,
  Row,
  Switch,
  Tooltip,
} from 'antd'
import { ImportOutlined } from '@ant-design/icons'
import type { BasicInfo } from '@/types/profile'
import type { BasicInfoDisplayConfig } from '@/types/resume'
import GravatarToggle from '@/components/common/GravatarToggle'
import BasicInfoExtraFields from './BasicInfoExtraFields'
import {
  CURRENT_STATUS_OPTIONS,
  SALARY_OPTIONS,
} from '@/constants'

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

  const handleChange = (
    field: 'name' | 'phone' | 'email' | 'avatar',
    val: string,
  ) => {
    onChange({ ...data, [field]: val })
  }

  const handleJobIntentionChange = (
    field: keyof BasicInfo['job_intention'],
    val: string | undefined,
  ) => {
    const currentJobIntention: BasicInfo['job_intention'] = {
      current_status: '',
      position: '',
      expected_city: '',
      expected_salary: '',
      ...data.job_intention,
    }

    onChange({
      ...data,
      job_intention: {
        ...currentJobIntention,
        [field]: val || '',
      },
    })
  }

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
            showManualInput
            onAvatarChange={(url) => handleChange('avatar', url)}
          />
          {onDisplayConfigChange && (
            <Tooltip title="开启后头像显示在姓名左侧（仅 classic / minimal / black-white 模板）">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#666' }}>
                头像靠左
                <Switch
                  size="small"
                  aria-label="头像靠左"
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

        <BasicInfoExtraFields
          value={data.other}
          importValue={importValue?.other}
          displayConfig={displayConfig}
          onChange={(other) => onChange({ ...data, other })}
          onDisplayConfigChange={onDisplayConfigChange}
        />
      </Card>

      <Card title="求职意向" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Form.Item label="当前状态">
              <AutoComplete
                value={data?.job_intention?.current_status}
                onChange={(val) =>
                  handleJobIntentionChange('current_status', val)
                }
                placeholder="请选择或输入当前状态"
                options={[...CURRENT_STATUS_OPTIONS]}
                allowClear
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Form.Item label="期望职位">
              <Input
                value={data?.job_intention?.position}
                onChange={(e) =>
                  handleJobIntentionChange('position', e.target.value)
                }
                placeholder="请输入期望职位"
                allowClear
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Form.Item label="期望工作地">
              <Input
                value={data?.job_intention?.expected_city}
                onChange={(e) =>
                  handleJobIntentionChange('expected_city', e.target.value)
                }
                placeholder="请输入期望工作地"
                allowClear
              />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Form.Item label="期望薪资">
              <AutoComplete
                value={data?.job_intention?.expected_salary}
                onChange={(val) =>
                  handleJobIntentionChange('expected_salary', val)
                }
                placeholder="请选择或输入期望薪资"
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
