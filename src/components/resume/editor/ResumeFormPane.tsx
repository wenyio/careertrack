'use client'

import { useShallow } from 'zustand/react/shallow'
import ModuleForm from '@/components/resume/ModuleForm'
import { useResumeEditorStore } from '@/stores/resume-editor'
import { selectResumeFormPane } from '@/stores/resume-editor-selectors'
import type { Profile } from '@/types/profile'
import type {
  BasicInfoDisplayConfig,
  ResumeModuleType,
  ResumeTemplateId,
} from '@/types/resume'
import TemplateSelector from './TemplateSelector'

interface ResumeFormPaneProps {
  profile?: Profile
  showSettings: boolean
  onTemplateChange: (template: ResumeTemplateId) => void
  onContentChange: (module: ResumeModuleType, value: unknown) => void
  onExpandModules: (modules: Set<ResumeModuleType>) => void
  onDisplayConfigChange: (config: BasicInfoDisplayConfig) => void
  onRenameModule: (module: ResumeModuleType, name: string) => void
  onMoveModule: (
    module: ResumeModuleType,
    direction: 'up' | 'down' | number,
  ) => void
  onDeleteModule: (module: ResumeModuleType) => void
}

/** 表单区只订阅渲染表单所需的编辑器状态。 */
export default function ResumeFormPane({
  profile,
  showSettings,
  onTemplateChange,
  onContentChange,
  onExpandModules,
  onDisplayConfigChange,
  onRenameModule,
  onMoveModule,
  onDeleteModule,
}: ResumeFormPaneProps) {
  const {
    modulesOrder,
    modulesConfig,
    expandedModules,
    content,
    template,
  } = useResumeEditorStore(useShallow(selectResumeFormPane))

  return (
    <div
      className="editor-form-area"
      style={{
        flex: 1,
        minWidth: 0,
        overflowY: 'auto',
        padding: 24,
      }}
    >
      {showSettings && (
        <div
          style={{
            marginBottom: 24,
            padding: 16,
            backgroundColor: '#f8fafc',
            borderRadius: 8,
            border: '1px solid #e5e7eb',
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12, color: '#333' }}>
            选择模板
          </div>
          <TemplateSelector
            value={template}
            onChange={onTemplateChange}
          />
        </div>
      )}

      <ModuleForm
        modulesOrder={modulesOrder}
        modulesConfig={modulesConfig}
        expandedModules={expandedModules}
        content={content}
        profile={profile}
        onChange={onContentChange}
        onExpand={onExpandModules}
        onDisplayConfigChange={onDisplayConfigChange}
        onRenameModule={onRenameModule}
        onMoveModule={onMoveModule}
        onDeleteModule={onDeleteModule}
      />
    </div>
  )
}
