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
import { useI18n } from '@/i18n'
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
  const { t } = useI18n()
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
        title={t('resumeEditor.templateSettings')}
        open={showSettings}
        onCancel={onCloseSettings}
        footer={null}
        width={760}
        rootClassName="resume-template-settings-modal"
      >
        <div style={{ paddingTop: 4 }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12, color: '#333' }}>
            {t('resumeEditor.selectTemplate')}
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
                {t('resumeEditor.blackWhiteLayout')}
              </div>
              {[
                ['education_compact', t('resumeEditor.educationCompact')],
                ['work_experience_compact', t('resumeEditor.workExperienceCompact')],
                ['projects_compact', t('resumeEditor.projectsCompact')],
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
      <style jsx global>{`
        .resume-template-settings-modal .ant-modal-mask,
        .resume-template-settings-modal .ant-modal-wrap {
          pointer-events: none;
        }

        .resume-template-settings-modal .ant-modal {
          pointer-events: auto;
        }
      `}</style>
    </div>
  )
}
