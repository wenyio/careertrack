/**
 * 预览控制栏组件
 *
 * 从编辑页面提取的预览控制条，支持：
 * - 字体大小调节
 * - 行间距调节
 * - 缩放控制（放大、缩小、重置）
 */

'use client'

import {
  isResumePreviewLineHeight,
  RESUME_PREVIEW_FONT_SIZES,
  RESUME_PREVIEW_LINE_HEIGHT_MAX,
  RESUME_PREVIEW_LINE_HEIGHT_MIN,
} from '@/config/resume-preview'
import { useI18n } from '@/i18n'

interface PreviewControlBarProps {
  /** 字体大小 */
  fontSize: number
  /** 设置字体大小 */
  onFontSizeChange: (size: number) => void
  /** 行间距 */
  lineHeight: number
  /** 设置行间距 */
  onLineHeightChange: (height: number) => void
  /** 缩放比例 */
  zoom: number
  /** 设置缩放比例 */
  onZoomChange: (zoom: number) => void
}

export default function PreviewControlBar({
  fontSize,
  onFontSizeChange,
  lineHeight,
  onLineHeightChange,
  zoom,
  onZoomChange,
}: PreviewControlBarProps) {
  const { t } = useI18n()
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '5px 10px',
      backgroundColor: '#fff',
      borderBottom: '1px solid #f0f0f0',
      flexShrink: 0,
      flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: 11, color: '#999', flexShrink: 0 }}>{t('resumeEditor.preview')}</span>
      <div style={{ flex: 1 }} />

      {/* 字体大小 */}
      <label
        htmlFor="resume-preview-font-size"
        style={{ fontSize: 10, color: '#999' }}
      >
        {t('resumeEditor.fontSize')}
      </label>
      <select
        id="resume-preview-font-size"
        aria-label={t('resumeEditor.previewFontSize')}
        value={fontSize}
        onChange={(e) => onFontSizeChange(Number(e.target.value))}
        style={{ fontSize: 11, border: '1px solid #d9d9d9', borderRadius: 4, padding: '1px 4px', color: '#555', backgroundColor: '#fff', cursor: 'pointer' }}
      >
        {RESUME_PREVIEW_FONT_SIZES.map((size) => (
          <option key={size} value={size}>{size}px</option>
        ))}
      </select>

      {/* 行间距 */}
      <label
        htmlFor="resume-preview-line-height"
        style={{ fontSize: 10, color: '#999', marginLeft: 4 }}
      >
        {t('resumeEditor.lineHeight')}
      </label>
      <input
        id="resume-preview-line-height"
        aria-label={t('resumeEditor.previewLineHeight')}
        type="number"
        min={RESUME_PREVIEW_LINE_HEIGHT_MIN}
        max={RESUME_PREVIEW_LINE_HEIGHT_MAX}
        step={0.1}
        value={lineHeight}
        onChange={(event) => {
          const nextLineHeight = event.currentTarget.valueAsNumber
          // 输入中的空值或越界值只留在控件草稿中，不污染编辑器 store。
          if (isResumePreviewLineHeight(nextLineHeight)) {
            onLineHeightChange(nextLineHeight)
          }
        }}
        style={{ width: 48, fontSize: 11, border: '1px solid #d9d9d9', borderRadius: 4, padding: '1px 4px', color: '#555', backgroundColor: '#fff' }}
      />

      {/* 缩放 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 4 }}>
        <button
          type="button"
          aria-label={t('resumeEditor.zoomOutPreview')}
          onClick={() => onZoomChange(Math.max(0.5, +(zoom - 0.1).toFixed(1)))}
          style={{
            width: 22, height: 22, border: '1px solid #d9d9d9', borderRadius: 4,
            backgroundColor: '#fff', cursor: 'pointer', fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555',
          }}
        >−</button>
        <span style={{ fontSize: 10, color: '#666', minWidth: 32, textAlign: 'center' }}>
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          aria-label={t('resumeEditor.zoomInPreview')}
          onClick={() => onZoomChange(Math.min(1.5, +(zoom + 0.1).toFixed(1)))}
          style={{
            width: 22, height: 22, border: '1px solid #d9d9d9', borderRadius: 4,
            backgroundColor: '#fff', cursor: 'pointer', fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555',
          }}
        >+</button>
        <button
          type="button"
          aria-label={t('resumeEditor.resetPreviewZoom')}
          onClick={() => onZoomChange(0.8)}
          style={{
            height: 20, border: '1px solid #d9d9d9', borderRadius: 4, padding: '0 6px',
            backgroundColor: '#fff', cursor: 'pointer', fontSize: 10, color: '#555',
          }}
        >{t('resumeEditor.reset')}</button>
      </div>
    </div>
  )
}
