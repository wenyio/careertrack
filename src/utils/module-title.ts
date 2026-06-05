/**
 * 模块标题解析工具
 *
 * 解析模块标题：自定义标题 > 默认标题。
 * 统一在表单、预览、公开页、PDF 中使用。
 */

import type { ResumeModuleType, ResumeContent } from '@/types/resume'
import { MODULE_TITLES } from '@/utils/resume-preview'
import { getModuleLabel } from '@/config/modules'

/**
 * 获取模块的最终显示标题
 *
 * 优先使用 content.module_titles 中的自定义标题，
 * 否则使用 MODULE_TITLES 中的默认标题。
 */
export function getResolvedModuleTitle(
  module: ResumeModuleType,
  content?: ResumeContent,
): string {
  const customTitle = content?.module_titles?.[module]
  if (customTitle && customTitle.trim()) return customTitle.trim()
  return MODULE_TITLES[module] || getModuleLabel(module)
}
