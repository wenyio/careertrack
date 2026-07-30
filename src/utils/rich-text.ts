/**
 * 富文本工具函数
 */

import type { DescriptionField, RichTextNode } from '@/types/resume'

// ============ 安全校验 ============

/** 允许的 URL 协议白名单 */
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:'])
const ALLOWED_WEB_PROTOCOLS = new Set(['http:', 'https:'])
const URL_CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/
const URL_SCHEME_PREFIX = /^[a-z][a-z0-9+.-]*:/i

function hasAllowedProtocol(
  url: string,
  protocols: ReadonlySet<string>,
): boolean {
  if (!url || URL_CONTROL_CHARACTERS.test(url)) return false
  const value = url.trim()
  if (!value) return false

  try {
    return protocols.has(new URL(value).protocol)
  } catch {
    // Scheme-less and relative links are resolved by the browser/application.
    // A malformed value that still declares a scheme must not be downgraded
    // to a relative link (for example, an incomplete "https://" value).
    return !URL_SCHEME_PREFIX.test(value)
  }
}

/** 校验链接 URL 安全性（共用于 HTML 预览和 PDF 导出） */
export function isSafeUrl(url: string): boolean {
  return hasAllowedProtocol(url, ALLOWED_PROTOCOLS)
}

/** 校验图片、作品和个人主页等 Web URL；允许相对上传路径。 */
export function isSafeWebUrl(url: string): boolean {
  return hasAllowedProtocol(url, ALLOWED_WEB_PROTOCOLS)
}

/** 严格的颜色值校验：#RGB / #RRGGBB / rgb() / rgba() */
export function isValidColor(value: string): boolean {
  if (!value) return false
  const v = value.trim()
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)) return true

  const rgb = v.match(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(0|1|0?\.\d+))?\s*\)$/,
  )
  if (!rgb) return false
  if (rgb.slice(1, 4).some((channel) => Number(channel) > 255)) return false
  return v.startsWith('rgba(') ? rgb[4] !== undefined : rgb[4] === undefined
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
  const normalized = value.trim()
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return false
  const n = Number(normalized)
  return n >= 1 && n <= 3
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
const EMPTY_KEYS = new Set<string>()
const RICH_TEXT_NODE_KEYS = new Set([
  'type', 'content', 'marks', 'text', 'attrs',
])
const RICH_TEXT_MARK_KEYS = new Set(['type', 'attrs'])
const PARAGRAPH_ATTRIBUTE_KEYS = new Set([
  'textAlign', 'indent', 'lineHeight',
])
const ORDERED_LIST_ATTRIBUTE_KEYS = new Set(['start', 'type'])
const LINK_ATTRIBUTE_KEYS = new Set([
  'href', 'target', 'rel', 'class', 'title',
])
const TEXT_STYLE_ATTRIBUTE_KEYS = new Set([
  'color', 'fontSize', 'lineHeight',
])
const INLINE_NODE_TYPES = new Set(['text', 'hardBreak'])
const BLOCK_NODE_TYPES = new Set(['paragraph', 'bulletList', 'orderedList'])
const LIST_ITEM_NODE_TYPE = new Set(['listItem'])
const ALLOWED_LIST_STYLES = new Set(['1', 'a', 'A', 'i', 'I'])
const ALLOWED_LINK_TARGETS = new Set(['_blank', '_self'])

export const MAX_RICH_TEXT_DEPTH = 16
export const MAX_RICH_TEXT_NODES = 2_000
export const MAX_RICH_TEXT_MARKS_PER_NODE = 8
export const MAX_RICH_TEXT_URL_LENGTH = 2_048

type RichTextValidationResult = { valid: true } | { valid: false; error: string }

type RichTextStackEntry = {
  node: unknown
  path: string
  depth: number
}

