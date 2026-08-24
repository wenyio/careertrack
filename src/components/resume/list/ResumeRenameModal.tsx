/**
 * 重命名简历弹窗组件
 */

'use client'

import { useState } from 'react'
import { Modal, Input, Typography } from 'antd'
import { MAX_RESUME_NAME_LENGTH } from '@/constants'
import { useI18n } from '@/i18n'

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
  const { t } = useI18n()
  const [name, setName] = useState(initialName)

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
      title={t('resume.renameTitle')}
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      okText={t('common.confirm')}
      cancelText={t('common.cancel')}
      destroyOnHidden
    >
      <div style={{ marginTop: 16 }}>
        <Text style={{ marginBottom: 8, display: 'block' }}>{t('resume.name')}</Text>
        <Input
          placeholder={t('resume.renamePlaceholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onPressEnter={handleOk}
          maxLength={MAX_RESUME_NAME_LENGTH}
        />
      </div>
    </Modal>
  )
}
