/**
 * 富文本工具函数
 */

import type { DescriptionField, RichTextNode } from '@/types/resume'

// ============ 安全校验 ============

/** 允许的 URL 协议白名单 */
const ALLOWED_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:']

/** 校验链接 URL 安全性（共用于 HTML 预览和 PDF 导出） */
export function isSafeUrl(url: string): boolean {
  if (!url) return false
  try {
    // 绝对 URL：检查协议
    const parsed = new URL(url)
    return ALLOWED_PROTOCOLS.includes(parsed.protocol)
  } catch {
    // 相对路径：排除 javascript: 等危险协议
    const lower = url.trim().toLowerCase()
    if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:')) {
      return false
    }
    // 允许相对路径（/path、./path、../path、#anchor 等）
    return true
  }
}

/** 严格的颜色值校验：#RGB / #RRGGBB / rgb() / rgba() */
export function isValidColor(value: string): boolean {
  if (!value) return false
  const v = value.trim()
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)
    || /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/.test(v)
    || /^rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*(0|1|0?\.\d+)\s*\)$/.test(v)
}

/** 严格的字号校验：8-48px */
export function isValidFontSize(value: string): boolean {
  if (!value) return false
  const match = value.trim().match(/^(\d+(?:\.\d+)?)px$/)
  if (!match) return false
  const n = parseFloat(match[1])
  return n >= 8 && n <= 48
}

/** 严格的行高校验：1-3 范围内小数 */
export function isValidLineHeight(value: string): boolean {
  if (!value) return false
  const n = parseFloat(value.trim())
  return !isNaN(n) && n >= 1 && n <= 3
}

/** 允许的 textAlign 值 */
const ALLOWED_ALIGNMENTS = new Set(['left', 'center', 'right', 'justify'])

/** 严格的对齐校验 */
export function isValidTextAlign(value: string): boolean {
  return ALLOWED_ALIGNMENTS.has(value.trim())
}

/** 严格的缩进校验：0-8 整数 */
export function isValidIndent(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 8
}

// ============ 基础工具 ============

/** 判断是否为 TipTap JSON */
export function isRichText(value: DescriptionField): value is RichTextNode {
  return typeof value === 'object' && value !== null && 'type' in value
}

/** HTML 转义 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** 将 TipTap JSON 转为纯文本（用于搜索、显示等） */
export function richTextToPlainText(value: DescriptionField): string {
  if (!value) return ''

  // 处理可能是 JSON 字符串的情况
  let resolved = value
  if (typeof value === 'string' && value.startsWith('{')) {
    try {
      const parsed = JSON.parse(value)
      if (parsed && typeof parsed === 'object' && parsed.type === 'doc') {
        resolved = parsed as RichTextNode
      }
    } catch {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[rich-text] JSON 解析失败，降级为纯文本:', value.substring(0, 50))
      }
    }
  }

  if (typeof resolved === 'string') return resolved

  function extractText(node: RichTextNode): string {
    const parts: string[] = []
    if (node.text) parts.push(node.text)
    if (node.content) {
      for (const child of node.content) {
        parts.push(extractText(child))
      }
    }
    return parts.join('')
  }

  return extractText(resolved).trim()
}

// ============ HTML 转换 ============

