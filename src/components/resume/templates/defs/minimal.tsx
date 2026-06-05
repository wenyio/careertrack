/**
 * 极简模板定义
 *
 * 大量留白，优雅排版。基本信息带图标+头像，模块间距为 0。
 */

import type { TemplateDefinition, BasicInfoHeaderProps } from '../types'
import { StandardBasicInfoHeader, DEFAULT_INTENTION_RESOLVE_OVERRIDES } from '../common'

// ── BasicInfoHeader 包装 ──

function MinimalBasicInfoHeader(props: BasicInfoHeaderProps) {
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

// ── 骨架预览 ──

/** 极简模板骨架预览 */
function MinimalSkeletonPreview() {
  return (
    <div style={{ flex: 1, backgroundColor: '#f9fafb', padding: 6 }}>
      <div style={{ height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, marginBottom: 3, width: '80%' }} />
      <div style={{ height: 3, backgroundColor: '#e5e7eb', borderRadius: 2, marginBottom: 3, width: '100%' }} />
      <div style={{ height: 3, backgroundColor: '#e5e7eb', borderRadius: 2, width: '60%' }} />
    </div>
  )
}

// ── 模板定义导出 ──

export const minimalTemplate: TemplateDefinition = {
  config: {
    id: 'minimal',
    name: '极简',
    description: '大量留白，优雅排版，适合高级职位和学术领域',
    primaryColor: '#4b5563',
    secondaryColor: '#6b7280',
    textColor: '#111827',
    defaultPreviewConfig: { lineHeight: 1.5 },
  },
  renderer: {
    BasicInfoHeader: MinimalBasicInfoHeader,
    styleOverrides: {
      section: { marginBottom: 0 },
      sectionTitle: {
        textTransform: 'uppercase',
        letterSpacing: 3,
        borderBottom: 'none',
      },
      entry: {
        paddingLeft: 12,
        borderLeft: '2px solid #e5e7eb',
      },
    },
  },
  SkeletonPreview: MinimalSkeletonPreview,
  resolveOverrides: DEFAULT_INTENTION_RESOLVE_OVERRIDES,
}
