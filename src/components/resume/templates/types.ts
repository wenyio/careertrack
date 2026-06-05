/**
 * 简历模板架构类型定义
 *
 * 定义模板渲染器接口，使每个模板成为独立定义，
 * 新增模板只需添加文件并注册，不需要修改公共渲染代码。
 */

import type { CSSProperties, ComponentType, ReactNode } from 'react'
import type {
  ResumeContent,
  ModulesConfig,
  ResumeModuleType,
  ResumeTemplateId,
  ResumeTemplateConfig,
  BasicInfoDisplayConfig,
  BasicInfoDisplayItem,
} from '@/types/resume'
import type { Profile, BasicInfo } from '@/types/profile'
import type { ResumeViewModel, IntentionDisplayItem } from '@/types/resume-view'

// ── 样式相关 ──

/** 模板样式覆盖（所有字段可选，未提供则使用 base） */
export interface TemplateStyleOverrides {
  page?: CSSProperties
  contactItem?: CSSProperties
  section?: CSSProperties
  sectionTitle?: CSSProperties
  entry?: CSSProperties
  entryHeader?: CSSProperties
  entryTitle?: CSSProperties
  entryDate?: CSSProperties
  entrySubtitle?: CSSProperties
  description?: CSSProperties
  skillTag?: CSSProperties
  sidebar?: CSSProperties
  sidebarName?: CSSProperties
  main?: CSSProperties
}

// ── 渲染回调 ──

/** Sub-item 渲染回调 */
export type SubItemRenderer = (
  module: ResumeModuleType,
  index: number,
  total: number,
  children: ReactNode,
) => ReactNode

/** Section 渲染回调 */
export type SectionRenderer = (
  module: ResumeModuleType,
  children: ReactNode,
) => ReactNode

// ── 模块渲染器 ──

/** 模块渲染器 props */
export interface ModuleRendererProps {
  module: ResumeModuleType
  content: ResumeContent
  styles: ResolvedStyles
  renderSubItem: SubItemRenderer
  resolvedFontSize: number
  s: (scale: number) => number
}

// ── 布局 Slot ──

/** 布局 slot 声明（用于 sidebar/main 双栏布局） */
export interface LayoutSlots {
  /** slot 名称 → 属于该 slot 的模块类型列表 */
  slots: Record<string, ResumeModuleType[]>
  /** slot 渲染顺序 */
  slotOrder: string[]
}

// ── BasicInfoHeader ──

/** BasicInfoHeader props */
export interface BasicInfoHeaderProps {
  basicInfo?: Partial<BasicInfo>
  template: ResumeTemplateId
  primaryColor: string
  styles: ResolvedStyles
  contactItems: BasicInfoDisplayItem[]
  extraDisplayItems?: BasicInfoDisplayItem[]
  fieldIcons?: BasicInfoDisplayConfig['field_icons']
  intentionItems: IntentionDisplayItem[]
  nameFontSize?: CSSProperties['fontSize']
  centerNameFontSize?: CSSProperties['fontSize']
  contactFontSize?: CSSProperties['fontSize']
  intentionFontSize?: CSSProperties['fontSize']
  blackWhiteIntentionMode?: 'items' | 'single'
  centerIntentionMode?: 'joined' | 'spaced'
  showEmptyContactRow?: boolean
  /** 可选：图标映射覆盖（模板可自定义图标风格） */
  iconOverrides?: TemplateIconOverrides
  /** StandardBasicInfoHeader 使用：布局变体 */
  variant?: 'centered' | 'left' | 'sidebar'
  /** StandardBasicInfoHeader 使用：意图展示模式（统一替代 centerIntentionMode / blackWhiteIntentionMode） */
  intentionMode?: 'joined' | 'spaced' | 'items' | 'single'
  /** StandardBasicInfoHeader 使用：图标颜色 */
  iconColor?: string
  /** StandardBasicInfoHeader 使用：图标字号 */
  iconFontSize?: CSSProperties['fontSize']
  /** StandardBasicInfoHeader 使用：图标右边距 */
  iconMarginRight?: number
  /** StandardBasicInfoHeader 使用：文字颜色 */
  textColor?: string
  /** StandardBasicInfoHeader 使用：求职意向颜色 */
  intentionColor?: string
  /** StandardBasicInfoHeader 使用：是否显示底部分割线 */
  showBottomBorder?: boolean
  /** StandardBasicInfoHeader 使用：是否渲染姓名（sidebar 模式下通常为 false） */
  showName?: boolean
  /** StandardBasicInfoHeader 使用：是否渲染头像（sidebar 模式下通常为 false） */
  showAvatar?: boolean
  /** StandardBasicInfoHeader 使用：头像靠左（默认 false = 靠右） */
  avatarLeft?: boolean
  /** StandardBasicInfoHeader 使用：头像样式覆盖 */
  avatarStyle?: CSSProperties
  /** StandardBasicInfoHeader 使用：容器样式覆盖 */
  containerStyle?: CSSProperties
  /** StandardBasicInfoHeader 使用：条目样式覆盖 */
  itemStyle?: CSSProperties
}

