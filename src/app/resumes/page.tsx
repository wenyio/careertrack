/**
 * 简历列表页面（统一入口）
 *
 * 根据登录态分流数据源，UI 完全共享。
 * 通过 service adapter 统一正式用户和游客的回调签名。
 */

'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { App } from 'antd'
import { useAuthStore } from '@/stores/useAuthStore'
import { cacheResumeDetail, useResumes, useCreateResume, useDeleteResume, useDuplicateResume } from '@/hooks/useResume'
import { useProfile } from '@/hooks/useProfile'
import { getResume, updateResume, publishResume, unpublishResume } from '@/services/resume'
import { useQueryClient } from '@tanstack/react-query'
import { printResume } from '@/utils/print'
import {
  getGuestResumes,
  createGuestResume,
  updateGuestResume,
  deleteGuestResume,
  duplicateGuestResume,
  getGuestResume,
} from '@/services/guest-resume'
import { getGuestProfile } from '@/services/guest-profile'
import type { GuestResume } from '@/types/guest'
import type { GuestProfile } from '@/services/guest-profile'
import type { Profile } from '@/types/profile'
import ResumeListView from '@/components/resume/list/ResumeListView'
import type { ResumeListResume } from '@/components/resume/list/ResumeListCard'
import { useI18n } from '@/i18n'

// ─── 已登录用户列表 ───

function AuthenticatedResumeList() {
  const router = useRouter()
  const { message } = App.useApp()
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)
  const { data: resumePage, isLoading } = useResumes(page, pageSize)
  const { data: profile } = useProfile()
  const { mutate: createResume, isPending: isCreating } = useCreateResume()
  const { mutate: deleteResume } = useDeleteResume()
  const { mutate: duplicateResume } = useDuplicateResume()

  const handleCreate = useCallback((name: string, initFromProfile: boolean) => {
    createResume({ name, initialize_from_profile: initFromProfile })
  }, [createResume])

  const handleDelete = useCallback((id: string) => {
    const shouldMoveBack = page > 1 && resumePage?.items.length === 1
    deleteResume(id, {
      onSuccess: () => {
        if (shouldMoveBack) setPage((current) => Math.max(1, current - 1))
      },
    })
  }, [deleteResume, page, resumePage?.items.length])

  const handleDuplicate = useCallback((id: string) => {
    duplicateResume(id)
  }, [duplicateResume])

  const handleRename = useCallback(async (id: string, name: string) => {
    try {
      const resume = await updateResume(id, { name })
      cacheResumeDetail(queryClient, resume)
      queryClient.invalidateQueries({ queryKey: ['resumes'] })
      message.success(t('resume.renameSuccess'))
    } catch {
      message.error(t('resume.renameFailed'))
    }
  }, [queryClient, message, t])

  const handlePrint = useCallback(async (id: string) => {
    try {
      const resume = await getResume(id)
      await printResume(resume)
    } catch {
      message.error({ content: t('resume.printFailed'), key: 'print' })
    }
  }, [message, t])

  const handlePreview = useCallback(async (id: string) => {
    const resume = await getResume(id)
    cacheResumeDetail(queryClient, resume)
    return {
      id: resume.id,
      name: resume.name,
      content: resume.content,
      modules_config: resume.modules_config,
      modules_order: resume.modules_order,
      template: resume.template || 'classic',
      updated_at: resume.updated_at,
      is_public: resume.is_public,
      public_slug: resume.public_slug,
    }
  }, [queryClient])

  const handleTogglePublic = useCallback(async (resumeId: string, isPublic: boolean, slug?: string) => {
    if (isPublic) {
      try {
        await publishResume(resumeId, { slug: slug || '' })
        queryClient.invalidateQueries({ queryKey: ['resumes'] })
        message.success(t('resume.publishSuccess'))
      } catch {
        message.error(t('resume.publishFailed'))
      }
    } else {
      try {
        await unpublishResume(resumeId)
        queryClient.invalidateQueries({ queryKey: ['resumes'] })
        message.success(t('resume.unpublishSuccess'))
      } catch {
        message.error(t('resume.operationFailed'))
      }
    }
  }, [queryClient, message, t])

  const handleEdit = useCallback((id: string) => {
    router.push(`/resumes/${id}/edit`)
  }, [router])

  return (
    <ResumeListView
      resumes={resumePage?.items || []}
      profile={profile}
      isLoading={isLoading}
      title={t('resume.myResumes')}
      subtitle={t('resume.manageSubtitle')}
      showPublic
      showInitFromProfile
      isCreating={isCreating}
      onEdit={handleEdit}
      onPreview={handlePreview}
      onCreate={handleCreate}
      onDelete={handleDelete}
      onDuplicate={handleDuplicate}
      onRename={handleRename}
      onPrint={handlePrint}
      onTogglePublic={handleTogglePublic}
      pagination={resumePage?.pagination}
      onPageChange={(nextPage, nextPageSize) => {
        setPage(nextPageSize === pageSize ? nextPage : 1)
        setPageSize(nextPageSize)
      }}
    />
  )
}

