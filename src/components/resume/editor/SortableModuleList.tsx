/**
 * 可排序的模块列表组件
 *
 * 用于模块侧边栏，支持拖拽排序模块顺序
 */

'use client'

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import SortableItem from './SortableItem'
import type { ResumeModuleType, ResumeContent } from '@/types/resume'
import { getModuleIcon } from '@/config/modules'
import { getResolvedModuleTitle } from '@/utils/module-title'
import { Switch } from 'antd'

interface SortableModuleListProps {
  modulesOrder: ResumeModuleType[]
  modulesConfig: Record<ResumeModuleType, boolean>
  activeModule: ResumeModuleType
  content?: ResumeContent
  collapsed?: boolean
  onReorder: (fromIndex: number, toIndex: number) => void
  onToggle: (module: ResumeModuleType, enabled: boolean) => void
  onSelect: (module: ResumeModuleType) => void
}

export default function SortableModuleList({
  modulesOrder,
  modulesConfig,
  activeModule,
  content,
  collapsed = false,
  onReorder,
  onToggle,
  onSelect,
}: SortableModuleListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = modulesOrder.indexOf(active.id as ResumeModuleType)
    const newIndex = modulesOrder.indexOf(over.id as ResumeModuleType)

    if (oldIndex !== -1 && newIndex !== -1) {
      onReorder(oldIndex, newIndex)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={modulesOrder} strategy={verticalListSortingStrategy}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {modulesOrder.map((moduleKey) => {
            const isActive = activeModule === moduleKey
            const isEnabled = modulesConfig[moduleKey]

            return (
              <SortableItem key={moduleKey} id={moduleKey}>
                <div
                  onClick={() => onSelect(moduleKey)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'space-between',
                    padding: collapsed ? '10px 0' : '10px 12px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    backgroundColor: isActive ? '#e6f4ff' : 'transparent',
                    borderLeft: isActive ? '3px solid #1677ff' : '3px solid transparent',
                    transition: 'all 0.15s',
                    opacity: isEnabled ? 1 : 0.5,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = '#f5f5f5'
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: collapsed ? 0 : 8,
                      minWidth: 0,
                    }}
                  >
                    <span style={{ fontSize: 16, flexShrink: 0 }}>
                      {getModuleIcon(moduleKey)}
                    </span>
                    {!collapsed && (
                      <span
                        style={{
                          fontSize: 13,
                          color: isActive ? '#1677ff' : '#333',
                          fontWeight: isActive ? 500 : 400,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {getResolvedModuleTitle(moduleKey, content)}
                      </span>
                    )}
                  </div>
                  {!collapsed && moduleKey !== 'basic_info' && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      style={{ flexShrink: 0 }}
                    >
                      <Switch
                        size="small"
                        checked={isEnabled}
                        onChange={(checked) => onToggle(moduleKey, checked)}
                      />
                    </div>
                  )}
                </div>
              </SortableItem>
            )
          })}
        </div>
      </SortableContext>
    </DndContext>
  )
}
