/**
 * 通用模块渲染器
 *
 * 提供：
 * - StandardArrayEntries：通用数组模块渲染（education/work_experience/research/other_experience）
 * - renderSkillsModule：默认 skills 渲染（粗体+行内描述）
 * - renderAwardsModule：awards 渲染
 * - renderPortfolioModule：默认 portfolio 渲染
 * - renderProjectsModule：默认 projects 渲染
 * - renderSummaryModule：summary 渲染
 */

import type { ResumeContent, ResumeModuleType } from '@/types/resume'
import type { ResolvedStyles, SubItemRenderer } from '../types'
import type { Locale } from '@/i18n/locales'
import {
  desc,
  MODULE_RENDERERS,
  isFieldHiddenOnItem,
} from '@/utils/resume-preview'
import { getResolvedModuleTitle } from '@/utils/module-title'
import { DescriptionHtml } from './DescriptionHtml'
import { SectionTitle } from './SectionTitle'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyItem = any

/** 通用数组模块渲染（education/work_experience/research/other_experience） */
export function StandardArrayEntries({
  module,
  content,
  styles,
  renderSubItem,
  locale,
}: {
  module: keyof typeof MODULE_RENDERERS
  content: ResumeContent
  styles: ResolvedStyles
  renderSubItem: SubItemRenderer
  locale: Locale
}) {
  const renderer = MODULE_RENDERERS[module]
  if (!renderer) return null
  const items = renderer.getItems(content)

  return (
    <>
      <SectionTitle styles={styles}>{getResolvedModuleTitle(module, content, locale)}</SectionTitle>
      {items.map((item, i) => renderSubItem(module, i, items.length, (
        <div style={styles.entry}>
          <div style={styles.entryHeader}>
            <span style={styles.entryTitle}>{renderer.getTitle(item)}</span>
            {renderer.getDate && <span style={styles.entryDate}>{renderer.getDate(item, locale)}</span>}
          </div>
          {renderer.getSubtitle && (
            <div style={styles.entrySubtitle}>{renderer.getSubtitle(item)}</div>
          )}
          {renderer.getDescription && item.description && (
            <DescriptionHtml value={renderer.getDescription(item)} style={styles.description} />
          )}
        </div>
      )))}
    </>
  )
}

/** summary 模块渲染 */
export function renderSummaryModule({
  content,
  styles,
  locale,
}: {
  content: ResumeContent
  styles: ResolvedStyles
  locale: Locale
}) {
  const text = desc(content.summary)
  if (!text) return null
  return (
    <>
      <SectionTitle styles={styles}>{getResolvedModuleTitle('summary', content, locale)}</SectionTitle>
      {text && <DescriptionHtml value={content.summary} style={styles.description} />}
    </>
  )
}

/** 默认 skills 渲染（块级条目 + 独立描述行，与 black-white 风格一致） */
export function renderSkillsModule({
  content,
  styles,
  renderSubItem,
  locale,
}: {
  content: ResumeContent
  styles: ResolvedStyles
  renderSubItem: SubItemRenderer
  locale: Locale
  s: (scale: number) => number
}) {
  const skills: AnyItem[] = content.skills || []
  return (
    <>
      <SectionTitle styles={styles}>{getResolvedModuleTitle('skills', content, locale)}</SectionTitle>
      {skills.map((skill, i) => {
        const showName = skill.name && !isFieldHiddenOnItem(skill, 'name')
        return renderSubItem('skills', i, skills.length, (
          <div style={styles.entry}>
            {showName && <div style={styles.entryTitle}>{skill.name}</div>}
            {skill.description && (
              <DescriptionHtml
                value={skill.description}
                style={{ ...styles.description, marginTop: showName ? 2 : 0 }}
              />
            )}
          </div>
        ))
      })}
    </>
  )
}

/** awards 模块渲染 */
export function renderAwardsModule({
  content,
  styles,
  renderSubItem,
  locale,
}: {
  content: ResumeContent
  styles: ResolvedStyles
  renderSubItem: SubItemRenderer
  locale: Locale
}) {
  const awards: AnyItem[] = content.awards || []
  return (
    <>
      <SectionTitle styles={styles}>{getResolvedModuleTitle('awards', content, locale)}</SectionTitle>
      {awards.map((award, i) => renderSubItem('awards', i, awards.length, (
        <div style={styles.entry}>
          <div style={styles.entryHeader}>
            <span style={styles.entryTitle}>{award.name}</span>
            {award.date && <span style={styles.entryDate}>{award.date}</span>}
          </div>
          {award.description && (
            <DescriptionHtml value={award.description} style={styles.description} />
          )}
        </div>
      )))}
    </>
  )
}

/** 默认 portfolio 渲染（classic/minimal/modern 使用） */
export function renderPortfolioModule({
  content,
  styles,
  renderSubItem,
  locale,
}: {
  content: ResumeContent
  styles: ResolvedStyles
  renderSubItem: SubItemRenderer
  locale: Locale
}) {
  const portfolio: AnyItem[] = content.portfolio || []
  return (
    <>
      <SectionTitle styles={styles}>{getResolvedModuleTitle('portfolio', content, locale)}</SectionTitle>
      {portfolio.map((item, i) => renderSubItem('portfolio', i, portfolio.length, (
        <div style={styles.entry}>
          <div style={styles.entryTitle}>{item.name}</div>
          {item.link && !isFieldHiddenOnItem(item, 'link') && <div style={styles.entrySubtitle}>{item.link}</div>}
          {item.description && (
            <DescriptionHtml value={item.description} style={styles.description} />
          )}
        </div>
      )))}
    </>
  )
}

/** 默认 projects 渲染（classic/minimal/modern 使用，委托给 StandardArrayEntries） */
export function renderProjectsModule({
  content,
  styles,
  renderSubItem,
  locale,
}: {
  content: ResumeContent
  styles: ResolvedStyles
  renderSubItem: SubItemRenderer
  locale: Locale
}) {
  return (
    <StandardArrayEntries
      module="projects"
      content={content}
      styles={styles}
      renderSubItem={renderSubItem}
      locale={locale}
    />
  )
}

/** 通用模块渲染入口（根据模块类型分发） */
export function renderStandardModule({
  module,
  content,
  styles,
  renderSubItem,
  locale,
  s,
}: {
  module: ResumeModuleType
  content: ResumeContent
  styles: ResolvedStyles
  renderSubItem: SubItemRenderer
  locale: Locale
  s: (scale: number) => number
}): React.ReactNode {
  switch (module) {
    case 'summary':
      return renderSummaryModule({ content, styles, locale })
    case 'skills':
      return renderSkillsModule({ content, styles, renderSubItem, locale, s })
    case 'awards':
      return renderAwardsModule({ content, styles, renderSubItem, locale })
    case 'portfolio':
      return renderPortfolioModule({ content, styles, renderSubItem, locale })
    case 'projects':
      return renderProjectsModule({ content, styles, renderSubItem, locale })
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
          locale={locale}
        />
      )
    default:
      return null
  }
}
