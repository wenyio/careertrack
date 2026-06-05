/**
 * 公共简历渲染骨架
 *
 * 基于模板定义的 Slot-based 渲染器：
 * 1. 如果模板定义了 Renderer → 完全委托给它
 * 2. 否则：计算样式 → 按 layoutSlots 分区 → 模块级渲染
 *
 * 所有入口（编辑器预览、公开简历、缩略图、打印）统一使用此组件。
 */

'use client'

import type { ReactNode } from 'react'
import type {
  ResumeContent,
  ModulesConfig,
  ResumeModuleType,
  ResumeTemplateId,
} from '@/types/resume'
import type { Profile } from '@/types/profile'
import type {
  TemplateDefinition,
  SubItemRenderer,
  SectionRenderer,
  ModuleRendererProps,
} from './types'
import { getTemplateDefinition } from './registry'
import { getBaseStyles, applyStyleOverrides } from './base-styles'
import { getPreviewConfig } from '@/utils/resume-preview'
import { resolveResumeView } from '@/utils/resolve-resume-view'
import { DefaultBasicInfoHeader } from './common/BasicInfoHeader'
import { renderStandardModule } from './common/StandardModuleRenderer'

// ── 默认渲染回调 ──

function defaultSectionRenderer(module: ResumeModuleType, children: ReactNode) {
  return (
    <section
      key={module}
      data-module={module}
      style={{
        position: 'relative',
        borderRadius: 3,
        padding: '4px 6px',
        marginLeft: -6,
        marginRight: -6,
        marginBottom: 0,
        backgroundColor: 'transparent',
        borderTop: '2px solid transparent',
      }}
    >
      {children}
    </section>
  )
}

function defaultSubItemRenderer(module: ResumeModuleType, index: number, _total: number, children: ReactNode) {
  return <div key={`${module}-${index}`}>{children}</div>
}

// ── Props ──

interface BaseResumePreviewProps {
  content: ResumeContent
  modulesConfig: ModulesConfig
  modulesOrder: ResumeModuleType[]
  template: ResumeTemplateId
  profile?: Profile
  fontSize?: number
  lineHeight?: number
  renderSection?: SectionRenderer
  renderSubItem?: SubItemRenderer
}

/**
 * 基于模板定义的简历渲染骨架
 */
export function BaseResumePreview({
  content,
  modulesConfig,
  modulesOrder,
  template,
  profile,
  fontSize,
  lineHeight,
  renderSection = defaultSectionRenderer,
  renderSubItem = defaultSubItemRenderer,
}: BaseResumePreviewProps) {
  // ── 解析模板定义 ──
  const templateDef = getTemplateDefinition(template)
  const { renderer } = templateDef

  // ── 计算配置和样式 ──
  const previewConfig = getPreviewConfig(content.preview_config)
  const resolvedFontSize = fontSize ?? previewConfig.fontSize
  const resolvedLineHeight = lineHeight ?? previewConfig.lineHeight
  const config = templateDef.config
  const baseStyles = getBaseStyles(config, resolvedFontSize, resolvedLineHeight)
  const styles = applyStyleOverrides(baseStyles, renderer.styleOverrides, {
    primaryColor: config.primaryColor,
    textColor: config.textColor,
    fontSize: resolvedFontSize,
    lineHeight: resolvedLineHeight,
  })
  const s = (n: number) => Math.round(resolvedFontSize * n * 10) / 10

  // ── 解析 ViewModel ──
  const viewModel = resolveResumeView(content, profile, modulesConfig, modulesOrder, template)

  // ── 如果模板定义了完全自定义 Renderer，委托给它 ──
  if (renderer.Renderer) {
    const RendererComponent = renderer.Renderer
    return (
      <RendererComponent
        content={content}
        modulesConfig={modulesConfig}
        modulesOrder={modulesOrder}
        template={template}
        profile={profile}
        styles={styles}
        viewModel={viewModel}
        config={config}
        resolvedFontSize={resolvedFontSize}
        resolvedLineHeight={resolvedLineHeight}
        renderSection={renderSection}
        renderSubItem={renderSubItem}
      />
    )
  }

  // ── 通用渲染逻辑 ──

  /** 渲染单个模块的内容 */
  function renderModuleContent(module: ResumeModuleType): ReactNode {
    if (module === 'basic_info') {
      const BasicInfoHeader = renderer.BasicInfoHeader || DefaultBasicInfoHeader
      return (
        <BasicInfoHeader
          basicInfo={content.basic_info}
          template={template}
          primaryColor={config.primaryColor}
          styles={styles}
          extraDisplayItems={viewModel.basicInfo.extras}
          fieldIcons={content.basic_info_display?.field_icons}
          contactItems={viewModel.basicInfo.contacts}
          intentionItems={viewModel.basicInfo.intentions}
          nameFontSize={s(1.7)}
          centerNameFontSize={s(2.2)}
          contactFontSize={s(0.9)}
          intentionFontSize={s(0.9)}
          iconOverrides={renderer.iconOverrides}
          avatarLeft={content.basic_info_display?.avatar_left}
        />
      )
    }

    // 检查模板是否有自定义模块渲染器
    const customRenderer = renderer.moduleRenderers?.[module]
    if (customRenderer) {
      const CustomRenderer = customRenderer
      return (
        <CustomRenderer
          module={module}
          content={content}
          styles={styles}
          renderSubItem={renderSubItem}
          resolvedFontSize={resolvedFontSize}
          s={s}
        />
      )
    }

    // 使用默认模块渲染器
    return renderStandardModule({
      module,
      content,
      styles,
      renderSubItem,
      s,
    })
  }

  /** 渲染单个模块（含 section 包装和开关检查） */
  function renderSectionContent(module: ResumeModuleType): ReactNode {
    if (!modulesConfig[module]) return null
    const contentNode = renderModuleContent(module)
    if (!contentNode) return null
    return renderSection(module, contentNode)
  }

  // ── 页面布局 ──

  // 如果模板声明了 layoutSlots，按 slot 分区渲染
  if (renderer.layoutSlots) {
    const { slots, slotOrder } = renderer.layoutSlots
    return (
      <div style={styles.page}>
        {slotOrder.map((slotName) => {
          const slotModules = slots[slotName] || []
          const slotModulesInOrder = modulesOrder.filter((m) => slotModules.includes(m))
          const slotStyle = slotName === 'sidebar' ? styles.sidebar
            : slotName === 'main' ? styles.main
            : undefined

          return (
            <div key={slotName} style={slotStyle}>
              {slotName === 'sidebar' && (
                <div style={{ marginBottom: 20 }}>
                  <div style={styles.sidebarName}>{content.basic_info?.name || '您的姓名'}</div>
                </div>
              )}
              {slotModulesInOrder.map((m) => renderSectionContent(m))}
            </div>
          )
        })}
      </div>
    )
  }

  // 默认：单栏线性渲染
  return (
    <div style={styles.page}>
      {modulesOrder.map((m, i, arr) => {
        const section = renderSectionContent(m)
        if (!section) return null
        const isLast = i === arr.length - 1
        return (
          <div key={m} style={{ marginBottom: isLast ? 0 : styles.section.marginBottom }}>
            {section}
          </div>
        )
      })}
    </div>
  )
}
