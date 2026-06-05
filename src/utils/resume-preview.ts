/**
 * 简历预览公共工具
 *
 * 供 ResumeHtmlPreview、ResumeMiniPreview、ResumeLivePreview 共用。
 * 统一富文本处理、内容检测、模块标题和数据提取逻辑。
 */

import type { ResumeContent, ResumeModuleType, DescriptionField, ResumePreviewConfig, BasicInfoDisplayItem, BasicInfoDisplayConfig, ModulesConfig, ResumeTemplateId } from '@/types/resume'
import type { BasicInfo, Profile } from '@/types/profile'
import { richTextToPlainText } from '@/utils/rich-text'
import { richTextToHtml } from '@/utils/rich-text'
import { formatDateRange } from '@/utils/format'

/** 富文本 → 纯文本（三处预览统一使用） */
export function desc(d?: DescriptionField | unknown): string {
  return richTextToPlainText((d || '') as Parameters<typeof richTextToPlainText>[0])
}

/** 描述字段转 HTML（保留富文本格式） */
export function descToHtml(d?: DescriptionField | unknown): string {
  if (!d) return ''
  return richTextToHtml(d as Parameters<typeof richTextToHtml>[0])
}

/** 简历是否有实际内容 */
export function hasContent(content: ResumeContent): boolean {
  return !!(
    content.basic_info?.name ||
    (content.education && content.education.length > 0) ||
    (content.work_experience && content.work_experience.length > 0) ||
    (content.projects && content.projects.length > 0) ||
    (content.skills && content.skills.length > 0) ||
    (content.awards && content.awards.length > 0) ||
    (content.portfolio && content.portfolio.length > 0) ||
    (content.research && content.research.length > 0) ||
    (content.other_experience && content.other_experience.length > 0) ||
    content.summary
  )
}

export const DEFAULT_PREVIEW_CONFIG: ResumePreviewConfig = {
  fontSize: 14,
  lineHeight: 1.5,
}

/** 归一化预览显示配置，避免旧数据或异常值影响渲染 */
export function getPreviewConfig(config?: Partial<ResumePreviewConfig>): ResumePreviewConfig {
  return {
    fontSize: typeof config?.fontSize === 'number' ? config.fontSize : DEFAULT_PREVIEW_CONFIG.fontSize,
    lineHeight: typeof config?.lineHeight === 'number' ? config.lineHeight : DEFAULT_PREVIEW_CONFIG.lineHeight,
  }
}

export type BasicInfoContactField = 'phone' | 'email' | 'city' | 'wechat' | 'github' | 'website'
export type BasicInfoIntentionField = 'current_status' | 'position' | 'position_label' | 'expected_city' | 'expected_salary'

/** 按指定字段组装基本信息联系方式（结构化版本，按 field 映射图标） */
export function getBasicInfoContactItemsStructured(
  basicInfo: Partial<BasicInfo> | undefined,
  fields: BasicInfoContactField[],
): BasicInfoDisplayItem[] {
  if (!basicInfo) return []

  const values: Record<BasicInfoContactField, string | undefined> = {
    phone: basicInfo.phone,
    email: basicInfo.email,
    city: basicInfo.other?.city,
    wechat: basicInfo.other?.wechat,
    github: basicInfo.other?.github,
    website: basicInfo.other?.website,
  }

  return fields
    .map((field) => {
      const value = values[field]
      if (!value) return null
      return { field, value }
    })
    .filter(Boolean) as BasicInfoDisplayItem[]
}

/** 按指定字段组装求职意向信息 */
export function getBasicInfoIntentionItems(
  basicInfo: Partial<BasicInfo> | undefined,
  fields: BasicInfoIntentionField[],
  options?: { requirePosition?: boolean },
): string[] {
  const jobIntention = basicInfo?.job_intention
  if (!jobIntention || (options?.requirePosition && !jobIntention.position)) return []

  const values: Record<BasicInfoIntentionField, string | undefined> = {
    current_status: jobIntention.current_status,
    position: jobIntention.position,
    position_label: jobIntention.position ? `期望职位：${jobIntention.position}` : undefined,
    expected_city: jobIntention.expected_city,
    expected_salary: jobIntention.expected_salary,
  }

  return fields.map((field) => values[field]).filter(Boolean) as string[]
}