// ── 自定义 Renderer ──

/** 传给自定义 Renderer 组件的 props */
export interface TemplateRendererProps {
  content: ResumeContent
  modulesConfig: ModulesConfig
  modulesOrder: ResumeModuleType[]
  template: ResumeTemplateId
  profile?: Profile
  styles: ResolvedStyles
  viewModel: ResumeViewModel
  config: ResumeTemplateConfig
  resolvedFontSize: number
  resolvedLineHeight: number
  renderSection: SectionRenderer
  renderSubItem: SubItemRenderer
}

// ── 模板渲染器定义 ──

/** 模板图标映射覆盖（可选，未提供则使用 common 默认实现） */
export interface TemplateIconOverrides {
  getContactIcon?: (field: string) => ReactNode
  getExtraFieldIcon?: (field: string, value: string) => ReactNode
  getIntentionIcon?: (icon: string) => ReactNode
}

/** 模板渲染器完整定义 */
export interface TemplateRenderer {
  /** 可选：自定义页面布局 Renderer（完全接管渲染，如 black-white） */
  Renderer?: ComponentType<TemplateRendererProps>
  /** 可选：样式覆盖（支持动态计算字号缩放） */
  styleOverrides?:
    | TemplateStyleOverrides
    | ((config: { primaryColor: string; textColor: string; fontSize: number; lineHeight: number; s: (scale: number) => number }) => TemplateStyleOverrides)
  /** 可选：布局 slot 声明（如 modern 的 sidebar） */
  layoutSlots?: LayoutSlots
  /** 可选：特定模块的自定义渲染器 */
  moduleRenderers?: Partial<Record<ResumeModuleType, ComponentType<ModuleRendererProps>>>
  /** 可选：自定义 BasicInfoHeader */
  BasicInfoHeader?: ComponentType<BasicInfoHeaderProps>
  /** 可选：图标映射覆盖（影响联系信息、额外字段、求职意向的图标） */
  iconOverrides?: TemplateIconOverrides
}

// ── 模板完整定义 ──

/** 模板完整定义（元数据 + 渲染器） */
export interface TemplateDefinition {
  /** 模板配置（复用现有 ResumeTemplateConfig） */
  config: ResumeTemplateConfig
  /** 渲染器 */
  renderer: TemplateRenderer
  /** 骨架预览组件 */
  SkeletonPreview: ComponentType
  /** 可选：resolve 配置覆盖（影响 ViewModel 生成） */
  resolveOverrides?: {
    contactFields?: string[]
    intentionFields?: string[]
    showIntentionsWithoutPosition?: boolean
  }
}

// ── 样式类型（由 base-styles 导出） ──

/** 解析后的样式对象类型 */
export type ResolvedStyles = ReturnType<typeof import('./base-styles').getBaseStyles>
