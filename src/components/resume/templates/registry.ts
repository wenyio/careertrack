/**
 * 模板注册表
 *
 * 统一管理所有模板定义，提供 lookup 函数。
 * 新增模板只需在此处导入并注册。
 */

import type { ComponentType } from 'react'
import type { ResumeTemplateId, ResumeTemplateConfig } from '@/types/resume'
import type { TemplateDefinition } from './types'
import { classicTemplate } from './defs/classic'
import { modernTemplate } from './defs/modern'
import { minimalTemplate } from './defs/minimal'
import { blackWhiteTemplate } from './defs/black-white'

/** 所有模板定义（按 ID 索引） */
const TEMPLATES: Record<ResumeTemplateId, TemplateDefinition> = {
  classic: classicTemplate,
  modern: modernTemplate,
  minimal: minimalTemplate,
  'black-white': blackWhiteTemplate,
}

/** 获取模板定义 */
export function getTemplateDefinition(id: ResumeTemplateId): TemplateDefinition {
  return TEMPLATES[id] || TEMPLATES.classic
}

/** 获取模板配置（兼容原 getTemplateConfig 接口） */
export function getTemplateConfig(id: ResumeTemplateId): ResumeTemplateConfig {
  return getTemplateDefinition(id).config
}

/** 获取模板列表（兼容原 TEMPLATE_LIST） */
export const TEMPLATE_LIST: ResumeTemplateConfig[] = Object.values(TEMPLATES).map((t) => t.config)

/** 获取模板骨架预览映射（兼容原 TEMPLATE_SKELETONS） */
export const TEMPLATE_SKELETONS: Record<ResumeTemplateId, ComponentType> = Object.fromEntries(
  Object.entries(TEMPLATES).map(([id, t]) => [id, t.SkeletonPreview]),
) as Record<ResumeTemplateId, ComponentType>
