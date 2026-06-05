/**
 * 简历 ViewModel 类型定义
 *
 * 由 `resolveResumeView` 纯函数生成，供 HTML 预览和 PDF 模板统一消费。
 * 渲染器只负责排版，不自行提取/组装数据。
 */

import type { ResumeModuleType, DescriptionField, BasicInfoDisplayItem } from './resume'

/** 已解析的条目（通用，适用于教育/工作/项目等所有数组模块） */
export interface ResolvedEntry {
  /** 主标题（如学校名、公司名） */
  title: string
  /** 副标题（如 "计算机科学 · 硕士 · 清华大学"） */
  subtitle?: string
  /** 日期范围（如 "2020.09 - 2024.06"） */
  date?: string
  /** 描述内容（纯文本或富文本 JSON） */
  description?: DescriptionField
  /** 原始数据，供模板特殊渲染用（如 BlackWhiteTemplate 的图标） */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw: any
}

/** 已解析的模块 */
export interface ResolvedModule {
  /** 模块类型 */
  type: ResumeModuleType
  /** 已解析的模块标题（自定义 > 默认） */
  title: string
  /** 该模块的条目列表 */
  entries: ResolvedEntry[]
}

/** 求职意向展示项（结构化） */
export interface IntentionDisplayItem {
  /** 字段名（如 position_label、expected_city） */
  field: string
  /** 显示文本 */
  value: string
  /** 图标名（如 aim、environment、payCircle） */
  icon: string
}

/** 基本信息 ViewModel */
export interface BasicInfoViewModel {
  /** 显示名称（无姓名时为 '您的姓名'） */
  displayName: string
  /** 头像 URL */
  avatar?: string
  /** 联系方式（phone/email/city/wechat/github/website） */
  contacts: BasicInfoDisplayItem[]
  /** 额外显示字段（学历/年龄/工作年限等） */
  extras: BasicInfoDisplayItem[]
  /** 求职意向（结构化，含字段名、文本、图标） */
  intentions: IntentionDisplayItem[]
}

/** 简历 ViewModel（由 resolveResumeView 生成） */
export interface ResumeViewModel {
  /** 基本信息 */
  basicInfo: BasicInfoViewModel
  /** 已解析的模块列表（按 modulesOrder 排序，已过滤禁用模块） */
  modules: ResolvedModule[]
  /** 个人简介 */
  summary?: DescriptionField
}
