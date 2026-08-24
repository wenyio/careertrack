/**
 * 模块标题解析工具
 *
 * 解析模块标题：自定义标题 > 默认标题。
 * 统一在表单、预览、公开页、PDF 中使用。
 */

import type { ResumeModuleType, ResumeContent } from '@/types/resume'
import { MODULE_TITLES } from '@/utils/resume-preview'
import { getModuleLabel } from '@/config/modules'
import { DEFAULT_LOCALE, type Locale } from '@/i18n/locales'
import { messages } from '@/i18n/messages'

const MODULE_TITLE_KEYS: Record<ResumeModuleType, keyof typeof messages['en-US']['modules'] | ''> = {
  basic_info: 'basic_info',
  summary: 'summary',
  skills: 'skills',
  education: 'education',
  work_experience: 'work_experience',
  projects: 'projects',
  awards: 'awards',
  portfolio: 'portfolio',
  research: 'research',
  other_experience: 'other_experience',
}

/**
 * 获取模块的最终显示标题
 *
 * 优先使用 content.module_titles 中的自定义标题，
 * 否则使用 MODULE_TITLES 中的默认标题。
 */
export function getResolvedModuleTitle(
  module: ResumeModuleType,
  content?: ResumeContent,
  locale: Locale = DEFAULT_LOCALE,
): string {
  const customTitle = content?.module_titles?.[module]
  if (customTitle && customTitle.trim()) return customTitle.trim()
  const key = MODULE_TITLE_KEYS[module]
  if (key && locale !== DEFAULT_LOCALE) return messages[locale].modules[key]
  return MODULE_TITLES[module] || getModuleLabel(module)
}
