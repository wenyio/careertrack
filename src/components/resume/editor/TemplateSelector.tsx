/**
 * 模板选择器组件
 *
 * 展示可用模板列表，支持切换
 */

'use client'

import type { ResumeTemplateId } from '@/types/resume'
import { TEMPLATE_LIST, TEMPLATE_SKELETONS } from '@/components/resume/templates/registry'

interface TemplateSelectorProps {
  value: ResumeTemplateId
  onChange: (template: ResumeTemplateId) => void
}

export default function TemplateSelector({ value, onChange }: TemplateSelectorProps) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '8px 0' }}>
      {TEMPLATE_LIST.map((tpl) => {
        const SkeletonPreview = TEMPLATE_SKELETONS[tpl.id]
        return (
          <div
            key={tpl.id}
            onClick={() => onChange(tpl.id)}
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 8,
              border: `2px solid ${value === tpl.id ? tpl.primaryColor : '#e5e7eb'}`,
              cursor: 'pointer',
              transition: 'all 0.15s',
              backgroundColor: value === tpl.id ? '#f8fafc' : '#fff',
            }}
          >
            {/* 模板预览骨架 */}
            <div
              style={{
                height: 40,
                borderRadius: 4,
                marginBottom: 8,
                display: 'flex',
                overflow: 'hidden',
              }}
            >
              <SkeletonPreview />
            </div>

            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: value === tpl.id ? 600 : 400,
                  color: value === tpl.id ? tpl.primaryColor : '#333',
                }}
              >
                {tpl.name}
              </div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                {tpl.description}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