// ─── 游客列表 ───

function GuestResumeList() {
  const router = useRouter()
  const { message } = App.useApp()
  const { t } = useI18n()

  const [resumes, setResumes] = useState<GuestResume[]>(
    () => getGuestResumes(),
  )
  const [profile] = useState<GuestProfile | null>(() => getGuestProfile())
  const isLoading = false

  const loadData = useCallback(() => {
    setResumes(getGuestResumes())
  }, [])

  const handleCreate = useCallback((name: string) => {
    const resume = createGuestResume(name)
    router.push(`/resumes/${resume.id}/edit`)
  }, [router])

  const handleDelete = useCallback((id: string) => {
    deleteGuestResume(id)
    loadData()
    message.success(t('resume.deleted'))
  }, [loadData, message, t])

  const handleDuplicate = useCallback((id: string) => {
    duplicateGuestResume(id)
    loadData()
    message.success(t('resume.duplicated'))
  }, [loadData, message, t])

  const handleRename = useCallback((id: string, name: string) => {
    try {
      updateGuestResume(id, { name })
      loadData()
      message.success(t('resume.renameSuccess'))
    } catch {
      message.error(t('resume.renameFailed'))
    }
  }, [loadData, message, t])

  const handlePrint = useCallback(async (id: string) => {
    const resume = getGuestResume(id)
    if (!resume) {
      message.error({ content: t('resume.notFound'), key: 'print' })
      return
    }
    await printResume(resume as Parameters<typeof printResume>[0])
  }, [message, t])

  const handlePreview = useCallback(async (id: string) => {
    const resume = getGuestResume(id)
    if (!resume) return null
    return {
      id: resume.id,
      name: resume.name,
      content: resume.content,
      modules_config: resume.modules_config,
      modules_order: resume.modules_order,
      template: resume.template || 'classic',
      updated_at: resume.updated_at,
    }
  }, [])

  const handleEdit = useCallback((id: string) => {
    router.push(`/resumes/${id}/edit`)
  }, [router])

  const listResumes: ResumeListResume[] = resumes.map((r) => ({
    id: r.id,
    name: r.name,
    content: r.content,
    modules_config: r.modules_config,
    modules_order: r.modules_order,
    template: r.template,
    updated_at: r.updated_at,
  }))

  return (
    <ResumeListView
      resumes={listResumes}
      profile={profile as unknown as Profile | null}
      isLoading={isLoading}
      title={t('resume.myResumes')}
      subtitle={t('resume.guestSubtitle')}
      showPublic={false}
      showInitFromProfile={false}
      onEdit={handleEdit}
      onPreview={handlePreview}
      onCreate={handleCreate}
      onDelete={handleDelete}
      onDuplicate={handleDuplicate}
      onRename={handleRename}
      onPrint={handlePrint}
    />
  )
}

// ─── 入口 ───

export default function ResumesPage() {
  const { isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    return <GuestResumeList />
  }

  return <AuthenticatedResumeList />
}
