/**
 * 富文本编辑器工具栏
 *
 * 使用 Ant Design 组件重构，提供紧凑、可维护的工具栏 UI
 */

'use client'

import { Button, Tooltip, Select, Popover, ColorPicker, Space, Divider, Modal, Input } from 'antd'
import {
  UndoOutlined,
  RedoOutlined,
  BoldOutlined,
  ItalicOutlined,
  UnderlineOutlined,
  UnorderedListOutlined,
  OrderedListOutlined,
  LinkOutlined,
  AlignLeftOutlined,
  AlignCenterOutlined,
  AlignRightOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  ClearOutlined,
  DeleteOutlined,
  FontColorsOutlined,
} from '@ant-design/icons'
import { useCallback, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { isSafeUrl } from '@/utils/rich-text'

// ============ 常量 ============

const FONT_SIZES = ['12px', '13px', '14px', '15px', '16px', '18px', '20px', '24px', '28px', '32px']
const LINE_HEIGHTS = ['1', '1.15', '1.5', '1.75', '2', '2.5', '3']
const COLORS = [
  '#000000', '#333333', '#666666', '#999999',
  '#e02020', '#e67e22', '#f6b93b', '#27ae60',
  '#2980b9', '#8e44ad', '#1677ff', '#eb2f96',
]

// ============ 子组件 ============

/** 字号选择器 */
function FontSizeSelect({ editor }: { editor: Editor }) {
  const currentSize = editor.getAttributes('textStyle').fontSize as string | undefined

  return (
    <Tooltip title="字号">
      <Select
        value={currentSize || undefined}
        placeholder="字号"
        style={{ width: 72, fontSize: 12 }}
        size="small"
        variant="borderless"
        popupMatchSelectWidth={false}
        onChange={(val: string) => {
          if (val) {
            editor.chain().focus().setFontSize(val).run()
          } else {
            editor.chain().focus().unsetFontSize().run()
          }
        }}
        allowClear
        options={FONT_SIZES.map((s) => ({
          value: s,
          label: s,
        }))}
      />
    </Tooltip>
  )
}

/** 行高选择器 */
function LineHeightSelect({ editor }: { editor: Editor }) {
  // 行高存储在 paragraph/listItem 的 attrs.lineHeight 中
  const currentLH =
    editor.getAttributes('paragraph').lineHeight
    || editor.getAttributes('listItem').lineHeight
    || undefined

  return (
    <Tooltip title="行高">
      <Select
        value={currentLH || undefined}
        placeholder="行高"
        style={{ width: 68, fontSize: 12 }}
        size="small"
        variant="borderless"
        popupMatchSelectWidth={false}
        onChange={(val: string) => {
          if (val) {
            editor.chain().focus().setLineHeight(val).run()
          } else {
            editor.chain().focus().unsetLineHeight().run()
          }
        }}
        allowClear
        options={LINE_HEIGHTS.map((lh) => ({
          value: lh,
          label: lh,
        }))}
      />
    </Tooltip>
  )
}

/** 颜色控制 */
function ColorControl({ editor }: { editor: Editor }) {
  const currentColor = (editor.getAttributes('textStyle').color as string) || '#000000'

  return (
    <Tooltip title="字体颜色">
      <Popover
        trigger="click"
        placement="bottomLeft"
        arrow={false}
        content={
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, width: 160 }}>
            {COLORS.map((color) => (
              <button
                key={color}
                type="button"
                title={color}
                aria-label={`颜色 ${color}`}
                onClick={() => {
                  editor.chain().focus().setColor(color).run()
                }}
                style={{
                  width: 22,
                  height: 22,
                  backgroundColor: color,
                  border: currentColor === color ? '2px solid #1677ff' : '1px solid #e0e0e0',
                  borderRadius: 3,
                  cursor: 'pointer',
                  padding: 0,
                }}
              />
            ))}
            <ColorPicker
              size="small"
              value={currentColor}
              onChange={(_, hex) => {
                editor.chain().focus().setColor(hex).run()
              }}
            />
            <button
              type="button"
              title="清除颜色"
              aria-label="清除颜色"
              onClick={() => {
                editor.chain().focus().unsetColor().run()
              }}
              style={{
                width: 22,
                height: 22,
                border: '1px solid #e0e0e0',
                borderRadius: 3,
                cursor: 'pointer',
                padding: 0,
                fontSize: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#999',
                backgroundColor: '#fff',
              }}
            >
              ✕
            </button>
          </div>
        }
      >
        <Button
          size="small"
          type="text"
          icon={<FontColorsOutlined />}
          style={{ color: currentColor !== '#000000' ? currentColor : undefined }}
        />
      </Popover>
    </Tooltip>
  )
}

