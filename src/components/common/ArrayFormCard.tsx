/**
 * 数组表单卡片组件
 *
 * 用于可增删的列表表单场景（教育经历、工作经历等）
 * 统一了卡片样式、删除按钮的交互模式
 */

'use client'

import { Button, Card } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'

interface ArrayFormItemCardProps {
  /** 卡片内容 */
  children: React.ReactNode
  /** 卡片唯一标识（用于 key） */
  id?: string
  /** 索引（用于 key fallback） */
  index: number
  /** 删除回调 */
  onRemove: () => void
}

/**
 * 单个数组项卡片
 *
 * 统一了所有数组类表单的卡片样式和删除按钮
 */
export function ArrayFormItemCard({ children, id, index, onRemove }: ArrayFormItemCardProps) {
  return (
    <Card
      key={id || index}
      style={{ marginBottom: 16 }}
      extra={
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={onRemove}
        />
      }
    >
      {children}
    </Card>
  )
}

interface AddItemButtonProps {
  /** 按钮文本 */
  text: string
  /** 点击回调 */
  onClick: () => void
}

/**
 * 添加按钮
 *
 * 统一了所有数组类表单的添加按钮样式
 */
export function AddItemButton({ text, onClick }: AddItemButtonProps) {
  return (
    <Button type="dashed" onClick={onClick} block icon={<PlusOutlined />}>
      {text}
    </Button>
  )
}
