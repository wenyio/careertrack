/**
 * 简历相关类型定义
 */

import type {
  BasicInfo,
  Education,
  Skill,
  WorkExperience,
  Project,
  Portfolio,
  Award,
  OtherExperience,
  Research,
} from './profile'

/** 简历模块类型 */
export type ResumeModuleType =
  | 'basic_info'
  | 'education'
  | 'skills'
  | 'work_experience'
  | 'projects'
  | 'portfolio'
  | 'awards'
  | 'other_experience'
  | 'research'
  | 'summary'

/** 简历模块配置（开关状态） */
export interface ModulesConfig {
  basic_info: boolean
  education: boolean
  skills: boolean
  work_experience: boolean
  projects: boolean
  portfolio: boolean
  awards: boolean
  other_experience: boolean
  research: boolean
  summary: boolean
}

/** 默认模块配置与排序（统一由 config/modules 管理） */
export { DEFAULT_MODULES_CONFIG, DEFAULT_MODULES_ORDER } from '@/config/modules'

/** 简历列表项（含预览数据） */
export interface ResumeListItem {
  id: string
  name: string
  is_public: boolean
  public_slug: string | null
  content: ResumeContent
  template: ResumeTemplateId
  modules_config: ModulesConfig
  modules_order: ResumeModuleType[]
  created_at: string
  updated_at: string
}

/** 富文本节点类型（TipTap JSON 格式） */
export interface RichTextNode {
  type: string
  content?: RichTextNode[]
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
  text?: string
  attrs?: Record<string, unknown>
}

/** 描述字段类型：纯文本或富文本 JSON */
export type DescriptionField = string | RichTextNode

/** 简历模板类型 */
export type ResumeTemplateId = 'classic' | 'modern' | 'minimal' | 'black-white'

/** 简历预览显示配置 */
export interface ResumePreviewConfig {
  fontSize: number
  lineHeight: number
}

/** 基本信息额外字段（可显隐） */
export type BasicInfoExtraField =
  | 'education_level'
  | 'age'
  | 'wechat'
  | 'city'
  | 'github'
  | 'website'
  | 'work_years'
  | 'gender'
  | 'height'
  | 'weight'
  | 'native_place'
  | 'nation'
  | 'political_status'
  | 'marital_status'
  | 'birthday'

/** 基本信息字段图标名称 */
export type BasicInfoIconName =
  | 'phone'
  | 'email'
  | 'wechat'
  | 'home'
  | 'github'
  | 'website'
  | 'education'
  | 'age'
  | 'workYears'
  | 'man'
  | 'woman'
  | 'user'

/** 基本信息展示配置 */
export interface BasicInfoDisplayConfig {
  visible_extra_fields: BasicInfoExtraField[]
  field_icons?: Partial<Record<'phone' | 'email' | BasicInfoExtraField, BasicInfoIconName>>
  /** 头像靠左显示（默认 false = 靠右，仅 classic / minimal / black-white） */
  avatar_left?: boolean
}

/** 联系信息展示项（结构化） */
export interface BasicInfoDisplayItem {
  field: string
  value: string
}

/** 模板配置 */
export interface ResumeTemplateConfig {
  id: ResumeTemplateId
  name: string
  description: string
  primaryColor: string
  secondaryColor: string
  textColor: string
  defaultPreviewConfig?: Partial<ResumePreviewConfig>
}

/** 简历详情 */
export interface Resume {
  id: string
  user_id: string
  name: string
  modules_config: ModulesConfig
  modules_order?: ResumeModuleType[]
  content: ResumeContent
  template?: ResumeTemplateId
  is_public: boolean
  public_slug: string | null
  created_at: string
  updated_at: string
}

/** 简历内容（可以覆盖个人信息） */
export interface ResumeContent {
  basic_info?: Partial<BasicInfo>
  education?: Partial<Education>[]
  skills?: Partial<Skill>[]
  work_experience?: Partial<WorkExperience>[]
  projects?: Partial<Project>[]
  portfolio?: Partial<Portfolio>[]
  awards?: Partial<Award>[]
  other_experience?: Partial<OtherExperience>[]
  research?: Partial<Research>[]
  summary?: DescriptionField
  preview_config?: Partial<ResumePreviewConfig>
  /** 基本信息字段显隐与图标配置 */
  basic_info_display?: BasicInfoDisplayConfig
  /** 模块自定义标题 */
  module_titles?: Partial<Record<ResumeModuleType, string>>
}

/** 创建简历请求 */
export interface CreateResumeRequest {
  name: string
  /** 是否从个人信息初始化简历内容，默认 true */
  initialize_from_profile?: boolean
}

/** 更新简历请求 */
export interface UpdateResumeRequest {
  name?: string
  modules_config?: ModulesConfig
  modules_order?: ResumeModuleType[]
  content?: ResumeContent
  template?: ResumeTemplateId
}

/** 公开简历请求 */
export interface PublishResumeRequest {
  slug: string
}
