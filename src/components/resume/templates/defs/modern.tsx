/**
 * 现代模板定义
 *
 * 双栏布局：sidebar（头像/名字/基本信息/教育/荣誉/简介）+ main（其余模块）。
 * 侧边栏蓝底白字，头像圆形居中。
 */

import { useRef, useLayoutEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type {
  TemplateDefinition,
  TemplateRendererProps,
} from '../types'
import type { ResumeModuleType } from '@/types/resume'
import {
  StandardBasicInfoHeader,
  renderStandardModule,
  renderSkillsModule,
  DEFAULT_INTENTION_RESOLVE_OVERRIDES,
} from '../common'

// ── 自定义 Renderer ──

function ModernRenderer({
  content,
  modulesConfig,
  modulesOrder,
  template,
  styles,
  viewModel,
  config,
  resolvedFontSize,
  renderSection,
  renderSubItem,
}: TemplateRendererProps) {
  const basicInfo = content.basic_info
  const s = (n: number) => Math.round(resolvedFontSize * n * 10) / 10

  // 侧边栏样式覆盖：白字、适配窄栏
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sidebarStyles: any = {
    ...styles,
    sectionTitle: { ...styles.sectionTitle, color: '#fff', borderBottomColor: 'rgba(255,255,255,0.3)', fontSize: s(1.1), marginBottom: 8, letterSpacing: 1 },
    entry: { ...styles.entry, marginBottom: 8 },
    entryTitle: { ...styles.entryTitle, color: '#fff', fontSize: s(1.1) },
    entryHeader: { display: 'block', marginBottom: 2 },
    entryDate: { ...styles.entryDate, color: 'rgba(255,255,255,0.7)', fontSize: s(0.9), display: 'block', marginLeft: 0 },
    entrySubtitle: { ...styles.entrySubtitle, color: 'rgba(255,255,255,0.7)', fontSize: s(0.9) },
    description: { ...styles.description, color: 'rgba(255,255,255,0.85)', fontSize: s(0.9) },
  }

  const sidebarModules: ResumeModuleType[] = ['basic_info', 'education', 'awards', 'summary']
  const mainModules: ResumeModuleType[] = ['skills', 'work_experience', 'projects', 'portfolio', 'other_experience', 'research']

  const sidebarInOrder = modulesOrder.filter((m) => sidebarModules.includes(m))
  const mainInOrder = modulesOrder.filter((m) => mainModules.includes(m))

  /** 渲染侧边栏模块内容（使用白字样式） */
  function renderSidebarContent(module: ResumeModuleType): ReactNode {
    if (module === 'basic_info') {
      return (
        <StandardBasicInfoHeader
          variant="sidebar"
          showName={false}
          showAvatar={false}
          basicInfo={basicInfo}
          template={template}
          primaryColor={config.primaryColor}
          styles={styles}
          extraDisplayItems={viewModel.basicInfo.extras}
          fieldIcons={content.basic_info_display?.field_icons}
          contactItems={viewModel.basicInfo.contacts}
          intentionItems={viewModel.basicInfo.intentions}
          iconColor="rgba(255, 255, 255, 0.8)"
          textColor="rgba(255, 255, 255, 0.9)"
          contactFontSize={s(0.9)}
          intentionFontSize={s(0.9)}
        />
      )
    }
    return renderStandardModule({ module, content, styles: sidebarStyles, renderSubItem, s })
  }

  /** 渲染主区域模块内容 */
  function renderMainContent(module: ResumeModuleType): ReactNode {
    if (module === 'skills') return renderSkillsModule({ content, styles, renderSubItem, s })
    return renderStandardModule({ module, content, styles, renderSubItem, s })
  }

  function renderSidebarModule(module: ResumeModuleType): ReactNode {
    if (!modulesConfig[module]) return null
    const contentNode = renderSidebarContent(module)
    if (!contentNode) return null
    return renderSection(module, contentNode)
  }

  function renderMainModule(module: ResumeModuleType): ReactNode {
    if (!modulesConfig[module]) return null
    const contentNode = renderMainContent(module)
    if (!contentNode) return null
    return renderSection(module, contentNode)
  }

  // ── 多页高度对齐 ──
  const A4_HEIGHT = 1123
  const pageRef = useRef<HTMLDivElement>(null)
  const [pageHeight, setPageHeight] = useState<number | undefined>(undefined)

  useLayoutEffect(() => {
    const el = pageRef.current
    if (!el) return
    const contentHeight = el.scrollHeight
    const pages = Math.ceil(contentHeight / A4_HEIGHT)
    const targetHeight = pages * A4_HEIGHT
    if (targetHeight !== contentHeight) {
      setPageHeight(targetHeight)
    }
  })

  return (
    <div ref={pageRef} style={{ ...styles.page, ...(pageHeight ? { height: pageHeight } : {}) }}>
      <div style={styles.sidebar}>
        {basicInfo?.avatar && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={basicInfo.avatar}
              alt=""
              style={{ width: 90, height: 90, objectFit: 'cover', borderRadius: '50%' }}
            />
          </div>
        )}
        <div style={styles.sidebarName}>{basicInfo?.name || '您的姓名'}</div>
        {sidebarInOrder.map((m) => renderSidebarModule(m))}
      </div>
      <div style={styles.main}>
        {mainInOrder.map((m, i, arr) => {
          const section = renderMainModule(m)
          if (!section) return null
          const isLast = i === arr.length - 1
          return (
            <div key={m} style={{ marginBottom: isLast ? 0 : styles.section.marginBottom }}>
              {section}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── 骨架预览 ──

/** 现代模板骨架预览 */
function ModernSkeletonPreview() {
  return (
    <>
      <div style={{ width: '35%', backgroundColor: '#2563eb' }} />
      <div style={{ flex: 1, backgroundColor: '#f9fafb', padding: 6 }}>
        <div style={{ height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, marginBottom: 3, width: '80%' }} />
        <div style={{ height: 3, backgroundColor: '#e5e7eb', borderRadius: 2, width: '60%' }} />
      </div>
    </>
  )
}

// ── 模板定义导出 ──

export const modernTemplate: TemplateDefinition = {
  config: {
    id: 'modern',
    name: '现代',
    description: '双栏布局，配色鲜明，适合互联网和创意行业',
    primaryColor: '#2563eb',
    secondaryColor: '#1e40af',
    textColor: '#1f2937',
    defaultPreviewConfig: { lineHeight: 1.5 },
  },
  renderer: {
    Renderer: ModernRenderer,
    styleOverrides: ({ primaryColor, s }) => ({
      page: { display: 'flex', padding: 0 },
      section: { marginBottom: 0 },
      sidebar: {
        width: 220,
        backgroundColor: primaryColor,
        padding: 24,
        color: '#fff',
        flexShrink: 0,
        alignSelf: 'stretch',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      },
      sidebarName: {
        fontSize: s(1.8),
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 12,
      },
      main: { flex: 1, padding: 28 },
    }),
  },
  SkeletonPreview: ModernSkeletonPreview,
  resolveOverrides: DEFAULT_INTENTION_RESOLVE_OVERRIDES,
}
