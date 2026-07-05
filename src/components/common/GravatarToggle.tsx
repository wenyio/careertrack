/**
 * Gravatar 头像开关组件
 *
 * 复用于简历编辑页和个人信息页。
 * 开启后将邮箱对应的 Gravatar URL 写入 avatar 字段；关闭时清空。
 */

'use client'

import { useState } from 'react'
import { Switch, Tooltip, Space, Avatar, Input, message } from 'antd'
import { QuestionCircleOutlined, UserOutlined } from '@ant-design/icons'
import { getGravatarUrl, isGravatarUrl } from '@/utils/avatar'

const TOOLTIP_CONTENT = (
  <span>
    开启后，系统会使用邮箱对应的 Gravatar 作为头像。
    <br />
    你可以使用
    <a
      href="/settings/avatar-tool"
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: '#91caff', marginLeft: 4 }}
    >
      证件照工具
    </a>
    生成方图，再上传到 Gravatar。
  </span>
)

interface GravatarToggleProps {
  /** 当前头像 URL */
  avatar?: string
  /** 当前邮箱 */
  email?: string
  /** 关闭 Gravatar 时是否显示手动头像链接输入框 */
  showManualInput?: boolean
  /** 头像变更回调 */
  onAvatarChange: (avatar: string) => void
}

export default function GravatarToggle({
  avatar,
  email,
  showManualInput = false,
  onAvatarChange,
}: GravatarToggleProps) {
  const [loading, setLoading] = useState(false)
  const usingGravatar = isGravatarUrl(avatar)

  const handleToggle = async (on: boolean) => {
    if (on) {
      if (!email) return
      setLoading(true)
      try {
        const url = await getGravatarUrl(email)
        if (url) onAvatarChange(url)
      } catch {
        message.warning('当前环境不支持 Gravatar，请使用 HTTPS 访问')
      } finally {
        setLoading(false)
      }
    } else {
      onAvatarChange('')
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', flex: '1 1 360px', flexWrap: 'wrap', gap: 8 }}>
      <Space size={8} align="center">
        <Switch
          size="small"
          checked={usingGravatar}
          loading={loading}
          onChange={handleToggle}
          disabled={!email}
        />
        <span style={{ fontSize: 14 }}>使用 Gravatar 头像</span>
        <Tooltip title={TOOLTIP_CONTENT}>
          <QuestionCircleOutlined style={{ color: '#999', cursor: 'help' }} />
        </Tooltip>
      </Space>
      {showManualInput && !usingGravatar && (
        <Input
          value={avatar}
          onChange={(e) => onAvatarChange(e.target.value)}
          placeholder="请输入头像图片链接"
          allowClear
          style={{ flex: '1 1 260px', minWidth: 220, maxWidth: 420 }}
        />
      )}
      {avatar && (
        <Avatar
          size={24}
          src={avatar}
          icon={<UserOutlined />}
          style={{ flexShrink: 0 }}
        />
      )}
    </div>
  )
}
