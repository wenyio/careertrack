'use client'

import { useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { usePrint } from '@/hooks/usePrint'
import { useResumeEditorStore } from '@/stores/resume-editor'
import { selectResumeEditorToolbar } from '@/stores/resume-editor-selectors'
import EditorToolbar from './EditorToolbar'

interface ResumeEditorToolbarProps {
  onSave: () => void
  onBack: () => void
  onOpenSettings: () => void
  triggerAutoSave: () => void
  onTogglePublic?: (isPublic: boolean, slug?: string) => void
  isPublic?: boolean
  publicSlug?: string | null
  resumeId?: string
  hidePublic?: boolean
}

/**
 * 工具栏 store 订阅边界。
 *
 * 正文、模块顺序或模板变化不会重渲染工具栏；名称、保存状态和预览开关
 * 仍会按用户可见状态正常更新。
 */
export default function ResumeEditorToolbar({
  onSave,
  onBack,
  onOpenSettings,
  triggerAutoSave,
  onTogglePublic,
  isPublic,
  publicSlug,
  resumeId,
  hidePublic,
}: ResumeEditorToolbarProps) {
  const {
    resumeName,
    saveStatus,
    showPreview,
    setResumeName,
    setShowPreview,
  } = useResumeEditorStore(useShallow(selectResumeEditorToolbar))

  const { handlePrint } = usePrint({ resumeName })

  const handleNameChange = useCallback((name: string) => {
    setResumeName(name)
    triggerAutoSave()
  }, [setResumeName, triggerAutoSave])

  const handleTogglePreview = useCallback(() => {
    setShowPreview(!showPreview)
  }, [setShowPreview, showPreview])

  const handleTogglePublic = useCallback(
    (nextIsPublic: boolean, slug?: string) => {
      onTogglePublic?.(nextIsPublic, slug)
    },
    [onTogglePublic],
  )

  return (
    <EditorToolbar
      resumeName={resumeName}
      saveStatus={saveStatus}
      showPreview={showPreview}
      isPublic={isPublic}
      publicSlug={publicSlug}
      resumeId={resumeId}
      onNameChange={handleNameChange}
      onSave={onSave}
      onTogglePreview={handleTogglePreview}
      onPrint={handlePrint}
      onTogglePublic={handleTogglePublic}
      onBack={onBack}
      onOpenSettings={onOpenSettings}
      hidePublic={hidePublic}
    />
  )
}
