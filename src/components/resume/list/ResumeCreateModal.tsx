/**
 * 创建简历弹窗组件
 *
 * 正式用户显示"从个人信息初始化简历"选项，游客不显示。
 */

'use client'

import { useState } from 'react'
import { Modal, Input, Checkbox, Typography } from 'antd'
import { MAX_RESUME_NAME_LENGTH } from '@/constants'

const { Text } = Typography

interface ResumeCreateModalProps {
  open: boolean
  confirmLoading?: boolean
  showInitFromProfile: boolean
  onOk: (name: string, initFromProfile: boolean) => void
  onCancel: () => void
}

export default function ResumeCreateModal({
  open,
  confirmLoading,
  showInitFromProfile,
  onOk,
  onCancel,
}: ResumeCreateModalProps) {
  const [name, setName] = useState('')
  const [initFromProfile, setInitFromProfile] = useState(true)

  const handleOk = () => {
    onOk(name, initFromProfile)
  }

  const handleCancel = () => {
    onCancel()
  }

  return (
    <Modal
      title="新建简历"
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={confirmLoading}
      okText="创建"
      cancelText="取消"
      destroyOnHidden
    >
      <div style={{ marginTop: 16 }}>
        <Text style={{ marginBottom: 8, display: 'block' }}>简历名称</Text>
        <Input
          placeholder="例如：前端工程师简历、产品经理简历"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onPressEnter={handleOk}
          maxLength={MAX_RESUME_NAME_LENGTH}
        />
        {showInitFromProfile && (
          <Checkbox
            checked={initFromProfile}
            onChange={(e) => setInitFromProfile(e.target.checked)}
            style={{ marginTop: 12 }}
          >
            从个人信息初始化简历
          </Checkbox>
        )}
      </div>
    </Modal>
  )
}
