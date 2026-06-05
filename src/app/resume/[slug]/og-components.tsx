/**
 * OG Image 共享 React 组件
 *
 * 品牌 Logo、技能标签、底部品牌栏等可在横图 / 方图间复用的 UI 片段。
 */

import type { CSSProperties } from 'react'
import { truncate, BRAND_BLUE, BRAND_BLUE_DARK, TAG_BG } from './og-helpers'

/** 品牌 Logo 圆角方块 */
export function BrandLogo({ size = 40, fontSize = 20 }: { size?: number; fontSize?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.25,
        background: `linear-gradient(135deg, ${BRAND_BLUE} 0%, ${BRAND_BLUE_DARK} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontSize,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      职
    </div>
  )
}

/** 技能标签 */
export function SkillTag({ label, fontSize = 22, light = false }: { label: string; fontSize?: number; light?: boolean }) {
  return (
    <div
      style={{
        padding: '8px 20px',
        background: light ? 'rgba(255,255,255,0.2)' : TAG_BG,
        borderRadius: 8,
        fontSize,
        color: light ? '#fff' : BRAND_BLUE,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: 200,
      }}
    >
      {truncate(label, 10)}
    </div>
  )
}

/** 底部品牌栏 */
export function BrandBar({
  fontSize = 24,
  smallFontSize = 20,
  showTag = true,
  light = false,
}: {
  fontSize?: number
  smallFontSize?: number
  showTag?: boolean
  light?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <BrandLogo size={40} fontSize={20} />
        <span style={{ fontSize, color: light ? 'rgba(255,255,255,0.7)' : '#999', fontWeight: 500 }}>
          职迹 CareerTrack
        </span>
      </div>
      {showTag && (
        <span style={{ fontSize: smallFontSize, color: light ? 'rgba(255,255,255,0.5)' : '#ccc' }}>在线简历</span>
      )}
    </div>
  )
}

/** 根容器通用样式 */
export const ROOT_STYLE: CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  background: '#f5f7fa',
  fontFamily: 'NotoSansSC, sans-serif',
}
