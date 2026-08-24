/**
 * 通用可排序项组件
 *
 * 使用 @dnd-kit 的 useSortable 实现拖拽排序
 * 可包裹任何内容，使其可拖拽
 */

'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useI18n } from '@/i18n'

interface SortableItemProps {
  id: string
  label?: string
  children: React.ReactNode
  disabled?: boolean
  dragHandle?: boolean
}

export default function SortableItem({
  id,
  label = id,
  children,
  disabled = false,
  dragHandle = true,
}: SortableItemProps) {
  const { t } = useI18n()
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
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
      <div ref={setNodeRef} style={style}>
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={t('resumeEditor.dragModuleSortAria', { title: label })}
            style={{
              cursor: disabled ? 'default' : 'grab',
              padding: '8px 4px',
              color: '#bbb',
              fontSize: 14,
              userSelect: 'none',
              flexShrink: 0,
              marginTop: 4,
              border: 0,
              background: 'transparent',
            }}
          >
            ⠿
          </button>
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