/** 将 TipTap JSON 转为 HTML（保留格式，严格白名单校验） */
export function richTextToHtml(value: DescriptionField): string {
  if (!value) return ''

  // 处理可能是 JSON 字符串的情况
  let resolved = value
  if (typeof value === 'string' && value.startsWith('{')) {
    try {
      const parsed = JSON.parse(value)
      if (parsed && typeof parsed === 'object' && parsed.type === 'doc') {
        resolved = parsed as RichTextNode
      }
    } catch {
      // 不是有效的 TipTap JSON，当作纯文本处理
    }
  }

  // 纯文本：转义 HTML 并将换行转为 <br>
  if (typeof resolved === 'string') {
    return escapeHtml(resolved).replace(/\n/g, '<br>')
  }

  /** 将 marks（加粗、斜体、链接、颜色、字号等）包裹到内容上 */
  function wrapWithMarks(text: string, marks?: RichTextNode['marks']): string {
    if (!marks || marks.length === 0) return text
    let result = text
    for (const mark of marks) {
      switch (mark.type) {
        case 'bold':
          result = `<strong>${result}</strong>`
          break
        case 'italic':
          result = `<em>${result}</em>`
          break
        case 'underline':
          result = `<u>${result}</u>`
          break
        case 'code':
          result = `<code>${result}</code>`
          break
        case 'strike':
          result = `<s>${result}</s>`
          break
        case 'link': {
          const href = (mark.attrs?.href as string) || ''
          if (isSafeUrl(href)) {
            const escapedHref = escapeHtml(href)
            result = `<a href="${escapedHref}" target="_blank" rel="noopener noreferrer">${result}</a>`
          }
          break
        }
        case 'textStyle': {
          const styles: string[] = []
          const color = mark.attrs?.color as string | undefined
          const fontSize = mark.attrs?.fontSize as string | undefined
          const lh = mark.attrs?.lineHeight as string | undefined
          if (color && isValidColor(color)) {
            styles.push(`color: ${color}`)
          }
          if (fontSize && isValidFontSize(fontSize)) {
            styles.push(`font-size: ${fontSize}`)
          }
          if (lh && isValidLineHeight(lh)) {
            styles.push(`line-height: ${lh}`)
          }
          if (styles.length > 0) {
            result = `<span style="${styles.join('; ')}">${result}</span>`
          }
          break
        }
      }
    }
    return result
  }

  /** 构建段落/列表项的 style 属性 */
  function nodeStyle(node: RichTextNode): string {
    const styles: string[] = []
    const align = node.attrs?.textAlign as string | undefined
    const lh = node.attrs?.lineHeight as string | undefined
    const indent = node.attrs?.indent as number | undefined
    if (align && isValidTextAlign(align)) {
      styles.push(`text-align: ${align}`)
    }
    if (lh && isValidLineHeight(lh)) {
      styles.push(`line-height: ${lh}`)
    }
    if (indent && isValidIndent(indent) && indent > 0) {
      styles.push(`margin-left: ${indent * 24}px`)
    }
    return styles.length > 0 ? ` style="${styles.join('; ')}"` : ''
  }

  /** 递归将节点转为 HTML */
  function nodeToHtml(node: RichTextNode): string {
    if (node.type === 'text') {
      const text = escapeHtml(node.text || '')
      return wrapWithMarks(text, node.marks)
    }

    const children = node.content?.map(nodeToHtml).join('') || ''

    switch (node.type) {
      case 'doc':
        return children
      case 'paragraph':
        return `<p${nodeStyle(node)}>${children || '<br>'}</p>`
      case 'bulletList':
        return `<ul>${children}</ul>`
      case 'orderedList':
        return `<ol>${children}</ol>`
      case 'listItem':
        return `<li${nodeStyle(node)}>${children}</li>`
      case 'hardBreak':
        return '<br>'
      default:
        return children
    }
  }

  return nodeToHtml(resolved)
}

/** 检查描述字段是否有实际内容 */
export function hasDescriptionContent(value?: DescriptionField): boolean {
  if (!value) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (isRichText(value)) {
    const text = richTextToPlainText(value)
    return text.length > 0
  }
  return false
}

// ============ 文本转 TipTap Doc ============

/** 允许的 TipTap 节点类型白名单 */
const ALLOWED_NODE_TYPES = new Set([
  'doc', 'paragraph', 'text', 'bulletList', 'orderedList',
  'listItem', 'hardBreak',
])

/** 允许的 TipTap mark 类型白名单 */
const ALLOWED_MARK_TYPES = new Set([
  'bold', 'italic', 'underline', 'code', 'strike',
  'link', 'textStyle',
])

/**
 * 将纯文本转换为 TipTap doc JSON
 *
 * 换行符分隔段落，支持空行生成空段落
 */
export function textToDoc(text: string): RichTextNode {
  if (!text) {
    return { type: 'doc', content: [{ type: 'paragraph' }] }
  }
  return {
    type: 'doc',
    content: text.split('\n').map((line) => ({
      type: 'paragraph',
      content: line ? [{ type: 'text', text: line }] : undefined,
    })),
  }
}

/**
 * 校验 TipTap doc JSON 结构的合法性
 *
 * - 根节点必须是 doc
 * - 只允许白名单内的节点类型和 mark 类型
 * - text 节点必须有 text 字段
 * - 非 text 节点的 text 字段会被忽略
 */
export function validateRichTextDoc(node: RichTextNode): { valid: boolean; error?: string } {
  if (!node || typeof node !== 'object') {
    return { valid: false, error: '节点必须是对象' }
  }
  if (node.type !== 'doc') {
    return { valid: false, error: '根节点必须是 doc 类型' }
  }
  return validateNode(node, 'doc')
}

function validateNode(node: RichTextNode, path: string): { valid: boolean; error?: string } {
  if (!ALLOWED_NODE_TYPES.has(node.type)) {
    return { valid: false, error: `${path}: 不允许的节点类型 "${node.type}"` }
  }

  if (node.type === 'text') {
    if (typeof node.text !== 'string') {
      return { valid: false, error: `${path}: text 节点必须有 text 字段` }
    }
  }

  if (node.marks) {
    for (const mark of node.marks) {
      if (!ALLOWED_MARK_TYPES.has(mark.type)) {
        return { valid: false, error: `${path}: 不允许的 mark 类型 "${mark.type}"` }
      }
    }
  }

  if (node.content) {
    for (let i = 0; i < node.content.length; i++) {
      const childResult = validateNode(node.content[i], `${path}.${node.type}[${i}]`)
      if (!childResult.valid) return childResult
    }
  }

  return { valid: true }
}