/** 链接控制 */
function LinkControl({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')

  const handleConfirm = useCallback(() => {
    if (!url.trim()) {
      editor.chain().focus().unsetLink().run()
    } else {
      let finalUrl = url.trim()
      if (!/^https?:\/\//i.test(finalUrl) && !finalUrl.startsWith('mailto:') && !finalUrl.startsWith('tel:')) {
        finalUrl = 'https://' + finalUrl
      }
      if (!isSafeUrl(finalUrl)) {
        Modal.warning({ title: '不允许的链接协议', content: '仅支持 http、https、mailto、tel 协议' })
        return
      }
      editor.chain().focus().extendMarkRange('link').setLink({ href: finalUrl }).run()
    }
    setOpen(false)
    setUrl('')
  }, [editor, url])

  return (
    <Space size={0}>
      <Popover
        open={open}
        onOpenChange={setOpen}
        trigger="click"
        placement="bottomLeft"
        arrow={false}
        content={
          <Space.Compact style={{ width: 260 }}>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              size="small"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); handleConfirm() }
                if (e.key === 'Escape') { setOpen(false); setUrl('') }
              }}
            />
            <Button size="small" type="primary" onClick={handleConfirm}>确定</Button>
          </Space.Compact>
        }
      >
        <Tooltip title="插入/编辑链接">
          <Button
            size="small"
            type="text"
            icon={<LinkOutlined />}
            style={editor.isActive('link') ? { color: '#1677ff', backgroundColor: '#e6f4ff' } : undefined}
          />
        </Tooltip>
      </Popover>
      <Tooltip title="取消链接">
        <Button
          size="small"
          type="text"
          disabled={!editor.isActive('link')}
          onClick={() => editor.chain().focus().unsetLink().run()}
          style={{ fontSize: 11 }}
        >
          ✕
        </Button>
      </Tooltip>
    </Space>
  )
}

/** 两端对齐图标（antd 无内置，自定义匹配风格） */
function AlignJustifyIcon() {
  return (
    <span role="img" aria-label="align-center" className="anticon anticon-align-justify">
      <svg
        viewBox="0 0 1024 1024"
        width="1em"
        height="1em"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M128 192h768a42.67 42.67 0 0 0 0-85.33H128a42.67 42.67 0 1 0 0 85.33zm768 213.33H128a42.67 42.67 0 0 0 0 85.34h768a42.67 42.67 0 0 0 0-85.34zM128 618.67h768a42.67 42.67 0 0 0 0-85.34H128a42.67 42.67 0 1 0 0 85.34zm768 213.33H128a42.67 42.67 0 0 0 0 85.33h768a42.67 42.67 0 0 0 0-85.33z" />
      </svg>
    </span>
  )
}

/** 对齐按钮组 */
function AlignButtons({ editor }: { editor: Editor }) {
  const aligns = [
    { value: 'left', icon: <AlignLeftOutlined />, title: '左对齐' },
    { value: 'center', icon: <AlignCenterOutlined />, title: '居中' },
    { value: 'right', icon: <AlignRightOutlined />, title: '右对齐' },
    { value: 'justify', icon: <AlignJustifyIcon />, title: '两端对齐' },
  ] as const

  return (
    <Space size={0}>
      {aligns.map(({ value, icon, title }) => (
        <Tooltip key={value} title={title}>
          <Button
            size="small"
            type="text"
            icon={icon}
            style={editor.isActive({ textAlign: value }) ? { color: '#1677ff', backgroundColor: '#e6f4ff' } : undefined}
            onClick={() => editor.chain().focus().setTextAlign(value).run()}
          />
        </Tooltip>
      ))}
    </Space>
  )
}

