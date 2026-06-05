/**
 * 富文本描述渲染组件
 *
 * 将 TipTap JSON 或纯文本转为 HTML 并渲染。
 */

import type { CSSProperties } from 'react'
import { descToHtml } from '@/utils/resume-preview'

export function DescriptionHtml({
  value,
  style,
  className = 'resume-desc',
}: {
  value?: unknown
  style?: CSSProperties
  className?: string
}) {
  const html = descToHtml(value)
  if (!html) return null
  return <div className={className} style={style} dangerouslySetInnerHTML={{ __html: html }} />
}
