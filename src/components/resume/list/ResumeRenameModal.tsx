/**
 * 重命名简历弹窗组件
 */

'use client'

import { useState, useEffect } from 'react'
import { Modal, Input, Typography } from 'antd'

const { Text } = Typography

interface ResumeRenameModalProps {
  open: boolean
  resumeId: string | null
  initialName: string
  onOk: (id: string, name: string) => void
  onCancel: () => void
}

export default function ResumeRenameModal({
  open,
  resumeId,
  initialName,
  onOk,
  onCancel,
}: ResumeRenameModalProps) {
  const [name, setName] = useState(initialName)

  // 打开时同步初始名称
  useEffect(() => {
    if (open) {
      setName(initialName)
    }
  }, [open, initialName])

  const handleOk = () => {
    if (resumeId) {
      onOk(resumeId, name)
    }
  }

  const handleCancel = () => {
    onCancel()
  }

  return (
    <Modal
      title="重命名简历"
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="确定"
      cancelText="取消"
      destroyOnHidden
    >
      <div style={{ marginTop: 16 }}>
        <Text style={{ marginBottom: 8, display: 'block' }}>简历名称</Text>
        <Input
          placeholder="请输入新的简历名称"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onPressEnter={handleOk}
          maxLength={50}
        />
      </div>
    </Modal>
  )
}