// ============ 主组件 ============

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

    // 清除选区内的 marks
    editor.chain().focus().unsetAllMarks().run()

    // 清除选区内段落/列表项的样式属性
    const tr = state.tr
    state.doc.nodesBetween(from, to, (node, pos) => {
      if (node.type.name === 'paragraph' || node.type.name === 'listItem') {
        const { textAlign, lineHeight, indent, ...rest } = node.attrs
        // 只清除存在的样式属性
        if (textAlign || lineHeight || indent) {
          tr.setNodeMarkup(pos, undefined, rest)
        }
      }
    })
    if (tr.docChanged) {
      editor.view.dispatch(tr)
    }
  }, [editor])

  return (
    <div
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
      {/* 撤回/反撤回 */}
      <Tooltip title="撤回 (Ctrl+Z)">
        <Button size="small" type="text" icon={<UndoOutlined />} disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()} />
      </Tooltip>
      <Tooltip title="反撤回 (Ctrl+Shift+Z)">
        <Button size="small" type="text" icon={<RedoOutlined />} disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()} />
      </Tooltip>

      <Divider orientation="vertical" style={{ margin: '0 2px', height: 18 }} />

      {/* 字号、行高 */}
      <FontSizeSelect editor={editor} />
      <LineHeightSelect editor={editor} />

      <Divider orientation="vertical" style={{ margin: '0 2px', height: 18 }} />

      {/* 加粗、斜体、下划线 */}
      <Tooltip title="加粗 (Ctrl+B)">
        <Button
          size="small"
          type="text"
          icon={<BoldOutlined />}
          style={editor.isActive('bold') ? { color: '#1677ff', backgroundColor: '#e6f4ff' } : undefined}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
      </Tooltip>
      <Tooltip title="斜体 (Ctrl+I)">
        <Button
          size="small"
          type="text"
          icon={<ItalicOutlined />}
          style={editor.isActive('italic') ? { color: '#1677ff', backgroundColor: '#e6f4ff' } : undefined}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
      </Tooltip>
      <Tooltip title="下划线 (Ctrl+U)">
        <Button
          size="small"
          type="text"
          icon={<UnderlineOutlined />}
          style={editor.isActive('underline') ? { color: '#1677ff', backgroundColor: '#e6f4ff' } : undefined}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        />
      </Tooltip>

      <Divider orientation="vertical" style={{ margin: '0 2px', height: 18 }} />

      {/* 列表 */}
      <Tooltip title="无序列表">
        <Button
          size="small"
          type="text"
          icon={<UnorderedListOutlined />}
          style={editor.isActive('bulletList') ? { color: '#1677ff', backgroundColor: '#e6f4ff' } : undefined}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
      </Tooltip>
      <Tooltip title="有序列表">
        <Button
          size="small"
          type="text"
          icon={<OrderedListOutlined />}
          style={editor.isActive('orderedList') ? { color: '#1677ff', backgroundColor: '#e6f4ff' } : undefined}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
      </Tooltip>

      <Divider orientation="vertical" style={{ margin: '0 2px', height: 18 }} />

      {/* 链接 */}
      <LinkControl editor={editor} />

      <Divider orientation="vertical" style={{ margin: '0 2px', height: 18 }} />

      {/* 字体颜色 */}
      <ColorControl editor={editor} />

      <Divider orientation="vertical" style={{ margin: '0 2px', height: 18 }} />

      {/* 对齐 */}
      <AlignButtons editor={editor} />

      <Divider orientation="vertical" style={{ margin: '0 2px', height: 18 }} />

      {/* 缩进 */}
      <Tooltip title="增加缩进">
        <Button
          size="small"
          type="text"
          style={{ fontSize: 12, fontWeight: 500 }}
          onClick={() => {
            if (editor.isActive('listItem')) {
              editor.chain().focus().sinkListItem('listItem').run()
            } else {
              const { state } = editor
              const node = state.selection.$from.node()
              if (node) {
                const current = (node.attrs.indent as number) || 0
                if (current < 8) {
                  editor.chain().focus().updateAttributes(node.type.name, { indent: current + 1 }).run()
                }
              }
            }
          }}
        >
          →|
        </Button>
      </Tooltip>
      <Tooltip title="减少缩进">
        <Button
          size="small"
          type="text"
          style={{ fontSize: 12, fontWeight: 500 }}
          onClick={() => {
            if (editor.isActive('listItem')) {
              editor.chain().focus().liftListItem('listItem').run()
            } else {
              const { state } = editor
              const node = state.selection.$from.node()
              if (node) {
                const current = (node.attrs.indent as number) || 0
                if (current > 0) {
                  editor.chain().focus().updateAttributes(node.type.name, { indent: current - 1 }).run()
                }
              }
            }
          }}
        >
          |←
        </Button>
      </Tooltip>

      {/* 右侧操作 */}
      <div style={{ flex: 1 }} />

      {/* 清除样式 */}
      <Tooltip title="清除样式（保留文本）">
        <Button size="small" type="text" icon={<ClearOutlined />} onClick={clearFormatting} />
      </Tooltip>

      {/* 全屏 */}
      <Tooltip title={isFullscreen ? '退出全屏' : '全屏编辑'}>
        <Button
          size="small"
          type="text"
          icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
          onClick={onToggleFullscreen}
        />
      </Tooltip>

      {/* 清空内容（二次确认） */}
      <Tooltip title="清空内容">
        <Button
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
