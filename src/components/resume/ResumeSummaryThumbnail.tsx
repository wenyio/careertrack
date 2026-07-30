/**
 * Lightweight resume thumbnail for server-backed list items.
 *
 * It deliberately renders only structural summary data. The full resume body
 * is fetched after the user opens the editor or starts printing.
 */

'use client'

import { getModuleLabel } from '@/config/modules'
import type { ResumeModuleType, ResumeTemplateId } from '@/types/resume'

interface ResumeSummaryThumbnailProps {
  sections: ResumeModuleType[]
  template: ResumeTemplateId
  width?: number
}

const PAGE_RATIO = 1123 / 794

const TEMPLATE_ACCENTS: Record<ResumeTemplateId, {
  accent: string
  muted: string
  sidebar: boolean
}> = {
  classic: { accent: '#17365d', muted: '#dbe7f5', sidebar: false },
  modern: { accent: '#1677ff', muted: '#e6f4ff', sidebar: true },
  minimal: { accent: '#262626', muted: '#ededed', sidebar: false },
  'black-white': { accent: '#111111', muted: '#dedede', sidebar: false },
}

export default function ResumeSummaryThumbnail({
  sections,
  template,
  width = 120,
}: ResumeSummaryThumbnailProps) {
  const height = Math.round(width * PAGE_RATIO)
  const colors = TEMPLATE_ACCENTS[template] || TEMPLATE_ACCENTS.classic
  const visibleSections = sections
    .filter((section) => section !== 'basic_info')
    .slice(0, 7)

  return (
    <div
      aria-hidden="true"
      style={{
        width,
        height,
        overflow: 'hidden',
        borderRadius: 8,
        background: '#fff',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08), inset 0 0 0 1px rgba(0,0,0,0.05)',
        display: 'flex',
      }}
    >
      {colors.sidebar && (
        <div style={{ width: '29%', background: colors.accent, padding: '13px 6px' }}>
          <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(255,255,255,.9)', margin: '0 auto 10px' }} />
          {[70, 90, 58, 82, 64].map((lineWidth, index) => (
            <div
              // Decorative placeholder lines intentionally have positional keys.
              key={`${lineWidth}-${index}`}
              style={{ width: `${lineWidth}%`, height: 2, margin: '0 auto 5px', background: 'rgba(255,255,255,.55)' }}
            />
          ))}
        </div>
      )}
      <div style={{ flex: 1, padding: colors.sidebar ? '13px 8px' : '14px 10px' }}>
        <div style={{ width: '44%', height: 4, background: colors.accent }} />
        <div style={{ width: '58%', height: 2, marginTop: 5, background: colors.muted }} />
        <div style={{ width: '78%', height: 2, marginTop: 3, background: colors.muted }} />

        <div style={{ marginTop: 10 }}>
          {visibleSections.map((section, index) => (
            <div key={section} style={{ marginBottom: index === visibleSections.length - 1 ? 0 : 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <div style={{ width: 2, height: 7, background: colors.accent }} />
                <div style={{ fontSize: 4.5, lineHeight: 1, fontWeight: 600, color: colors.accent }}>
                  {getModuleLabel(section)}
                </div>
              </div>
              <div style={{ width: '92%', height: 2, marginTop: 4, background: '#d9d9d9' }} />
              <div style={{ width: index % 2 === 0 ? '76%' : '84%', height: 2, marginTop: 3, background: '#ececec' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