/** 获取基本信息额外字段的展示项（根据 displayConfig 的 visible_extra_fields） */
export function getBasicInfoExtraDisplayItems(
  basicInfo: Partial<BasicInfo> | undefined,
  displayConfig?: BasicInfoDisplayConfig,
): BasicInfoDisplayItem[] {
  if (!basicInfo || !displayConfig?.visible_extra_fields?.length) return []

  const other = basicInfo.other
  if (!other) return []

  return displayConfig.visible_extra_fields
    .map((field) => {
      let value: string | number | undefined
      switch (field) {
        case 'education_level': value = other.education_level; break
        case 'age': value = other.age; break
        case 'work_years': value = other.work_years; break
        case 'gender': value = other.gender; break
        case 'city': value = other.city; break
        case 'github': value = other.github; break
        case 'website': value = other.website; break
        case 'height': value = (other as unknown as Record<string, unknown>).height as string; break
        case 'weight': value = (other as unknown as Record<string, unknown>).weight as string; break
        case 'native_place': value = (other as unknown as Record<string, unknown>).native_place as string; break
        case 'nation': value = (other as unknown as Record<string, unknown>).nation as string; break
        case 'political_status': value = (other as unknown as Record<string, unknown>).political_status as string; break
        case 'marital_status': value = (other as unknown as Record<string, unknown>).marital_status as string; break
        case 'birthday': value = (other as unknown as Record<string, unknown>).birthday as string; break
        default: value = undefined
      }
      if (value === undefined || value === null || value === '') return null
      if (field !== 'work_years' && value === 0) return null
      const displayValue = field === 'work_years' ? (value === 0 ? '应届生' : `${value}年`) : String(value)
      return { field, value: displayValue }
    })
    .filter(Boolean) as BasicInfoDisplayItem[]
}

/** 检查数组模块条目中某字段是否被隐藏 */
export function isFieldHiddenOnItem(item: unknown, field: string): boolean {
  if (!item || typeof item !== 'object') return false
  const hidden = (item as Record<string, unknown>)._hidden_fields
  return Array.isArray(hidden) && hidden.includes(field)
}

/**
 * 切换数组模块条目中某字段的隐藏状态（不可变更新）
 *
 * - 不修改原对象。
 * - 字段已隐藏则移除，未隐藏则添加。
 * - 隐藏列表为空时删除 _hidden_fields，减少 JSON 噪音。
 */
export function toggleHiddenFieldOnItem<T extends Record<string, unknown>>(item: T, field: string): T {
  const hidden = ((item as Record<string, unknown>)._hidden_fields as string[] | undefined) || []
  const isHidden = hidden.includes(field)
  const newHidden = isHidden
    ? hidden.filter((f) => f !== field)
    : [...hidden, field]
  if (newHidden.length === 0) {
    const { _hidden_fields: _, ...rest } = item as Record<string, unknown> // eslint-disable-line @typescript-eslint/no-unused-vars
    return rest as T
  }
  return { ...item, _hidden_fields: newHidden }
}

/** 将简历内容与个人档案 fallback 合并，供编辑器实时预览展示使用（不用于保存） */
export function mergeResumeContentWithProfile(content: ResumeContent, profile?: Profile) {
  return {
    basic_info: (content.basic_info && Object.keys(content.basic_info).length > 0) ? content.basic_info : profile?.basic_info,
    education: content.education || profile?.education || [],
    skills: content.skills || profile?.skills || [],
    work_experience: content.work_experience || profile?.work_experience || [],
    projects: content.projects || profile?.projects || [],
    portfolio: content.portfolio || profile?.portfolio || [],
    awards: content.awards || profile?.awards || [],
    other_experience: content.other_experience || profile?.other_experience || [],
    research: content.research || profile?.research || [],
    summary: content.summary || profile?.summary || '',
    preview_config: content.preview_config,
    basic_info_display: content.basic_info_display,
    module_titles: content.module_titles,
  }
}

/**
 * 构建简历保存 payload（纯函数，不依赖 profile）
 *
 * 设计原则：
 * - 保存内容完全来自 store 当前状态，不隐式 merge 最新 profile。
 * - `preview_config` 归一化为合法默认值。
 * - 保留 `basic_info_display`、`module_titles` 等简历独有配置。
 * - profile 数据的初始化应在"创建简历"或"显式导入"流程中完成，而非保存时自动补齐。
 */
