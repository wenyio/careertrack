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

/** 数组模块导入配置 */
export interface ArrayModuleImportConfig<T> {
  modalTitle: string
  emptyText: string
  getItemTitle: (item: T) => string
  getItemSubtitle?: (item: T) => string | undefined
  getSignature: (item: T) => string
}

/** 截取富文本前 N 个字符作为预览 */
function truncateDescription(desc: DescriptionField | undefined, maxLen = 60): string {
  if (!desc) return ''
  const text = richTextToPlainText(desc)
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen) + '...'
}

export const PROFILE_IMPORT_CONFIG = {
  education: {
    modalTitle: '从个人信息导入教育经历',
    emptyText: '个人信息中暂无教育经历',
    getItemTitle: (item: Education) => item.school || '未填写学校',
    getItemSubtitle: (item: Education) =>
      [item.major, item.degree, formatDateRange(item.start_date, item.end_date)]
        .filter(Boolean)
        .join(' · ') || undefined,
    getSignature: (item: Education) =>
      `edu:${item.school}:${item.major}:${item.start_date}`,
  } satisfies ArrayModuleImportConfig<Education>,

  skills: {
    modalTitle: '从个人信息导入专业技能',
    emptyText: '个人信息中暂无专业技能',
    getItemTitle: (item: Skill) => item.name || '未填写技能',
    getItemSubtitle: (item: Skill) => truncateDescription(item.description) || undefined,
    getSignature: (item: Skill) => `skill:${item.name}`,
  } satisfies ArrayModuleImportConfig<Skill>,

  work_experience: {
    modalTitle: '从个人信息导入工作经历',
    emptyText: '个人信息中暂无工作经历',
    getItemTitle: (item: WorkExperience) => item.company || '未填写公司',
    getItemSubtitle: (item: WorkExperience) =>
      [item.position, formatDateRange(item.start_date, item.end_date)]
        .filter(Boolean)
        .join(' · ') || undefined,
    getSignature: (item: WorkExperience) =>
      `work:${item.company}:${item.position}:${item.start_date}`,
  } satisfies ArrayModuleImportConfig<WorkExperience>,

  projects: {
    modalTitle: '从个人信息导入项目经历',
    emptyText: '个人信息中暂无项目经历',
    getItemTitle: (item: Project) => item.name || '未填写项目',
    getItemSubtitle: (item: Project) =>
      [item.role, formatDateRange(item.start_date, item.end_date)]
        .filter(Boolean)
        .join(' · ') || undefined,
    getSignature: (item: Project) =>
      `proj:${item.name}:${item.start_date}`,
  } satisfies ArrayModuleImportConfig<Project>,

  portfolio: {
    modalTitle: '从个人信息导入个人作品',
    emptyText: '个人信息中暂无个人作品',
    getItemTitle: (item: Portfolio) => item.name || '未填写作品',
    getItemSubtitle: (item: Portfolio) => truncateDescription(item.description) || undefined,
    getSignature: (item: Portfolio) => `port:${item.name}`,
  } satisfies ArrayModuleImportConfig<Portfolio>,

  awards: {
    modalTitle: '从个人信息导入荣誉奖项',
    emptyText: '个人信息中暂无荣誉奖项',
    getItemTitle: (item: Award) => item.name || '未填写奖项',
    getItemSubtitle: (item: Award) => item.date || undefined,
    getSignature: (item: Award) => `award:${item.name}:${item.date}`,
  } satisfies ArrayModuleImportConfig<Award>,

  other_experience: {
    modalTitle: '从个人信息导入其他经历',
    emptyText: '个人信息中暂无其他经历',
    getItemTitle: (item: OtherExperience) => item.name || '未填写经历',
    getItemSubtitle: (item: OtherExperience) =>
      [item.role, formatDateRange(item.start_date, item.end_date)]
        .filter(Boolean)
        .join(' · ') || undefined,
    getSignature: (item: OtherExperience) =>
      `other:${item.name}:${item.start_date}`,
  } satisfies ArrayModuleImportConfig<OtherExperience>,

  research: {
    modalTitle: '从个人信息导入研究经历',
    emptyText: '个人信息中暂无研究经历',
    getItemTitle: (item: Research) => item.name || '未填写研究',
    getItemSubtitle: (item: Research) =>
      [item.role, formatDateRange(item.start_date, item.end_date)]
        .filter(Boolean)
        .join(' · ') || undefined,
    getSignature: (item: Research) =>
      `research:${item.name}:${item.start_date}`,
  } satisfies ArrayModuleImportConfig<Research>,
} as const
