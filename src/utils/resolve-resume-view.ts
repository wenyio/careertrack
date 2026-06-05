/**
 * 简历 ViewModel 解析器
 *
 * 纯函数：输入原始 resume content + profile，输出 ViewModel。
 * 所有渲染器（HTML 预览、PDF 模板）统一消费 ViewModel，不再各自提取/组装数据。
 */

import type {
  ResumeContent,
  ResumeModuleType,
  ModulesConfig,
  BasicInfoDisplayConfig,
  DescriptionField,
  ResumeTemplateId,
} from '@/types/resume'
import type { Profile, BasicInfo } from '@/types/profile'
import type { ResumeViewModel, ResolvedModule, ResolvedEntry, BasicInfoViewModel, IntentionDisplayItem } from '@/types/resume-view'
import {
  mergeResumeContentWithProfile,
  getBasicInfoContactItemsStructured,
  getBasicInfoExtraDisplayItems,
  MODULE_RENDERERS,
} from '@/utils/resume-preview'
import { getResolvedModuleTitle } from '@/utils/module-title'
import { getTemplateDefinition } from '@/components/resume/templates/registry'
import type { BasicInfoContactField, BasicInfoIntentionField } from '@/utils/resume-preview'

/** 各模板的联系方式字段 */
const TEMPLATE_CONTACT_FIELDS: Record<string, BasicInfoContactField[]> = {
  'black-white': ['phone', 'email', 'wechat'],
  default: ['phone', 'email', 'wechat'],
}

/** 各模板的求职意向字段 */
const TEMPLATE_INTENTION_FIELDS: Record<string, BasicInfoIntentionField[]> = {
  'black-white': ['current_status', 'position_label', 'expected_city', 'expected_salary'],
  default: ['position_label', 'expected_city', 'expected_salary'],
}

/** 求职意向图标名映射（与字段顺序对应） */
export const INTENTION_ICON_MAP: Record<BasicInfoIntentionField, string> = {
  current_status: 'tag',
  position: 'aim',
  position_label: 'aim',
  expected_city: 'environment',
  expected_salary: 'payCircle',
}

/**
 * 解析简历 ViewModel
 *
 * @param content 简历内容
 * @param profile 个人档案（可选，仅在 fallbackProfile=true 时用于合并）
 * @param modulesConfig 模块开关配置
 * @param modulesOrder 模块排序
 * @param template 模板 ID（影响联系方式/意向字段选择）
 * @param options.fallbackProfile 是否用 profile 合并空字段，默认 false
 * @returns 完整的 ViewModel
 */
export function resolveResumeView(
  content: ResumeContent,
  profile: Profile | undefined,
  modulesConfig: ModulesConfig,
  modulesOrder: ResumeModuleType[],
  template?: ResumeTemplateId,
  options?: { fallbackProfile?: boolean },
): ResumeViewModel {
  const data = options?.fallbackProfile ? mergeResumeContentWithProfile(content, profile) : content
  const basicInfo = data.basic_info as Partial<BasicInfo> | undefined
  const displayConfig = data.basic_info_display as BasicInfoDisplayConfig | undefined

  // ── 基本信息 ──
  const basicInfoVM = resolveBasicInfo(basicInfo, displayConfig, template)

  // ── 模块列表 ──
  const modules: ResolvedModule[] = []
  for (const moduleType of modulesOrder) {
    // 跳过 basic_info（已由 basicInfoVM 处理）和禁用的模块
    if (moduleType === 'basic_info') continue
    if (modulesConfig[moduleType] === false) continue

    // summary 特殊处理
    if (moduleType === 'summary') {
      if (data.summary) {
        modules.push({
          type: 'summary',
          title: getResolvedModuleTitle('summary', content),
          entries: [{
            title: '',
            description: data.summary,
            raw: data.summary,
          }],
        })
      }
      continue
    }

    // 数组模块
    const renderer = MODULE_RENDERERS[moduleType]
    if (!renderer) continue

    const items = renderer.getItems(data)
    if (!items || items.length === 0) continue

    const entries: ResolvedEntry[] = items.map((item) => ({
      title: renderer.getTitle(item),
      subtitle: renderer.getSubtitle?.(item),
      date: renderer.getDate?.(item),
      description: renderer.getDescription?.(item) as DescriptionField | undefined,
      raw: item,
    }))

    modules.push({
      type: moduleType,
      title: getResolvedModuleTitle(moduleType, content),
      entries,
    })
  }

  return {
    basicInfo: basicInfoVM,
    modules,
    summary: data.summary,
  }
}

/** 解析基本信息 ViewModel */
function resolveBasicInfo(
  basicInfo: Partial<BasicInfo> | undefined,
  displayConfig: BasicInfoDisplayConfig | undefined,
  template?: ResumeTemplateId,
): BasicInfoViewModel {
  const displayName = basicInfo?.name || '您的姓名'
  const avatar = basicInfo?.avatar

  // 从模板定义获取 resolveOverrides（新架构），回退到硬编码映射（兼容）
  const templateDef = template ? getTemplateDefinition(template) : undefined
  const resolveOverrides = templateDef?.resolveOverrides

  // 根据模板选择联系方式字段，排除已在 extra 中显示的字段
  const templateKey = template && template in TEMPLATE_CONTACT_FIELDS ? template : 'default'
  const allContactFields = TEMPLATE_CONTACT_FIELDS[templateKey] || TEMPLATE_CONTACT_FIELDS.default
  const extras = getBasicInfoExtraDisplayItems(basicInfo, displayConfig)
  const extraFields = new Set(extras.map((e) => e.field))
  const contactFields = allContactFields.filter((f) => !extraFields.has(f))
  const contacts = getBasicInfoContactItemsStructured(basicInfo, contactFields)

  // 求职意向（结构化，直接按字段生成，避免过滤后错位）
  const intentionFields = (resolveOverrides?.intentionFields as BasicInfoIntentionField[] | undefined)
    || TEMPLATE_INTENTION_FIELDS[templateKey]
    || TEMPLATE_INTENTION_FIELDS.default
  const jobIntention = basicInfo?.job_intention
  const hasPosition = !!jobIntention?.position
  // 模板可通过 resolveOverrides 控制无 position 时是否显示意向
  const showIntentions = resolveOverrides?.showIntentionsWithoutPosition || hasPosition
  const intentions: IntentionDisplayItem[] = []
  if (showIntentions && jobIntention) {
    for (const field of intentionFields) {
      let value: string | undefined
      if (field === 'position_label') {
        value = jobIntention.position ? `期望职位：${jobIntention.position}` : undefined
      } else {
        value = jobIntention[field as keyof typeof jobIntention] as string | undefined
      }
      if (value) {
        intentions.push({ field, value, icon: INTENTION_ICON_MAP[field] })
      }
    }
  }

  return {
    displayName,
    avatar,
    contacts,
    extras,
    intentions,
  }
}
