/**
 * 简历编辑器全局状态管理
 *
 * 使用 Zustand 管理编辑器状态，替代页面内的 useState 局部状态
 */

import { create } from 'zustand'
import type {
  ResumeModuleType,
  ModulesConfig,
  ResumeContent,
  ResumeTemplateId,
} from '@/types/resume'
import { DEFAULT_MODULES_CONFIG, DEFAULT_MODULES_ORDER } from '@/types/resume'

export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'manual_saved'

export interface ResumeEditorState {
  // 简历基础信息
  resumeId: string | null
  resumeName: string
  modulesConfig: ModulesConfig
  modulesOrder: ResumeModuleType[]
  content: ResumeContent
  template: ResumeTemplateId

  // 编辑器 UI 状态
  activeModule: ResumeModuleType
  expandedModules: Set<ResumeModuleType>
  showPreview: boolean
  sidebarCollapsed: boolean
  saveStatus: SaveStatus

  // Actions
  initResume: (data: {
    id: string
    name: string
    modulesConfig: ModulesConfig
    modulesOrder?: ResumeModuleType[]
    content: ResumeContent
    template?: ResumeTemplateId
  }) => void
  setResumeName: (name: string) => void
  setModulesConfig: (config: ModulesConfig) => void
  toggleModule: (module: ResumeModuleType, enabled: boolean) => void
  reorderModules: (fromIndex: number, toIndex: number) => void
  setContent: <K extends keyof ResumeContent>(module: K, value: ResumeContent[K]) => void
  setActiveModule: (module: ResumeModuleType) => void
  setExpandedModules: (modules: Set<ResumeModuleType>) => void
  toggleExpandedModule: (module: ResumeModuleType) => void
  focusModule: (module: ResumeModuleType) => void
  setTemplate: (template: ResumeTemplateId) => void
  setShowPreview: (show: boolean) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setSaveStatus: (status: SaveStatus) => void

  // 重置
  reset: () => void
}

const initialState = {
  resumeId: null as string | null,
  resumeName: '',
  modulesConfig: { ...DEFAULT_MODULES_CONFIG },
  modulesOrder: [...DEFAULT_MODULES_ORDER] as ResumeModuleType[],
  content: {} as ResumeContent,
  template: 'classic' as ResumeTemplateId,
  activeModule: 'basic_info' as ResumeModuleType,
  expandedModules: new Set<ResumeModuleType>(['basic_info']),
  showPreview: true,
  sidebarCollapsed: false,
  saveStatus: 'idle' as SaveStatus,
}

export const useResumeEditorStore = create<ResumeEditorState>((set) => ({
  ...initialState,

  initResume: (data) =>
    set({
      resumeId: data.id,
      resumeName: data.name,
      modulesConfig: data.modulesConfig,
      modulesOrder: data.modulesOrder || [...DEFAULT_MODULES_ORDER],
      content: data.content,
      template: data.template || 'classic',
      expandedModules: new Set(['basic_info']),
    }),

  setResumeName: (name) => set({ resumeName: name }),

  setModulesConfig: (config) => set({ modulesConfig: config }),

  toggleModule: (module, enabled) =>
    set((state) => ({
      modulesConfig: { ...state.modulesConfig, [module]: enabled },
    })),

  reorderModules: (fromIndex, toIndex) =>
    set((state) => {
      const order = [...state.modulesOrder]
      const [moved] = order.splice(fromIndex, 1)
      order.splice(toIndex, 0, moved)
      return { modulesOrder: order }
    }),

  setContent: (module, value) =>
    set((state) => ({
      content: { ...state.content, [module]: value },
    })),

  setActiveModule: (module) => set({ activeModule: module }),

  setExpandedModules: (modules) => set({ expandedModules: modules }),

  toggleExpandedModule: (module) =>
    set((state) => {
      const next = new Set(state.expandedModules)
      if (next.has(module)) {
        next.delete(module)
      } else {
        next.add(module)
      }
      return { expandedModules: next }
    }),

  /** 聚焦到某个模块：展开它、折叠其他、设为活跃 */
  focusModule: (module) =>
    set({ activeModule: module, expandedModules: new Set([module]) }),

  setTemplate: (template) => set({ template }),

  setShowPreview: (show) => set({ showPreview: show }),

  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  setSaveStatus: (status) => set({ saveStatus: status }),

  reset: () => set(initialState),
}))
