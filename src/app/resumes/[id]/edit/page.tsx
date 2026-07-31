/**
 * 简历编辑页面（统一入口）
 *
 * 差异仅在数据源和公开能力。用子组件分流（Hooks 规则要求），
 * EditorContent 只编排加载结果；编辑状态由 Shell 内部 selector 消费。
 */

'use client'

import { useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/useAuthStore'
import { publishResume, unpublishResume } from '@/services/resume'
import { useResumeEditorData } from '@/hooks/useResumeEditorData'
import { useGuestEditorData } from '@/hooks/useGuestEditorData'
import type { Profile } from '@/types/profile'
import type { Resume } from '@/types/resume'
import ResumeEditorShell from '@/components/resume/editor/ResumeEditorShell'

/** 两种数据源的统一返回类型 */
interface EditorData {
  resume: { id: string; is_public?: boolean; public_slug?: string | null; revision?: number } | null | undefined
  profile: Profile | null | undefined
  isLoading: boolean
  triggerAutoSave: () => void
  handleManualSave: () => void
  applyRestoredResume?: (resume: Resume) => void
}

/** 共享编辑器内容：解构 + 公开逻辑 + Shell 传参 */
function EditorContent({
  id,
  data,
  supportsPublic,
  showNotFound,
}: {
  id: string
  data: EditorData
  supportsPublic: boolean
  showNotFound: boolean
}) {
  const {
    resume,
    profile,
    isLoading,
    triggerAutoSave,
    handleManualSave,
    applyRestoredResume,
  } = data

  const queryClient = useQueryClient()

  const handleTogglePublic = useCallback(
    async (isPublic: boolean, slug?: string) => {
      if (isPublic) {
        try {
          await publishResume(id, { slug: slug || '' })
          queryClient.invalidateQueries({ queryKey: ['resume', id] })
          queryClient.invalidateQueries({ queryKey: ['resumes'] })
        } catch { /* */ }
      } else {
        try {
          await unpublishResume(id)
          queryClient.invalidateQueries({ queryKey: ['resume', id] })
          queryClient.invalidateQueries({ queryKey: ['resumes'] })
        } catch { /* */ }
      }
    },
    [id, queryClient],
  )

  return (
    <ResumeEditorShell
      profile={profile}
      isLoading={isLoading}
      resumeNotFound={showNotFound && !resume}
      hidePublic={!supportsPublic}
      backPath="/resumes"
      onSave={handleManualSave}
      triggerAutoSave={triggerAutoSave}
      onTogglePublic={supportsPublic ? handleTogglePublic : undefined}
      isPublic={resume?.is_public}
      publicSlug={resume?.public_slug}
      resumeId={resume?.id}
      revision={resume?.revision}
      onResumeRestored={supportsPublic ? applyRestoredResume : undefined}
    />
  )
}

// ─── 数据源分流（Hooks 规则要求必须在各自组件中调用） ───

function AuthenticatedEditor({ id }: { id: string }) {
  return <EditorContent id={id} data={useResumeEditorData(id)} supportsPublic showNotFound={false} />
}

function GuestEditor({ id }: { id: string }) {
  const guestData = useGuestEditorData(id)
  const data: EditorData = { ...guestData, profile: guestData.profile as Profile | null }
  return <EditorContent id={id} data={data} supportsPublic={false} showNotFound />
}

// ─── 入口 ───

export default function ResumeEditPage() {
  const params = useParams()
  const id = params.id as string
  const { isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    return <GuestEditor id={id} />
  }

  return <AuthenticatedEditor id={id} />
}
