/**
 * 通用可排序项组件
 *
 * 使用 @dnd-kit 的 useSortable 实现拖拽排序
 * 可包裹任何内容，使其可拖拽
 */

'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface SortableItemProps {
  id: string
  children: React.ReactNode
  disabled?: boolean
  dragHandle?: boolean
}

export default function SortableItem({
  id,
  children,
  disabled = false,
  dragHandle = true,
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative',
    zIndex: isDragging ? 999 : 'auto',
  }

  if (dragHandle) {
    return (
      <div ref={setNodeRef} style={style} {...attributes}>
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          <div
            {...listeners}
            style={{
              cursor: disabled ? 'default' : 'grab',
              padding: '8px 4px',
              color: '#bbb',
              fontSize: 14,
              userSelect: 'none',
              flexShrink: 0,
              marginTop: 4,
            }}
          >
            ⠿
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
        </div>
      </div>
    )
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  )
}
