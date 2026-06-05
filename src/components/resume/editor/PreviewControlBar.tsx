/**
 * 预览控制栏组件
 *
 * 从编辑页面提取的预览控制条，支持：
 * - 字体大小调节
 * - 行间距调节
 * - 缩放控制（放大、缩小、重置）
 */

'use client'

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
      <span style={{ fontSize: 11, color: '#999', flexShrink: 0 }}>预览</span>
      <div style={{ flex: 1 }} />

      {/* 字体大小 */}
      <span style={{ fontSize: 10, color: '#999' }}>字号</span>
      <select
        value={fontSize}
        onChange={(e) => onFontSizeChange(Number(e.target.value))}
        style={{ fontSize: 11, border: '1px solid #d9d9d9', borderRadius: 4, padding: '1px 4px', color: '#555', backgroundColor: '#fff', cursor: 'pointer' }}
      >
        <option value={12}>12px</option>
        <option value={14}>14px</option>
        <option value={16}>16px</option>
        <option value={18}>18px</option>
        <option value={20}>20px</option>
      </select>

      {/* 行间距 */}
      <span style={{ fontSize: 10, color: '#999', marginLeft: 4 }}>行距</span>
      <select
        value={lineHeight}
        onChange={(e) => onLineHeightChange(Number(e.target.value))}
        style={{ fontSize: 11, border: '1px solid #d9d9d9', borderRadius: 4, padding: '1px 4px', color: '#555', backgroundColor: '#fff', cursor: 'pointer' }}
      >
        <option value={1.2}>1.2</option>
        <option value={1.4}>1.4</option>
        <option value={1.5}>1.5</option>
        <option value={1.6}>1.6</option>
        <option value={1.8}>1.8</option>
        <option value={1.9}>1.9</option>
        <option value={2.0}>2.0</option>
      </select>

      {/* 缩放 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 4 }}>
        <button
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
          onClick={() => onZoomChange(Math.min(1.5, +(zoom + 0.1).toFixed(1)))}
          style={{
            width: 22, height: 22, border: '1px solid #d9d9d9', borderRadius: 4,
            backgroundColor: '#fff', cursor: 'pointer', fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555',
          }}
        >+</button>
        <button
          onClick={() => onZoomChange(0.8)}
          style={{
            height: 20, border: '1px solid #d9d9d9', borderRadius: 4, padding: '0 6px',
            backgroundColor: '#fff', cursor: 'pointer', fontSize: 10, color: '#555',
          }}
        >重置</button>
      </div>
    </div>
  )
}
