/**
 * 个人信息导入配置
 *
 * 定义各数组模块从个人信息导入时的元数据：
 * Modal 标题、列表项显示、去重签名等。
 */

import type {
  Education,
  Skill,
  WorkExperience,
  Project,
  Portfolio,
  Award,
  OtherExperience,
  Research,
} from '@/types/profile'
import { formatDateRange } from '@/utils/format'
import { richTextToPlainText } from '@/utils/rich-text'
import type { DescriptionField } from '@/types/resume'
import type { Locale } from '@/i18n'

/** 数组模块导入配置 */
export interface ArrayModuleImportConfig<T> {
  modalTitle: string
  modalTitleKey?: string
  emptyText: string
  emptyTextKey?: string
  fallbackTitleKey?: string
  getItemTitle: (item: T) => string
  getItemSubtitle?: (item: T, locale?: Locale) => string | undefined
  getSignature: (item: T) => string
}

/** 截取富文本前 N 个字符作为预览 */
function truncateDescription(desc: DescriptionField | undefined, maxLen = 60): string {
  if (!desc) return ''
  const text = richTextToPlainText(desc)
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen) + '...'
}

function normalizeText(value: string | undefined): string {
  return (value || '').trim().toLowerCase()
}

export const PROFILE_IMPORT_CONFIG = {
  education: {
    modalTitle: 'profileImport.educationTitle',
    modalTitleKey: 'profileImport.educationTitle',
    emptyText: 'profileImport.educationEmpty',
    emptyTextKey: 'profileImport.educationEmpty',
    fallbackTitleKey: 'profileImport.educationUntitled',
    getItemTitle: (item: Education) => item.school || '',
    getItemSubtitle: (item: Education, locale?: Locale) =>
      [item.major, item.degree, formatDateRange(item.start_date, item.end_date, 'YYYY-MM', locale)]
        .filter(Boolean)
        .join(' · ') || undefined,
    getSignature: (item: Education) =>
      `edu:${item.school}:${item.major}:${item.start_date}`,
  } satisfies ArrayModuleImportConfig<Education>,

  skills: {
    modalTitle: 'profileImport.skillsTitle',
    modalTitleKey: 'profileImport.skillsTitle',
    emptyText: 'profileImport.skillsEmpty',
    emptyTextKey: 'profileImport.skillsEmpty',
    fallbackTitleKey: 'profileImport.skillsUntitled',
    getItemTitle: (item: Skill) => item.name || '',
    getItemSubtitle: (item: Skill) => truncateDescription(item.description) || undefined,
    getSignature: (item: Skill) => {
      const name = normalizeText(item.name)
      return name ? `skill:${name}` : ''
    },
  } satisfies ArrayModuleImportConfig<Skill>,

  work_experience: {
    modalTitle: 'profileImport.workExperienceTitle',
    modalTitleKey: 'profileImport.workExperienceTitle',
    emptyText: 'profileImport.workExperienceEmpty',
    emptyTextKey: 'profileImport.workExperienceEmpty',
    fallbackTitleKey: 'profileImport.workExperienceUntitled',
    getItemTitle: (item: WorkExperience) => item.company || '',
    getItemSubtitle: (item: WorkExperience, locale?: Locale) =>
      [item.position, formatDateRange(item.start_date, item.end_date, 'YYYY-MM', locale)]
        .filter(Boolean)
        .join(' · ') || undefined,
    getSignature: (item: WorkExperience) =>
      `work:${item.company}:${item.position}:${item.start_date}`,
  } satisfies ArrayModuleImportConfig<WorkExperience>,

  projects: {
    modalTitle: 'profileImport.projectsTitle',
    modalTitleKey: 'profileImport.projectsTitle',
    emptyText: 'profileImport.projectsEmpty',
    emptyTextKey: 'profileImport.projectsEmpty',
    fallbackTitleKey: 'profileImport.projectsUntitled',
    getItemTitle: (item: Project) => item.name || '',
    getItemSubtitle: (item: Project, locale?: Locale) =>
      [item.role, formatDateRange(item.start_date, item.end_date, 'YYYY-MM', locale)]
        .filter(Boolean)
        .join(' · ') || undefined,
    getSignature: (item: Project) =>
      `proj:${item.name}:${item.start_date}`,
  } satisfies ArrayModuleImportConfig<Project>,

  portfolio: {
    modalTitle: 'profileImport.portfolioTitle',
    modalTitleKey: 'profileImport.portfolioTitle',
    emptyText: 'profileImport.portfolioEmpty',
    emptyTextKey: 'profileImport.portfolioEmpty',
    fallbackTitleKey: 'profileImport.portfolioUntitled',
    getItemTitle: (item: Portfolio) => item.name || '',
    getItemSubtitle: (item: Portfolio) => truncateDescription(item.description) || undefined,
    getSignature: (item: Portfolio) => `port:${item.name}`,
  } satisfies ArrayModuleImportConfig<Portfolio>,

  awards: {
    modalTitle: 'profileImport.awardsTitle',
    modalTitleKey: 'profileImport.awardsTitle',
    emptyText: 'profileImport.awardsEmpty',
    emptyTextKey: 'profileImport.awardsEmpty',
    fallbackTitleKey: 'profileImport.awardsUntitled',
    getItemTitle: (item: Award) => item.name || '',
    getItemSubtitle: (item: Award) => item.date || undefined,
    getSignature: (item: Award) => `award:${item.name}:${item.date}`,
  } satisfies ArrayModuleImportConfig<Award>,

  other_experience: {
    modalTitle: 'profileImport.otherExperienceTitle',
    modalTitleKey: 'profileImport.otherExperienceTitle',
    emptyText: 'profileImport.otherExperienceEmpty',
    emptyTextKey: 'profileImport.otherExperienceEmpty',
    fallbackTitleKey: 'profileImport.otherExperienceUntitled',
    getItemTitle: (item: OtherExperience) => item.name || '',
    getItemSubtitle: (item: OtherExperience, locale?: Locale) =>
      [item.role, formatDateRange(item.start_date, item.end_date, 'YYYY-MM', locale)]
        .filter(Boolean)
        .join(' · ') || undefined,
    getSignature: (item: OtherExperience) =>
      `other:${item.name}:${item.start_date}`,
  } satisfies ArrayModuleImportConfig<OtherExperience>,

  research: {
    modalTitle: 'profileImport.researchTitle',
    modalTitleKey: 'profileImport.researchTitle',
    emptyText: 'profileImport.researchEmpty',
    emptyTextKey: 'profileImport.researchEmpty',
    fallbackTitleKey: 'profileImport.researchUntitled',
    getItemTitle: (item: Research) => item.name || '',
    getItemSubtitle: (item: Research, locale?: Locale) =>
      [item.role, formatDateRange(item.start_date, item.end_date, 'YYYY-MM', locale)]
        .filter(Boolean)
        .join(' · ') || undefined,
    getSignature: (item: Research) =>
      `research:${item.name}:${item.start_date}`,
  } satisfies ArrayModuleImportConfig<Research>,
} as const
