/**
 * 个人简介表单
 */

'use client'

import { Form, Button, Modal } from 'antd'
import { ImportOutlined } from '@ant-design/icons'
import type { DescriptionField } from '@/types/resume'
import RichTextEditor from '@/components/resume/editor/RichTextEditor'

interface SummaryFormProps {
  value?: DescriptionField
  defaultValue?: string
  onChange: (value: DescriptionField) => void
  /** 个人信息中的简介，用于简历编辑模式下的手动导入 */
  importValue?: string
}

export default function SummaryForm({ value, defaultValue, onChange, importValue }: SummaryFormProps) {
  // 简历编辑模式：importValue 存在且当前无 defaultValue（非 profile 页面）
  const showImportButton = !!importValue && !defaultValue

  const handleImportFromProfile = () => {
    Modal.confirm({
      title: '从个人信息填充',
      content: '这将覆盖当前简历的个人简介内容，确定继续吗？',
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        onChange(importValue as DescriptionField)
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
      <Form.Item label="个人简介">
        <RichTextEditor
          value={value || defaultValue || ''}
          onChange={onChange}
          placeholder="请输入个人简介，概述您的职业经历和目标..."
          minHeight={160}
        />
      </Form.Item>
    </Form>
  )
}
