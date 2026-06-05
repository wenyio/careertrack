/**
 * 简历富文本编辑器
 *
 * 基于 TipTap 的无头富文本编辑器
 * 输出格式：TipTap JSON（存储到数据库）
 * 向后兼容：接受纯字符串输入，输出时保留原格式
 */

'use client'

import { useEditor, EditorContent, Extension } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import { TextStyle, Color, FontSize, LineHeight } from '@tiptap/extension-text-style'
import { useEffect, useRef, useState } from 'react'
import type { DescriptionField, RichTextNode } from '@/types/resume'
import { isSafeUrl, textToDoc } from '@/utils/rich-text'
import RichTextToolbar from './toolbar/RichTextToolbar'

// ============ 自定义扩展 ============

/** 缩进扩展：段落缩进（列表中使用 sinkListItem/liftListItem） */
const Indent = Extension.create({
  name: 'indent',
  addOptions() {
    return {
      types: ['paragraph', 'listItem'],
      minLevel: 0,
      maxLevel: 8,
    }
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element: HTMLElement) => {
              const level = parseInt(element.style.marginLeft || '0', 10) / 24
              return Math.max(0, Math.min(8, Math.round(level)))
            },
            renderHTML: (attributes: Record<string, unknown>) => {
              const level = (attributes.indent as number) || 0
              if (!level) return {}
              return { style: `margin-left: ${level * 24}px` }
            },
          },
        },
      },
    ]
  },
})

// ============ 工具函数 ============

/** 判断是否为 TipTap JSON */
function isRichText(value: DescriptionField): value is RichTextNode {
  return typeof value === 'object' && value !== null && 'type' in value
}

/** 尝试解析可能是 JSON 字符串的值 */
function parseValue(value: DescriptionField): DescriptionField {
  if (typeof value !== 'string') return value
  if (!value.startsWith('{')) return value
  try {
    const parsed = JSON.parse(value)
    if (parsed && typeof parsed === 'object' && parsed.type === 'doc') {
      return parsed as RichTextNode
    }
  } catch {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[RichTextEditor] JSON 解析失败，降级为纯文本')
    }
  }
  return value
}

/** 将 value 转为 TipTap 可用的 JSON（空值返回 undefined） */
function toEditorContent(value?: DescriptionField): RichTextNode | undefined {
  if (!value) return undefined
  const resolved = parseValue(value)
  if (typeof resolved === 'string') return textToDoc(resolved)
  if (isRichText(resolved)) return resolved
  return undefined
}

// ============ 主组件 ============

interface RichTextEditorProps {
  value?: DescriptionField
  onChange: (value: DescriptionField) => void
  placeholder?: string
  minHeight?: number
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = '请输入内容...',
  minHeight = 120,
}: RichTextEditorProps) {
  const isInternalChange = useRef(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // 全屏 ESC 退出
  useEffect(() => {
    if (!isFullscreen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isFullscreen])

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        code: false,
        blockquote: false,
        horizontalRule: false,
        // link 和 underline 已内置于 StarterKit，通过配置项自定义
        link: {
          openOnClick: false,
          HTMLAttributes: {
            rel: 'noopener noreferrer',
            target: '_blank',
          },
          validate: (url: string) => isSafeUrl(url),
        },
        underline: {},
      }),
      TextAlign.configure({
        types: ['paragraph', 'listItem'],
      }),
      Placeholder.configure({ placeholder }),
      TextStyle,
      Color,
      FontSize,
      LineHeight,
      Indent,
    ],
    content: toEditorContent(value),
    editorProps: {
      attributes: {
        style: `min-height: ${minHeight}px; outline: none; font-size: 14px; line-height: 1.6; padding: 8px 11px;`,
      },
    },
    onUpdate: ({ editor: ed }) => {
      isInternalChange.current = true
      const json = ed.getJSON()
      const isEmpty =
        json.content?.length === 1 &&
        json.content[0].type === 'paragraph' &&
        (!json.content[0].content || json.content[0].content.length === 0)

      onChange(isEmpty ? '' : (json as RichTextNode))
      isInternalChange.current = false
    },
  })

  // 外部 value 变化时同步到编辑器
  useEffect(() => {
    if (!editor || isInternalChange.current) return

    // 外部清空：value 为空
    if (!value) {
      const currentJson = editor.getJSON()
      const isEditorEmpty =
        currentJson.content?.length === 1 &&
        currentJson.content[0].type === 'paragraph' &&
        (!currentJson.content[0].content || currentJson.content[0].content.length === 0)
      if (!isEditorEmpty) {
        editor.commands.setContent({ type: 'doc', content: [{ type: 'paragraph' }] }, { emitUpdate: false })
      }
      return
    }

    const newValue = toEditorContent(value)
    if (!newValue) return

    const currentStr = JSON.stringify(editor.getJSON())
    const newStr = JSON.stringify(newValue)
    if (currentStr !== newStr) {
      editor.commands.setContent(newValue, { emitUpdate: false })
    }
  }, [editor, value])

  // 清空内容
  const handleClearContent = () => {
    if (!editor) return
    editor.commands.clearContent()
    onChange('')
  }

  if (!editor) return null

  const containerStyle: React.CSSProperties = isFullscreen
    ? {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        backgroundColor: '#fff',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 0,
      }
    : {
        border: '1px solid #d9d9d9',
        borderRadius: 6,
        overflow: 'hidden',
      }

  return (
    <div ref={containerRef} style={containerStyle}>
      <RichTextToolbar
        editor={editor}
        isFullscreen={isFullscreen}
        onToggleFullscreen={() => setIsFullscreen((v) => !v)}
        onClearContent={handleClearContent}
      />

      {/* 编辑区域 */}
      <div style={isFullscreen ? { flex: 1, overflow: 'auto' } : undefined}>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
