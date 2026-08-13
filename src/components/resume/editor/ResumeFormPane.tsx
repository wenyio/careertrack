'use client'

import { useShallow } from 'zustand/react/shallow'
import { Modal, Switch } from 'antd'
import ModuleForm from '@/components/resume/ModuleForm'
import { useResumeEditorStore } from '@/stores/resume-editor'
import { selectResumeFormPane } from '@/stores/resume-editor-selectors'
import type { Profile } from '@/types/profile'
import type {
  BasicInfoDisplayConfig,
  BlackWhiteTemplateSettings,
  ResumeModuleType,
  ResumeTemplateId,
} from '@/types/resume'
import TemplateSelector from './TemplateSelector'

interface ResumeFormPaneProps {
  profile?: Profile
  canSyncProfile?: boolean
  showSettings: boolean
  onCloseSettings: () => void
  onTemplateChange: (template: ResumeTemplateId) => void
  onBlackWhiteTemplateSettingChange: (setting: keyof BlackWhiteTemplateSettings, enabled: boolean) => void
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
  canSyncProfile,
  showSettings,
  onCloseSettings,
  onTemplateChange,
  onBlackWhiteTemplateSettingChange,
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
      <Modal
        title="模板与设置"
        open={showSettings}
        onCancel={onCloseSettings}
        footer={null}
        width={760}
      >
        <div style={{ paddingTop: 4 }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12, color: '#333' }}>
            选择模板
          </div>
          <TemplateSelector
            value={template}
            onChange={onTemplateChange}
          />
          {template === 'black-white' && (
            <div
              style={{
                marginTop: 18,
                paddingTop: 16,
                borderTop: '1px solid #e5e7eb',
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 10, color: '#333' }}>
                黑白整齐排版
              </div>
              {[
                ['education_compact', '教育经历紧凑显示'],
                ['work_experience_compact', '工作经历紧凑显示'],
                ['projects_compact', '项目经历紧凑显示'],
              ].map(([setting, label]) => (
                <div
                  key={setting}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    minHeight: 34,
                  }}
                >
                  <span style={{ fontSize: 13, color: '#333' }}>{label}</span>
                  <Switch
                    size="small"
                    aria-label={label}
                    checked={content.template_settings?.black_white?.[setting as keyof BlackWhiteTemplateSettings] ?? false}
                    onChange={(checked) =>
                      onBlackWhiteTemplateSettingChange(setting as keyof BlackWhiteTemplateSettings, checked)
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      <ModuleForm
        modulesOrder={modulesOrder}
        modulesConfig={modulesConfig}
        expandedModules={expandedModules}
        content={content}
        profile={profile}
        canSyncProfile={canSyncProfile}
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
