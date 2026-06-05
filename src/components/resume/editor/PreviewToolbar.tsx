/**
 * 预览区工具栏子组件
 *
 * 包含：模块工具栏、子条目操作栏、SVG 图标
 */

'use client'

/** SVG 图标 */
export const ChevronUp = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 15 12 9 6 15" />
  </svg>
)
export const ChevronDown = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
)
export const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)
export const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
)

/** 工具栏按钮样式 */
export const toolbarBtnStyle = (enabled = true, color = '#555'): React.CSSProperties => ({
  cursor: enabled ? 'pointer' : 'not-allowed',
  color: enabled ? color : '#ccc',
  padding: '0 2px',
  lineHeight: '18px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 3,
  transition: 'background-color 0.1s',
})

/** 子条目操作栏（上移/下移/删除） */
export function SubItemActions({
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  canMoveUp: boolean
  canMoveDown: boolean
  onMoveUp: (e: React.MouseEvent) => void
  onMoveDown: (e: React.MouseEvent) => void
  onDelete: (e: React.MouseEvent) => void
}) {
  return (
    <div className="preview-subitem-actions" style={{
      position: 'absolute',
      top: -1,
      right: 0,
      display: 'none',
      gap: 1,
      zIndex: 10,
      backgroundColor: '#fff',
      boxShadow: '0 1px 6px rgba(0,0,0,0.1)',
      borderRadius: 6,
      padding: '2px 3px',
      alignItems: 'center',
    }}>
      <span onClick={onMoveUp} style={toolbarBtnStyle(canMoveUp)}><ChevronUp /></span>
      <span onClick={onMoveDown} style={toolbarBtnStyle(canMoveDown)}><ChevronDown /></span>
      <span onClick={onDelete} style={toolbarBtnStyle(true, '#ff4d4f')}><TrashIcon /></span>
    </div>
  )
}

/** 子条目包装（带上下移动和删除） */
export function SubItem({
  index,
  total,
  onMoveUp,
  onMoveDown,
  onDelete,
  children,
}: {
  index: number
  total: number
  onMoveUp: () => void
  onMoveDown: () => void
  onDelete: () => void
  children: React.ReactNode
}) {
  return (
    <div className="preview-subitem" style={{ position: 'relative' }}>
      <SubItemActions
        canMoveUp={index > 0}
        canMoveDown={index < total - 1}
        onMoveUp={(e) => { e.stopPropagation(); onMoveUp() }}
        onMoveDown={(e) => { e.stopPropagation(); onMoveDown() }}
        onDelete={(e) => { e.stopPropagation(); onDelete() }}
      />
      {children}
    </div>
  )
}

/** 模块操作工具栏（添加/删除/上移/下移） */
export function ModuleToolbar({
  canMoveUp,
  canMoveDown,
  showAdd = true,
  onAdd,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  canMoveUp: boolean
  canMoveDown: boolean
  showAdd?: boolean
  onAdd: () => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  return (
    <div className="preview-module-toolbar" style={{
      position: 'absolute',
      top: -2,
      right: 0,
      display: 'none',
      gap: 1,
      zIndex: 10,
      backgroundColor: '#fff',
      boxShadow: '0 1px 6px rgba(0,0,0,0.1)',
      borderRadius: 6,
      padding: '2px 3px',
      alignItems: 'center',
    }}>
      {showAdd && <span onClick={(e) => { e.stopPropagation(); onAdd() }} style={toolbarBtnStyle(true, '#52c41a')}><PlusIcon /></span>}
      <span onClick={(e) => { e.stopPropagation(); onMoveUp() }} style={toolbarBtnStyle(canMoveUp)}><ChevronUp /></span>
      <span onClick={(e) => { e.stopPropagation(); onMoveDown() }} style={toolbarBtnStyle(canMoveDown)}><ChevronDown /></span>
      <span onClick={(e) => { e.stopPropagation(); onDelete() }} style={toolbarBtnStyle(true, '#ff4d4f')}><TrashIcon /></span>
    </div>
  )
}

/** Hover 交互 CSS */
export const previewHoverCSS = `
  section:hover {
    background-color: rgba(0,0,0,0.015) !important;
  }
  section:hover > .preview-module-toolbar {
    display: flex !important;
  }
  .preview-subitem:hover > .preview-subitem-actions {
    display: flex !important;
  }
  .preview-subitem:hover {
    background-color: rgba(0,0,0,0.01);
    border-radius: 2px;
  }
`
