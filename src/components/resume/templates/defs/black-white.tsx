/**
 * 黑白整齐模板定义
 *
 * 经典黑白配色，左对齐 header + 右侧头像，
 * portfolio/projects 有自定义布局。
 */

import type { ReactNode } from 'react'
import type {
  TemplateDefinition,
  TemplateRendererProps,
  ModuleRendererProps,
} from '../types'
import type { ResumeModuleType } from '@/types/resume'
import { formatDateRange } from '@/utils/format'
import { isFieldHiddenOnItem } from '@/utils/resume-preview'
import { getResolvedModuleTitle } from '@/utils/module-title'
import {
  StandardBasicInfoHeader,
  DescriptionHtml,
  SectionTitle,
  renderSkillsModule,
  DEFAULT_INTENTION_RESOLVE_OVERRIDES,
} from '../common'
import { StandardArrayEntries } from '../common/StandardModuleRenderer'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyItem = any

// ── 骨架预览 ──

/** 黑白整齐模板骨架预览 */
function BlackWhiteSkeletonPreview() {
  return (
    <div style={{ flex: 1, backgroundColor: '#fff', padding: 6, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <div style={{ flex: 1 }}>
          <div style={{ height: 5, backgroundColor: '#1f2937', borderRadius: 1, width: '40%', marginBottom: 2 }} />
          <div style={{ display: 'flex', gap: 3, marginBottom: 1 }}>
            <div style={{ height: 2, backgroundColor: '#d1d5db', borderRadius: 1, width: 18 }} />
            <div style={{ height: 2, backgroundColor: '#d1d5db', borderRadius: 1, width: 22 }} />
            <div style={{ height: 2, backgroundColor: '#d1d5db', borderRadius: 1, width: 15 }} />
          </div>
          <div style={{ display: 'flex', gap: 3 }}>
            <div style={{ height: 2, backgroundColor: '#d1d5db', borderRadius: 1, width: 20 }} />
            <div style={{ height: 2, backgroundColor: '#d1d5db', borderRadius: 1, width: 16 }} />
          </div>
        </div>
        <div style={{ width: 10, height: 12, backgroundColor: '#e5e7eb', borderRadius: 1, marginLeft: 6, flexShrink: 0 }} />
      </div>
      <div style={{ height: 3, backgroundColor: '#1f2937', borderRadius: 1, width: '30%', marginBottom: 2 }} />
      <div style={{ height: 1, backgroundColor: '#1f2937', marginBottom: 3 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 1 }}>
        <div style={{ height: 3, backgroundColor: '#374151', borderRadius: 1, width: '35%' }} />
        <div style={{ height: 2, backgroundColor: '#d1d5db', borderRadius: 1, width: '25%' }} />
      </div>
      <div style={{ height: 2, backgroundColor: '#e5e7eb', borderRadius: 1, width: '50%', marginBottom: 3 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 1 }}>
        <div style={{ height: 3, backgroundColor: '#374151', borderRadius: 1, width: '30%' }} />
        <div style={{ height: 2, backgroundColor: '#d1d5db', borderRadius: 1, width: '25%' }} />
      </div>
      <div style={{ height: 2, backgroundColor: '#e5e7eb', borderRadius: 1, width: '45%' }} />
    </div>
  )
}

// ── 自定义模块渲染器 ──

/** black-white portfolio：flex 行 + 缩略图 */
function BlackWhitePortfolioRenderer({ content, styles, renderSubItem }: ModuleRendererProps) {
  const portfolio: AnyItem[] = content.portfolio || []
  return (
    <>
      <SectionTitle styles={styles}>{getResolvedModuleTitle('portfolio', content)}</SectionTitle>
      {portfolio.map((item, i) => renderSubItem('portfolio', i, portfolio.length, (
        <div style={{ ...styles.entry, display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={styles.entryTitle}>
              {item.name}
              {item.link && !isFieldHiddenOnItem(item, 'link') && (
                <a href={item.link} style={{ color: '#2f67ff', fontWeight: 'normal', marginLeft: 8, textDecoration: 'none' }}>
                  {item.link}
                </a>
              )}
            </div>
            {item.description && (
              <DescriptionHtml value={item.description} style={styles.description} />
            )}
          </div>
          {item.image && !isFieldHiddenOnItem(item, 'image') && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.image} alt="" style={{ width: 56, height: 56, objectFit: 'cover', flexShrink: 0 }} />
          )}
        </div>
      )))}
    </>
  )
}

/** black-white projects：role/city 第二行 + 可选链接 */
function BlackWhiteProjectsRenderer({ content, styles, renderSubItem }: ModuleRendererProps) {
  const projects: AnyItem[] = content.projects || []
  return (
    <>
      <SectionTitle styles={styles}>{getResolvedModuleTitle('projects', content)}</SectionTitle>
      {projects.map((project, i) => renderSubItem('projects', i, projects.length, (
        <div style={styles.entry}>
          <div style={styles.entryHeader}>
            <span style={styles.entryTitle}>{project.name}</span>
            <span style={styles.entryDate}>{formatDateRange(project.start_date, project.end_date)}</span>
          </div>
          {([!isFieldHiddenOnItem(project, 'role') && project.role, !isFieldHiddenOnItem(project, 'city') && project.city].filter(Boolean).length > 0 || (project.link && !isFieldHiddenOnItem(project, 'link'))) && (
            <div style={{ ...styles.entryHeader, marginBottom: 4 }}>
              <span style={styles.entrySubtitle}>{[!isFieldHiddenOnItem(project, 'role') && project.role, !isFieldHiddenOnItem(project, 'city') && project.city].filter(Boolean).join('  ')}</span>
              {project.link && !isFieldHiddenOnItem(project, 'link') && (
                <a href={project.link} style={{ ...styles.entryDate, color: '#2f67ff', textDecoration: 'none' }}>
                  {project.link}
                </a>
              )}
            </div>
          )}
          {project.description && (
            <DescriptionHtml value={project.description} style={styles.description} />
          )}
        </div>
      )))}
    </>
  )
}

// ── 自定义 Renderer ──

function BlackWhiteRenderer({
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

  // 模块渲染映射：自定义 or 默认
  const customModuleRenderers: Partial<Record<ResumeModuleType, (props: ModuleRendererProps) => ReactNode>> = {
    skills: (props) => renderSkillsModule({ ...props, s }),
    portfolio: BlackWhitePortfolioRenderer,
    projects: BlackWhiteProjectsRenderer,
  }

  function renderModuleContent(module: ResumeModuleType): ReactNode {
    if (module === 'basic_info') {
      return (
        <StandardBasicInfoHeader
          variant="left"
          basicInfo={basicInfo}
          template={template}
          primaryColor={config.primaryColor}
          styles={styles}
          extraDisplayItems={viewModel.basicInfo.extras}
          fieldIcons={content.basic_info_display?.field_icons}
          contactItems={viewModel.basicInfo.contacts}
          intentionItems={viewModel.basicInfo.intentions}
          iconColor="#000"
          iconFontSize="0.9em"
          iconMarginRight={6}
          textColor="rgba(0, 0, 0, 0.85)"
          intentionColor="#8c8c8c"
          nameFontSize={s(1.55)}
          contactFontSize={resolvedFontSize}
          intentionFontSize={resolvedFontSize}
          intentionMode="items"
          itemStyle={{ whiteSpace: 'nowrap', marginRight: 12 }}
          avatarLeft={content.basic_info_display?.avatar_left}
        />
      )
    }

    const customRenderer = customModuleRenderers[module]
    if (customRenderer) {
      return customRenderer({
        module,
        content,
        styles,
        renderSubItem,
        resolvedFontSize,
        s,
      })
    }

    // 其余模块使用默认渲染
    switch (module) {
      case 'education':
      case 'work_experience':
      case 'research':
      case 'other_experience':
        return (
          <StandardArrayEntries
            module={module}
            content={content}
            styles={styles}
            renderSubItem={renderSubItem}
          />
        )
      default:
        return null
    }
  }

  function renderSectionContent(module: ResumeModuleType) {
    if (!modulesConfig[module]) return null
    const contentNode = renderModuleContent(module)
    if (!contentNode) return null
    return renderSection(module, contentNode)
  }

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

// ── 模板定义导出 ──

export const blackWhiteTemplate: TemplateDefinition = {
  config: {
    id: 'black-white',
    name: '黑白整齐',
    description: '经典黑白配色，头像+左对齐布局，适合正式场合',
    primaryColor: '#000000',
    secondaryColor: '#00000073',
    textColor: 'rgba(0, 0, 0, 0.85)',
    defaultPreviewConfig: { lineHeight: 1.9 },
  },
  renderer: {
    Renderer: BlackWhiteRenderer,
    styleOverrides: ({ s, lineHeight }) => ({
      page: {
        fontFamily: '"Microsoft YaHei", "Noto Sans SC", "PingFang SC", Arial, sans-serif',
        padding: '30px 30px 20px 30px',
        lineHeight,
        color: 'rgba(0, 0, 0, 0.85)',
      },
      section: {
        marginBottom: 0,
      },
      sectionTitle: {
        fontSize: s(1.285),
        fontWeight: 'bold',
        color: '#000000',
        margin: '0 0 10px 0',
        padding: '0 0 6px 0',
        borderBottom: '1px solid #000000',
      },
      entry: {
        marginBottom: 8,
      },
      entryHeader: {
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'baseline',
        marginBottom: 2,
      },
      entryTitle: {
        fontSize: s(1.07),
        fontWeight: 'bold',
        color: '#000000',
      },
      entryDate: {
        color: '#00000073',
        marginLeft: 'auto',
        flexShrink: 0,
      },
      entrySubtitle: {
        color: '#00000073',
        marginBottom: 4,
      },
      description: {
        color: 'rgba(0, 0, 0, 0.85)',
      },
      contactItem: {
        color: 'rgba(0, 0, 0, 0.85)',
      },
    }),
  },
  SkeletonPreview: BlackWhiteSkeletonPreview,
  resolveOverrides: DEFAULT_INTENTION_RESOLVE_OVERRIDES,
}
