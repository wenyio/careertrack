import type { ResumeEditorState } from '@/stores/resume-editor'

/** 数据加载 Hook 只订阅不会随编辑变化的 store action。 */
export function selectResumeEditorDataActions(state: ResumeEditorState) {
  return {
    initResume: state.initResume,
    setSaveStatus: state.setSaveStatus,
    resetStore: state.reset,
  }
}

/** 工具栏只关心全局操作状态，不订阅简历正文。 */
export function selectResumeEditorToolbar(state: ResumeEditorState) {
  return {
    resumeName: state.resumeName,
    saveStatus: state.saveStatus,
    showPreview: state.showPreview,
    setResumeName: state.setResumeName,
    setShowPreview: state.setShowPreview,
  }
}

/** 侧栏只读取模块结构和标题，不订阅各模块正文。 */
export function selectResumeModuleSidebar(state: ResumeEditorState) {
  return {
    modulesOrder: state.modulesOrder,
    modulesConfig: state.modulesConfig,
    activeModule: state.activeModule,
    sidebarCollapsed: state.sidebarCollapsed,
    moduleTitles: state.content.module_titles,
  }
}

/** 表单区需要当前正文、展开状态和模板设置。 */
export function selectResumeFormPane(state: ResumeEditorState) {
  return {
    modulesOrder: state.modulesOrder,
    modulesConfig: state.modulesConfig,
    expandedModules: state.expandedModules,
    content: state.content,
    template: state.template,
  }
}

/** 预览区不关心表单折叠状态，只订阅最终渲染输入。 */
export function selectResumePreviewPane(state: ResumeEditorState) {
  return {
    content: state.content,
    modulesConfig: state.modulesConfig,
    modulesOrder: state.modulesOrder,
    template: state.template,
  }
}
