/**
 * 经典模板定义
 *
 * 传统单栏居中布局，基本信息带图标，模块间距为 0。
 */

import type { TemplateDefinition, BasicInfoHeaderProps } from '../types'
import { StandardBasicInfoHeader, DEFAULT_INTENTION_RESOLVE_OVERRIDES } from '../common'

// ── BasicInfoHeader 包装 ──

function ClassicBasicInfoHeader(props: BasicInfoHeaderProps) {
  return (
    <StandardBasicInfoHeader
      {...props}
      variant="centered"
      showBottomBorder
      iconColor={props.primaryColor}
      textColor="#555"
      intentionColor="#666"
      nameFontSize={props.centerNameFontSize || '2.2em'}
    />
  )
}

/** 经典模板骨架预览 */
function ClassicSkeletonPreview() {
  return (
    <div style={{ flex: 1, backgroundColor: '#f9fafb', padding: 6 }}>
      <div style={{ height: 6, backgroundColor: '#1a1a2e', borderRadius: 2, marginBottom: 4, width: '40%', marginLeft: 'auto', marginRight: 'auto' }} />
      <div style={{ height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, marginBottom: 3, width: '80%' }} />
      <div style={{ height: 3, backgroundColor: '#e5e7eb', borderRadius: 2, marginBottom: 3, width: '100%' }} />
      <div style={{ height: 3, backgroundColor: '#e5e7eb', borderRadius: 2, width: '60%' }} />
    </div>
  )
}

export const classicTemplate: TemplateDefinition = {
  config: {
    id: 'classic',
    name: '经典',
    description: '传统单栏布局，适合传统行业和正式场合',
    primaryColor: '#1a1a2e',
    secondaryColor: '#16213e',
    textColor: '#333333',
    defaultPreviewConfig: { lineHeight: 1.5 },
  },
  renderer: {
    BasicInfoHeader: ClassicBasicInfoHeader,
    styleOverrides: {
      section: { marginBottom: 0 },
    },
  },
  SkeletonPreview: ClassicSkeletonPreview,
  resolveOverrides: DEFAULT_INTENTION_RESOLVE_OVERRIDES,
}
