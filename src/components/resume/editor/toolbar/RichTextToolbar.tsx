/**
 * 富文本编辑器工具栏
 *
 * 负责工具栏分组布局和直接编辑命令；带独立状态的选择器、颜色、链接和对齐
 * 控件位于 RichTextToolbarControls。
 */

'use client'

import { Button, Divider, Modal, Tooltip } from 'antd'
import {
  BoldOutlined,
  ClearOutlined,
  DeleteOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
  ItalicOutlined,
  OrderedListOutlined,
  RedoOutlined,
  UnderlineOutlined,
  UndoOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import { useCallback } from 'react'
import type { Editor } from '@tiptap/react'
import {
  AlignButtons,
  ColorControl,
  FontSizeSelect,
  LineHeightSelect,
  LinkControl,
} from './RichTextToolbarControls'

interface RichTextToolbarProps {
  editor: Editor
  isFullscreen: boolean
  onToggleFullscreen: () => void
  onClearContent: () => void
}

export default function RichTextToolbar({
  editor,
  isFullscreen,
  onToggleFullscreen,
  onClearContent,
}: RichTextToolbarProps) {
  /** 清除选区内样式（保留文本和列表结构） */
  const clearFormatting = useCallback(() => {
    const { state } = editor
    const { from, to } = state.selection

    editor.chain().focus().unsetAllMarks().run()

    const transaction = state.tr
    state.doc.nodesBetween(from, to, (node, position) => {
      if (node.type.name === 'paragraph' || node.type.name === 'listItem') {
        const { textAlign, lineHeight, indent, ...rest } = node.attrs
        if (textAlign || lineHeight || indent) {
          transaction.setNodeMarkup(position, undefined, rest)
        }
      }
    })
    if (transaction.docChanged) {
      editor.view.dispatch(transaction)
    }
  }, [editor])

  return (
    <div
      role="toolbar"
      aria-label="富文本编辑工具"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 1,
        padding: '4px 6px',
        borderBottom: '1px solid #f0f0f0',
        backgroundColor: '#fafafa',
        flexShrink: 0,
      }}
    >
      <Tooltip title="撤回 (Ctrl+Z)">
        <Button
          aria-label="撤回"
          size="small"
          type="text"
          icon={<UndoOutlined />}
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        />
      </Tooltip>
      <Tooltip title="反撤回 (Ctrl+Shift+Z)">
        <Button
          aria-label="反撤回"
          size="small"
          type="text"
          icon={<RedoOutlined />}
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        />
      </Tooltip>

      <Divider orientation="vertical" style={{ margin: '0 2px', height: 18 }} />
      <FontSizeSelect editor={editor} />
      <LineHeightSelect editor={editor} />

      <Divider orientation="vertical" style={{ margin: '0 2px', height: 18 }} />
      <Tooltip title="加粗 (Ctrl+B)">
        <Button
          aria-label="加粗"
          size="small"
          type="text"
          icon={<BoldOutlined />}
          style={editor.isActive('bold')
            ? { color: '#1677ff', backgroundColor: '#e6f4ff' }
            : undefined}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
      </Tooltip>
      <Tooltip title="斜体 (Ctrl+I)">
        <Button
          aria-label="斜体"
          size="small"
          type="text"
          icon={<ItalicOutlined />}
          style={editor.isActive('italic')
            ? { color: '#1677ff', backgroundColor: '#e6f4ff' }
            : undefined}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
      </Tooltip>
      <Tooltip title="下划线 (Ctrl+U)">
        <Button
          aria-label="下划线"
          size="small"
          type="text"
          icon={<UnderlineOutlined />}
          style={editor.isActive('underline')
            ? { color: '#1677ff', backgroundColor: '#e6f4ff' }
            : undefined}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        />
      </Tooltip>

      <Divider orientation="vertical" style={{ margin: '0 2px', height: 18 }} />
      <Tooltip title="无序列表">
        <Button
          aria-label="无序列表"
          size="small"
          type="text"
          icon={<UnorderedListOutlined />}
          style={editor.isActive('bulletList')
            ? { color: '#1677ff', backgroundColor: '#e6f4ff' }
            : undefined}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
      </Tooltip>
      <Tooltip title="有序列表">
        <Button
          aria-label="有序列表"
          size="small"
          type="text"
          icon={<OrderedListOutlined />}
          style={editor.isActive('orderedList')
            ? { color: '#1677ff', backgroundColor: '#e6f4ff' }
            : undefined}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
      </Tooltip>

      <Divider orientation="vertical" style={{ margin: '0 2px', height: 18 }} />
      <LinkControl editor={editor} />

      <Divider orientation="vertical" style={{ margin: '0 2px', height: 18 }} />
      <ColorControl editor={editor} />

      <Divider orientation="vertical" style={{ margin: '0 2px', height: 18 }} />
      <AlignButtons editor={editor} />

      <Divider orientation="vertical" style={{ margin: '0 2px', height: 18 }} />
      <Tooltip title="增加缩进">
        <Button
          aria-label="增加缩进"
          size="small"
          type="text"
          style={{ fontSize: 12, fontWeight: 500 }}
          onClick={() => {
            if (editor.isActive('listItem')) {
              editor.chain().focus().sinkListItem('listItem').run()
              return
            }
            const node = editor.state.selection.$from.node()
            const current = (node?.attrs.indent as number) || 0
            if (node && current < 8) {
              editor.chain().focus()
                .updateAttributes(node.type.name, { indent: current + 1 })
                .run()
            }
          }}
        >
          →|
        </Button>
      </Tooltip>
      <Tooltip title="减少缩进">
        <Button
          aria-label="减少缩进"
          size="small"
          type="text"
          style={{ fontSize: 12, fontWeight: 500 }}
          onClick={() => {
            if (editor.isActive('listItem')) {
              editor.chain().focus().liftListItem('listItem').run()
              return
            }
            const node = editor.state.selection.$from.node()
            const current = (node?.attrs.indent as number) || 0
            if (node && current > 0) {
              editor.chain().focus()
                .updateAttributes(node.type.name, { indent: current - 1 })
                .run()
            }
          }}
        >
          |←
        </Button>
      </Tooltip>

      <div style={{ flex: 1 }} />

      <Tooltip title="清除样式（保留文本）">
        <Button
          aria-label="清除样式"
          size="small"
          type="text"
          icon={<ClearOutlined />}
          onClick={clearFormatting}
        />
      </Tooltip>
      <Tooltip title={isFullscreen ? '退出全屏' : '全屏编辑'}>
        <Button
          aria-label={isFullscreen ? '退出全屏编辑' : '全屏编辑'}
          size="small"
          type="text"
          icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
          onClick={onToggleFullscreen}
        />
      </Tooltip>
      <Tooltip title="清空内容">
        <Button
          aria-label="清空富文本内容"
          size="small"
          type="text"
          icon={<DeleteOutlined />}
          danger
          onClick={() => {
            Modal.confirm({
              title: '确认清空',
              content: '将删除全部内容，此操作不可撤销。',
              okText: '清空',
              okType: 'danger',
              cancelText: '取消',
              onOk: onClearContent,
            })
          }}
        />
      </Tooltip>
    </div>
  )
}
