/**
 * 简历列表页面（统一入口）
 *
 * 根据登录态分流数据源，UI 完全共享。
 * 通过 service adapter 统一正式用户和游客的回调签名。
 */

'use client'

import { useCallback } from 'react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { App } from 'antd'
import { useAuthStore } from '@/stores/useAuthStore'
import { useResumes, useCreateResume, useDeleteResume, useDuplicateResume } from '@/hooks/useResume'
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

// ─── 已登录用户列表 ───

function AuthenticatedResumeList() {
  const router = useRouter()
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const { data: resumes, isLoading } = useResumes()
  const { data: profile } = useProfile()
  const { mutate: createResume, isPending: isCreating } = useCreateResume()
  const { mutate: deleteResume } = useDeleteResume()
  const { mutate: duplicateResume } = useDuplicateResume()

  const handleCreate = useCallback((name: string, initFromProfile: boolean) => {
    createResume({ name, initialize_from_profile: initFromProfile })
  }, [createResume])

  const handleDelete = useCallback((id: string) => {
    deleteResume(id)
  }, [deleteResume])

  const handleDuplicate = useCallback((id: string) => {
    duplicateResume(id)
  }, [duplicateResume])

  const handleRename = useCallback(async (id: string, name: string) => {
    try {
      await updateResume(id, { name })
      queryClient.invalidateQueries({ queryKey: ['resumes'] })
      message.success('重命名成功')
    } catch {
      message.error('重命名失败')
    }
  }, [queryClient, message])

  const handlePrint = useCallback(async (id: string) => {
    try {
      const resume = await getResume(id)
      await printResume(resume)
    } catch {
      message.error({ content: '打印失败', key: 'print' })
    }
  }, [message])

  const handleTogglePublic = useCallback(async (resumeId: string, isPublic: boolean, slug?: string) => {
    if (isPublic) {
      try {
        await publishResume(resumeId, { slug: slug || '' })
        queryClient.invalidateQueries({ queryKey: ['resumes'] })
        message.success('简历已公开')
      } catch {
        message.error('公开失败，链接可能已被占用')
      }
    } else {
      try {
        await unpublishResume(resumeId)
        queryClient.invalidateQueries({ queryKey: ['resumes'] })
        message.success('已取消公开')
      } catch {
        message.error('操作失败')
      }
    }
  }, [queryClient, message])

  const handleEdit = useCallback((id: string) => {
    router.push(`/resumes/${id}/edit`)
  }, [router])

  return (
    <ResumeListView
      resumes={resumes || []}
      profile={profile}
      isLoading={isLoading}
      title="我的简历"
      subtitle="管理您的所有简历"
      showPublic
      showInitFromProfile
      isCreating={isCreating}
      onEdit={handleEdit}
      onCreate={handleCreate}
      onDelete={handleDelete}
      onDuplicate={handleDuplicate}
      onRename={handleRename}
      onPrint={handlePrint}
      onTogglePublic={handleTogglePublic}
    />
  )
}

// ─── 游客列表 ───

function GuestResumeList() {
  const router = useRouter()
  const { message } = App.useApp()

  const [resumes, setResumes] = useState<GuestResume[]>([])
  const [profile, setProfile] = useState<GuestProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadData = useCallback(() => {
    setResumes(getGuestResumes())
    setProfile(getGuestProfile())
    setIsLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleCreate = useCallback((name: string) => {
    const resume = createGuestResume(name)
    router.push(`/resumes/${resume.id}/edit`)
  }, [router])

  const handleDelete = useCallback((id: string) => {
    deleteGuestResume(id)
    loadData()
    message.success('已删除')
  }, [loadData, message])

  const handleDuplicate = useCallback((id: string) => {
    duplicateGuestResume(id)
    loadData()
    message.success('已复制')
  }, [loadData, message])

  const handleRename = useCallback((id: string, name: string) => {
    try {
      updateGuestResume(id, { name })
      loadData()
      message.success('重命名成功')
    } catch {
      message.error('重命名失败')
    }
  }, [loadData, message])

  const handlePrint = useCallback(async (id: string) => {
    const resume = getGuestResume(id)
    if (!resume) {
      message.error({ content: '简历不存在', key: 'print' })
      return
    }
    await printResume(resume as Parameters<typeof printResume>[0])
  }, [message])

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
      title="我的简历"
      subtitle="游客模式 · 数据保存在浏览器本地"
      showPublic={false}
      showInitFromProfile={false}
      onEdit={handleEdit}
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
