/**
 * 简历模板架构统一导出
 */

// 类型
export type {
  TemplateDefinition,
  TemplateRenderer,
  TemplateRendererProps,
  TemplateStyleOverrides,
  TemplateIconOverrides,
  ModuleRendererProps,
  BasicInfoHeaderProps,
  LayoutSlots,
  SubItemRenderer,
  SectionRenderer,
  ResolvedStyles,
} from './types'

// 注册表
export {
  getTemplateDefinition,
  getTemplateConfig,
  TEMPLATE_LIST,
  TEMPLATE_SKELETONS,
} from './registry'

// 基础样式
export { getBaseStyles, applyStyleOverrides } from './base-styles'

// 渲染骨架
export { BaseResumePreview } from './base-resume-renderer'

// 公共组件
export {
  DescriptionHtml,
  SectionTitle,
  DefaultBasicInfoHeader,
  StandardArrayEntries,
  renderStandardModule,
  getContactIcon,
  getExtraFieldIcon,
  getIntentionIcon,
} from './common'