function invalidRichText(error: string): RichTextValidationResult {
  return { valid: false, error }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function findUnknownKey(
  value: Record<string, unknown>,
  allowedKeys: ReadonlySet<string>,
): string | undefined {
  return Object.keys(value).find((key) => !allowedKeys.has(key))
}

function validateNodeAttributes(
  type: string,
  attrs: unknown,
  path: string,
): RichTextValidationResult {
  if (attrs === undefined) return { valid: true }
  if (!isRecord(attrs)) return invalidRichText(`${path}.attrs: 必须是对象`)

  const allowedKeys = type === 'paragraph' || type === 'listItem'
    ? PARAGRAPH_ATTRIBUTE_KEYS
    : type === 'orderedList'
      ? ORDERED_LIST_ATTRIBUTE_KEYS
      : EMPTY_KEYS

  const unknownKey = findUnknownKey(attrs, allowedKeys)
  if (unknownKey) {
    return invalidRichText(`${path}.attrs.${unknownKey}: 不允许的节点属性`)
  }

  if (type === 'paragraph' || type === 'listItem') {
    const { textAlign, indent, lineHeight } = attrs
    if (
      textAlign !== undefined
      && textAlign !== null
      && (typeof textAlign !== 'string' || !isValidTextAlign(textAlign))
    ) {
      return invalidRichText(`${path}.attrs.textAlign: 对齐方式无效`)
    }
    if (
      indent !== undefined
      && indent !== null
      && (typeof indent !== 'number' || !isValidIndent(indent))
    ) {
      return invalidRichText(`${path}.attrs.indent: 缩进必须是 0-8 的整数`)
    }
    if (
      lineHeight !== undefined
      && lineHeight !== null
      && (typeof lineHeight !== 'string' || !isValidLineHeight(lineHeight))
    ) {
      return invalidRichText(`${path}.attrs.lineHeight: 行高必须在 1-3 之间`)
    }
  }

  if (type === 'orderedList') {
    const { start, type: listStyle } = attrs
    if (
      start !== undefined
      && (!Number.isInteger(start) || (start as number) < 1)
    ) {
      return invalidRichText(`${path}.attrs.start: 列表起始值必须是正整数`)
    }
    if (
      listStyle !== undefined
      && listStyle !== null
      && !ALLOWED_LIST_STYLES.has(listStyle as string)
    ) {
      return invalidRichText(`${path}.attrs.type: 有序列表类型无效`)
    }
  }

  return { valid: true }
}

function validateMark(
  mark: unknown,
  path: string,
): RichTextValidationResult & { type?: string } {
  if (!isRecord(mark)) return invalidRichText(`${path}: mark 必须是对象`)

  const unknownKey = findUnknownKey(mark, RICH_TEXT_MARK_KEYS)
  if (unknownKey) {
    return invalidRichText(`${path}.${unknownKey}: 不允许的 mark 字段`)
  }

  const type = mark.type
  if (typeof type !== 'string' || !ALLOWED_MARK_TYPES.has(type)) {
    return invalidRichText(`${path}: 不允许的 mark 类型 "${String(type)}"`)
  }

  const attrs = mark.attrs
  if (attrs !== undefined && !isRecord(attrs)) {
    return invalidRichText(`${path}.attrs: 必须是对象`)
  }
  const markAttrs = attrs || {}

  if (type === 'link') {
    const unknownAttr = findUnknownKey(markAttrs, LINK_ATTRIBUTE_KEYS)
    if (unknownAttr) {
      return invalidRichText(`${path}.attrs.${unknownAttr}: 不允许的链接属性`)
    }

    const href = markAttrs.href
    if (
      typeof href !== 'string'
      || href.length > MAX_RICH_TEXT_URL_LENGTH
      || !isSafeUrl(href)
    ) {
      return invalidRichText(`${path}.attrs.href: 链接 URL 无效或协议不受支持`)
    }

    const target = markAttrs.target
    if (
      target !== undefined
      && target !== null
      && !ALLOWED_LINK_TARGETS.has(target as string)
    ) {
      return invalidRichText(`${path}.attrs.target: 链接打开方式无效`)
    }

    for (const key of ['rel', 'class', 'title'] as const) {
      const value = markAttrs[key]
      if (
        value !== undefined
        && value !== null
        && (typeof value !== 'string' || value.length > 200)
      ) {
        return invalidRichText(`${path}.attrs.${key}: 链接属性无效`)
      }
    }
  } else if (type === 'textStyle') {
    const unknownAttr = findUnknownKey(markAttrs, TEXT_STYLE_ATTRIBUTE_KEYS)
    if (unknownAttr) {
      return invalidRichText(`${path}.attrs.${unknownAttr}: 不允许的文本样式`)
    }

    const { color, fontSize, lineHeight } = markAttrs
    if (
      color !== undefined
      && color !== null
      && (typeof color !== 'string' || !isValidColor(color))
    ) {
      return invalidRichText(`${path}.attrs.color: 颜色格式无效`)
    }
    if (
      fontSize !== undefined
      && fontSize !== null
      && (typeof fontSize !== 'string' || !isValidFontSize(fontSize))
    ) {
      return invalidRichText(`${path}.attrs.fontSize: 字号必须在 8-48px 之间`)
    }
    if (
      lineHeight !== undefined
      && lineHeight !== null
      && (typeof lineHeight !== 'string' || !isValidLineHeight(lineHeight))
    ) {
      return invalidRichText(`${path}.attrs.lineHeight: 行高必须在 1-3 之间`)
    }
  } else if (Object.keys(markAttrs).length > 0) {
    return invalidRichText(`${path}.attrs: ${type} mark 不允许附加属性`)
  }

  return { valid: true, type }
}

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
 * - 节点层级必须符合 doc/paragraph/list 的 TipTap 语义
 * - 节点、mark 和属性均使用白名单
 * - 链接、颜色、字号、行高、对齐与缩进经过边界校验
 */
export function validateRichTextDoc(input: unknown): RichTextValidationResult {
  if (!isRecord(input)) return invalidRichText('doc: 节点必须是对象')
  if (input.type !== 'doc') return invalidRichText('doc: 根节点必须是 doc 类型')

  const stack: RichTextStackEntry[] = [{
    node: input,
    path: 'doc',
    depth: 0,
  }]
  const visited = new WeakSet<object>()
  let nodeCount = 0

  while (stack.length > 0) {
    const current = stack.pop()
    if (!current) break
    if (!isRecord(current.node)) {
      return invalidRichText(`${current.path}: 节点必须是对象`)
    }
    if (visited.has(current.node)) {
      return invalidRichText(`${current.path}: 富文本树不能包含循环引用`)
    }
    visited.add(current.node)

    nodeCount += 1
    if (nodeCount > MAX_RICH_TEXT_NODES) {
      return invalidRichText(`doc: 节点数量不能超过 ${MAX_RICH_TEXT_NODES} 个`)
    }
    if (current.depth > MAX_RICH_TEXT_DEPTH) {
      return invalidRichText(`doc: 嵌套层级不能超过 ${MAX_RICH_TEXT_DEPTH} 层`)
    }

    const node = current.node
    const type = node.type
    if (typeof type !== 'string' || !ALLOWED_NODE_TYPES.has(type)) {
      return invalidRichText(
        `${current.path}: 不允许的节点类型 "${String(type)}"`,
      )
    }

    const unknownKey = findUnknownKey(node, RICH_TEXT_NODE_KEYS)
    if (unknownKey) {
      return invalidRichText(`${current.path}.${unknownKey}: 不允许的节点字段`)
    }

    const attrsResult = validateNodeAttributes(type, node.attrs, current.path)
    if (!attrsResult.valid) return attrsResult

    if (type === 'text') {
      if (typeof node.text !== 'string' || node.text.length === 0) {
        return invalidRichText(`${current.path}: text 节点必须包含非空文本`)
      }
    } else if (node.text !== undefined) {
      return invalidRichText(`${current.path}.text: 仅 text 节点允许文本字段`)
    }

    const marks = node.marks
    if (marks !== undefined) {
      if (!INLINE_NODE_TYPES.has(type) || !Array.isArray(marks)) {
        return invalidRichText(`${current.path}.marks: 仅行内节点允许 mark 数组`)
      }
      if (marks.length > MAX_RICH_TEXT_MARKS_PER_NODE) {
        return invalidRichText(
          `${current.path}.marks: 不能超过 ${MAX_RICH_TEXT_MARKS_PER_NODE} 个`,
        )
      }

      const markTypes = new Set<string>()
      for (let index = 0; index < marks.length; index += 1) {
        const markResult = validateMark(
          marks[index],
          `${current.path}.marks[${index}]`,
        )
        if (!markResult.valid) return markResult
        if (markResult.type && markTypes.has(markResult.type)) {
          return invalidRichText(
            `${current.path}.marks: 不能重复使用 ${markResult.type} mark`,
          )
        }
        if (markResult.type) markTypes.add(markResult.type)
      }
    }

    const content = node.content
    if (content !== undefined && !Array.isArray(content)) {
      return invalidRichText(`${current.path}.content: 必须是节点数组`)
    }
    const children = Array.isArray(content) ? content : []

    let allowedChildren: ReadonlySet<string>
    if (type === 'doc') {
      if (children.length === 0) return invalidRichText('doc.content: 不能为空')
      allowedChildren = BLOCK_NODE_TYPES
    } else if (type === 'paragraph') {
      allowedChildren = INLINE_NODE_TYPES
    } else if (type === 'bulletList' || type === 'orderedList') {
      if (children.length === 0) {
        return invalidRichText(`${current.path}.content: 列表不能为空`)
      }
      allowedChildren = LIST_ITEM_NODE_TYPE
    } else if (type === 'listItem') {
      if (children.length === 0) {
        return invalidRichText(`${current.path}.content: 列表项不能为空`)
      }
      allowedChildren = BLOCK_NODE_TYPES
    } else {
      if (children.length > 0) {
        return invalidRichText(`${current.path}.content: 行内节点不能包含子节点`)
      }
      allowedChildren = EMPTY_KEYS
    }

    for (let index = children.length - 1; index >= 0; index -= 1) {
      const child = children[index]
      const childType = isRecord(child) ? child.type : undefined
      if (typeof childType !== 'string' || !allowedChildren.has(childType)) {
        return invalidRichText(
          `${current.path}.content[${index}]: ${type} 不允许包含 "${String(childType)}"`,
        )
      }
      if (type === 'listItem' && index === 0 && childType !== 'paragraph') {
        return invalidRichText(
          `${current.path}.content[0]: 列表项必须以 paragraph 开始`,
        )
      }
      stack.push({
        node: child,
        path: `${current.path}.content[${index}]`,
        depth: current.depth + 1,
      })
    }
  }

  return { valid: true }
}
