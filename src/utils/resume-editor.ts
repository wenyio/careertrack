import {
  DEFAULT_MODULES_CONFIG,
  DEFAULT_MODULES_ORDER,
} from '@/types/resume'
import type {
  ModulesConfig,
  ResumeContent,
  ResumeModuleType,
  ResumeTemplateId,
} from '@/types/resume'

interface ResumeEditorSource {
  id: string
  name?: string | null
  modules_config?: ModulesConfig | null
  modules_order?: ResumeModuleType[] | null
  content?: ResumeContent | null
  template?: ResumeTemplateId | null
}

export interface ResumeEditorInitialData {
  id: string
  name: string
  modulesConfig: ModulesConfig
  modulesOrder: ResumeModuleType[]
  content: ResumeContent
  template: ResumeTemplateId
}

/**
 * 将服务端或游客简历归一化为编辑器 store 的初始化数据。
 *
 * 数据源加载、revision 和持久化语义仍由各自 Hook 负责；这里只共享二者
 * 完全一致的兼容规则，避免旧数据在游客与登录模式下呈现不同结果。
 */
export function buildResumeEditorInitialData(
  resume: ResumeEditorSource,
): ResumeEditorInitialData {
  return {
    id: resume.id,
    name: resume.name || '未命名简历',
    modulesConfig: {
      ...(resume.modules_config || DEFAULT_MODULES_CONFIG),
      // 基本信息是编辑器的结构根节点，历史异常配置也不能将它关闭。
      basic_info: true,
    },
    modulesOrder: resume.modules_order
      ? [...resume.modules_order]
      : [...DEFAULT_MODULES_ORDER],
    content: {
      ...(resume.content || {}),
      basic_info: resume.content?.basic_info || {},
    },
    template: resume.template || 'classic',
  }
}
