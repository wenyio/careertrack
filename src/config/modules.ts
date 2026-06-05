/**
 * 模块配置
 *
 * 统一定义所有简历模块的配置信息
 * 避免在多个文件中重复定义
 */

import type { ResumeModuleType, ModulesConfig } from '@/types/resume'

/** 模块配置项 */
export interface ModuleConfig {
  key: ResumeModuleType
  label: string
  icon: string
  description?: string
}

/** 所有模块配置 */
export const MODULES: ModuleConfig[] = [
  { key: 'basic_info', label: '基本信息', icon: '👤', description: '姓名、联系方式、求职意向等' },
  { key: 'education', label: '教育经历', icon: '🎓', description: '学校、专业、学历等' },
  { key: 'skills', label: '专业技能', icon: '⚡', description: '技能名称、熟练程度等' },
  { key: 'work_experience', label: '工作经历', icon: '💼', description: '公司、职位、工作内容等' },
  { key: 'projects', label: '项目经历', icon: '🚀', description: '项目名称、角色、成果等' },
  { key: 'portfolio', label: '个人作品', icon: '🎨', description: '作品名称、链接、描述等' },
  { key: 'awards', label: '荣誉奖项', icon: '🏆', description: '获奖名称、时间、级别等' },
  { key: 'other_experience', label: '其他经历', icon: '📌', description: '志愿者、社团、其他经历等' },
  { key: 'research', label: '研究经历', icon: '📚', description: '研究课题、成果、发表论文等' },
  { key: 'summary', label: '个人简介', icon: '📝', description: '个人总结、职业目标等' },
]

/** 默认模块排序（从 MODULES 数组自动派生，修改 MODULES 即可同步） */
export const DEFAULT_MODULES_ORDER: ResumeModuleType[] = MODULES.map((m) => m.key)

/** 默认模块开关配置 */
export const DEFAULT_MODULES_CONFIG: ModulesConfig = {
  basic_info: true,
  education: true,
  skills: true,
  work_experience: true,
  projects: true,
  portfolio: false,
  awards: false,
  other_experience: false,
  research: false,
  summary: false,
}

/** 模块键值映射（方便快速查找） */
export const MODULE_MAP: Record<ResumeModuleType, ModuleConfig> = MODULES.reduce(
  (acc, module) => ({ ...acc, [module.key]: module }),
  {} as Record<ResumeModuleType, ModuleConfig>
)

/** 获取模块标签 */
export function getModuleLabel(key: ResumeModuleType): string {
  return MODULE_MAP[key]?.label || key
}

/** 获取模块图标 */
export function getModuleIcon(key: ResumeModuleType): string {
  return MODULE_MAP[key]?.icon || '📄'
}

/** 获取模块描述 */
export function getModuleDescription(key: ResumeModuleType): string {
  return MODULE_MAP[key]?.description || ''
}
