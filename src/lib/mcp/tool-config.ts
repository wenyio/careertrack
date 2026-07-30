import type { ResumeModuleType, ResumeTemplateId } from '@/types/resume'

/** MCP schema 与简历工具共用的合法模块。 */
export const VALID_MODULES: ResumeModuleType[] = [
  'basic_info',
  'education',
  'skills',
  'work_experience',
  'projects',
  'portfolio',
  'awards',
  'other_experience',
  'research',
  'summary',
]

export const VALID_TEMPLATES: ResumeTemplateId[] = [
  'classic',
  'modern',
  'minimal',
  'black-white',
]

const MODULE_LABELS: Record<ResumeModuleType, string> = {
  basic_info: '基本信息',
  education: '教育经历',
  skills: '专业技能',
  work_experience: '工作经历',
  projects: '项目经历',
  portfolio: '个人作品',
  awards: '荣誉奖项',
  other_experience: '其他经历',
  research: '研究经历',
  summary: '个人简介',
}

export function getModuleLabel(module: ResumeModuleType): string {
  return MODULE_LABELS[module]
}
