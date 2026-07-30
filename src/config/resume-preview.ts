import type { ResumePreviewConfig } from '@/types/resume'

/** 编辑器和 MCP 共同支持的基础字号。 */
export const RESUME_PREVIEW_FONT_SIZES = [12, 14, 16, 18, 20] as const

/** 行距允许连续取值；编辑器数字输入、REST 与 MCP 共用该边界。 */
export const RESUME_PREVIEW_LINE_HEIGHT_MIN = 1
export const RESUME_PREVIEW_LINE_HEIGHT_MAX = 3

export const DEFAULT_RESUME_PREVIEW_CONFIG: ResumePreviewConfig = {
  fontSize: 14,
  lineHeight: 1.5,
}

export function isResumePreviewFontSize(value: unknown): value is number {
  return (
    typeof value === 'number'
    && RESUME_PREVIEW_FONT_SIZES.includes(
      value as (typeof RESUME_PREVIEW_FONT_SIZES)[number],
    )
  )
}

export function isResumePreviewLineHeight(value: unknown): value is number {
  return (
    typeof value === 'number'
    && Number.isFinite(value)
    && value >= RESUME_PREVIEW_LINE_HEIGHT_MIN
    && value <= RESUME_PREVIEW_LINE_HEIGHT_MAX
  )
}