export function buildResumeSavePayload(store: {
  resumeName?: string
  modulesConfig: ModulesConfig
  modulesOrder: ResumeModuleType[]
  content: ResumeContent
  template?: ResumeTemplateId
}, fallbackName?: string) {
  return {
    name: (store.resumeName?.trim() || fallbackName || '未命名简历'),
    modules_config: store.modulesConfig,
    modules_order: store.modulesOrder,
    content: {
      ...store.content,
      preview_config: getPreviewConfig(store.content.preview_config),
    },
    template: store.template,
  }
}

/** 模块中文标题映射 */
export const MODULE_TITLES: Record<ResumeModuleType, string> = {
  basic_info: '',
  summary: '个人简介',
  skills: '专业技能',
  education: '教育经历',
  work_experience: '工作经历',
  projects: '项目经历',
  awards: '荣誉奖项',
  portfolio: '个人作品',
  research: '研究经历',
  other_experience: '其他经历',
}

/** 数组模块的渲染配置 */
export interface ModuleRenderer {
  /** 从简历数据中提取条目列表 */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getItems: (content: ResumeContent) => any[]
  /** 提取标题字段 */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getTitle: (item: any) => string
  /** 提取日期字段（可选） */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getDate?: (item: any) => string
  /** 提取副标题字段（可选） */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getSubtitle?: (item: any) => string | undefined
  /** 提取描述字段（可选） */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getDescription?: (item: any) => unknown
}

/** 构建 subtitle，自动过滤 _hidden_fields 中的字段 */
function buildSubtitle(item: Record<string, unknown>, parts: Array<{ field: string; value: unknown }>): string | undefined {
  const visible = parts
    .filter((p) => p.value && !isFieldHiddenOnItem(item, p.field))
    .map((p) => p.value)
  return visible.length > 0 ? visible.join(' · ') : undefined
}

/** 数组模块的统一渲染配置（教育/工作/项目/研究/其他经历/技能/奖项/作品） */
export const MODULE_RENDERERS: Partial<Record<ResumeModuleType, ModuleRenderer>> = {
  education: {
    getItems: (c) => c.education || [],
    getTitle: (e) => e.school || '',
    getDate: (e) => formatDateRange(e.start_date, e.end_date),
    getSubtitle: (e) => buildSubtitle(e, [
      { field: 'major', value: e.major },
      { field: 'degree', value: e.degree },
      { field: 'degree_type', value: e.degree_type },
      { field: 'college', value: e.college },
      { field: 'city', value: e.city },
    ]),
    getDescription: (e) => e.description,
  },
  work_experience: {
    getItems: (c) => c.work_experience || [],
    getTitle: (w) => w.company || '',
    getDate: (w) => formatDateRange(w.start_date, w.end_date),
    getSubtitle: (w) => buildSubtitle(w, [
      { field: 'position', value: w.position },
      { field: 'department', value: w.department },
      { field: 'city', value: w.city },
    ]),
    getDescription: (w) => w.description,
  },
  projects: {
    getItems: (c) => c.projects || [],
    getTitle: (p) => p.name || '',
    getDate: (p) => formatDateRange(p.start_date, p.end_date),
    getSubtitle: (p) => buildSubtitle(p, [
      { field: 'role', value: p.role },
      { field: 'city', value: p.city },
    ]),
    getDescription: (p) => p.description,
  },
  research: {
    getItems: (c) => c.research || [],
    getTitle: (r) => r.name || '',
    getDate: (r) => formatDateRange(r.start_date, r.end_date),
    getSubtitle: (r) => buildSubtitle(r, [
      { field: 'role', value: r.role },
      { field: 'department', value: r.department },
      { field: 'city', value: r.city },
    ]),
    getDescription: (r) => r.description,
  },
  other_experience: {
    getItems: (c) => c.other_experience || [],
    getTitle: (o) => o.name || '',
    getDate: (o) => formatDateRange(o.start_date, o.end_date),
    getSubtitle: (o) => buildSubtitle(o, [
      { field: 'role', value: o.role },
      { field: 'department', value: o.department },
      { field: 'city', value: o.city },
    ]),
    getDescription: (o) => o.description,
  },
  skills: {
    getItems: (c) => c.skills || [],
    getTitle: (s) => s.name || '',
    getDescription: (s) => s.description,
  },
  awards: {
    getItems: (c) => c.awards || [],
    getTitle: (a) => a.name || '',
    getDate: (a) => a.date,
    getDescription: (a) => a.description,
  },
  portfolio: {
    getItems: (c) => c.portfolio || [],
    getTitle: (p) => p.name || '',
    getDescription: (p) => p.description,
  },
}
