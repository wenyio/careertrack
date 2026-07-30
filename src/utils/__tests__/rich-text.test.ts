import { describe, expect, it } from 'vitest'
import {
  isSafeUrl,
  isSafeWebUrl,
  MAX_RICH_TEXT_DEPTH,
  MAX_RICH_TEXT_NODES,
  validateRichTextDoc,
} from '@/utils/rich-text'

describe('rich-text security and semantics', () => {
  it('accepts supported link protocols and relative paths', () => {
    expect(isSafeUrl('https://example.com/resume')).toBe(true)
    expect(isSafeUrl('mailto:user@example.com')).toBe(true)
    expect(isSafeUrl('tel:+8613800138000')).toBe(true)
    expect(isSafeUrl('/uploads/avatar.png')).toBe(true)
    expect(isSafeUrl('github.com/example')).toBe(true)
  })

  it('rejects dangerous, unsupported, and control-character URLs', () => {
    expect(isSafeUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeUrl('data:text/html,<script>alert(1)</script>')).toBe(false)
    expect(isSafeUrl('ftp://example.com/file')).toBe(false)
    expect(isSafeUrl('https://')).toBe(false)
    expect(isSafeUrl('https://example.com/\nredirect')).toBe(false)
    expect(isSafeWebUrl('mailto:user@example.com')).toBe(false)
    expect(isSafeWebUrl('https://example.com/avatar.png')).toBe(true)
    expect(isSafeWebUrl('./avatar.png')).toBe(true)
  })

  it('accepts the nodes, marks, and attributes emitted by the editor', () => {
    expect(validateRichTextDoc({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: { textAlign: 'center', indent: 2, lineHeight: '1.5' },
          content: [{
            type: 'text',
            text: '项目主页',
            marks: [
              { type: 'bold' },
              {
                type: 'link',
                attrs: {
                  href: 'https://example.com/project',
                  target: '_blank',
                  rel: 'noopener noreferrer nofollow',
                  class: null,
                  title: null,
                },
              },
              {
                type: 'textStyle',
                attrs: {
                  color: 'rgb(22, 119, 255)',
                  fontSize: '16px',
                  lineHeight: '1.75',
                },
              },
            ],
          }],
        },
        {
          type: 'orderedList',
          attrs: { start: 2, type: 'a' },
          content: [{
            type: 'listItem',
            attrs: { textAlign: null, indent: 0 },
            content: [{
              type: 'paragraph',
              content: [{ type: 'text', text: '第一项' }],
            }],
          }],
        },
      ],
    })).toEqual({ valid: true })
  })

  it('rejects unsupported nodes and invalid parent-child relationships', () => {
    expect(validateRichTextDoc({
      type: 'doc',
      content: [{ type: 'heading', content: [] }],
    })).toMatchObject({
      valid: false,
      error: expect.stringContaining('doc 不允许包含 "heading"'),
    })

    expect(validateRichTextDoc({
      type: 'doc',
      content: [{
        type: 'bulletList',
        content: [{
          type: 'listItem',
          content: [{ type: 'bulletList', content: [] }],
        }],
      }],
    })).toMatchObject({
      valid: false,
      error: expect.stringContaining('必须以 paragraph 开始'),
    })
  })

  it('rejects unsafe marks, attributes, and style values', () => {
    const docWithMark = (mark: unknown) => ({
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [{ type: 'text', text: '危险链接', marks: [mark] }],
      }],
    })

    expect(validateRichTextDoc(docWithMark({
      type: 'link',
      attrs: { href: 'javascript:alert(1)' },
    }))).toMatchObject({
      valid: false,
      error: expect.stringContaining('链接 URL 无效'),
    })

    expect(validateRichTextDoc(docWithMark({
      type: 'link',
      attrs: { href: 'https://example.com', onclick: 'alert(1)' },
    }))).toMatchObject({
      valid: false,
      error: expect.stringContaining('不允许的链接属性'),
    })

    expect(validateRichTextDoc(docWithMark({
      type: 'textStyle',
      attrs: { color: 'rgb(999, 0, 0)' },
    }))).toMatchObject({
      valid: false,
      error: expect.stringContaining('颜色格式无效'),
    })
  })

  it('bounds rich-text depth and node count without recursive traversal', () => {
    let nestedList: Record<string, unknown> = {
      type: 'paragraph',
      content: [{ type: 'text', text: '深层内容' }],
    }
    for (let depth = 0; depth <= MAX_RICH_TEXT_DEPTH; depth += 1) {
      nestedList = {
        type: 'bulletList',
        content: [{
          type: 'listItem',
          content: [
            { type: 'paragraph' },
            nestedList,
          ],
        }],
      }
    }
    expect(validateRichTextDoc({
      type: 'doc',
      content: [nestedList],
    })).toMatchObject({
      valid: false,
      error: expect.stringContaining(`不能超过 ${MAX_RICH_TEXT_DEPTH} 层`),
    })

    expect(validateRichTextDoc({
      type: 'doc',
      content: Array.from(
        { length: MAX_RICH_TEXT_NODES },
        () => ({ type: 'paragraph' }),
      ),
    })).toMatchObject({
      valid: false,
      error: expect.stringContaining(`不能超过 ${MAX_RICH_TEXT_NODES} 个`),
    })
  })
})
