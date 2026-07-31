/**
 * 简历相关 API 服务
 *
 * 处理简历的 CRUD 操作、公开简历等
 */

import api from './api'
import { parsePaginatedResponse } from './pagination'
import type {
  Resume,
  ResumeListItem,
  CreateResumeRequest,
  UpdateResumeRequest,
  PublishResumeRequest,
  PublicResume,
  ResumeVersion,
  ResumeVersionDetail,
  CreateResumeVersionRequest,
} from '@/types/resume'
import type { PaginatedData } from '@/types/pagination'

/**
 * 获取简历列表
 *
 * @returns 简历列表
 */
export async function getResumes(
  page = 1,
  pageSize = 20,
  q = '',
): Promise<PaginatedData<ResumeListItem>> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  })
  if (q) params.set('q', q)
  const response = await api.get<ResumeListItem[]>(`/resumes?${params}`)
  return parsePaginatedResponse(response, page, pageSize)
}

/**
 * 获取简历详情
 *
 * @param id 简历 ID
 * @returns 简历详情
 */
export async function getResume(id: string): Promise<Resume> {
  const response = await api.get<Resume>(`/resumes/${id}`)
  return response.data
}

/**
 * 创建简历
 *
 * @param data 创建简历请求
 * @returns 创建的简历
 */
export async function createResume(data: CreateResumeRequest): Promise<Resume> {
  const response = await api.post<Resume>('/resumes', data)
  return response.data
}

/**
 * 更新简历
 *
 * @param id 简历 ID
 * @param data 更新数据
 * @returns 更新后的简历
 */
export async function updateResume(id: string, data: UpdateResumeRequest): Promise<Resume> {
  const response = await api.put<Resume>(`/resumes/${id}`, data)
  return response.data
}

/**
 * 删除简历
 *
 * @param id 简历 ID
 */
export async function deleteResume(id: string): Promise<void> {
  await api.delete(`/resumes/${id}`)
}

/**
 * 复制简历
 *
 * @param id 要复制的简历 ID
 * @returns 复制后的新简历
 */
export async function duplicateResume(id: string): Promise<Resume> {
  const response = await api.post<Resume>(`/resumes/${id}/duplicate`)
  return response.data
}

/**
 * 公开简历
 *
 * @param id 简历 ID
 * @param data 公开配置
 */
export async function publishResume(id: string, data: PublishResumeRequest): Promise<void> {
  await api.post(`/resumes/${id}/publish`, data)
}

/**
 * 取消公开简历
 *
 * @param id 简历 ID
 */
export async function unpublishResume(id: string): Promise<void> {
  await api.delete(`/resumes/${id}/unpublish`)
}

/**
 * 获取公开简历（无需认证）
 *
 * @param slug 简历公开链接
 * @returns 公开简历数据
 */
export async function getPublicResume(slug: string): Promise<PublicResume> {
  const response = await api.get<PublicResume>(`/public/${slug}`)
  return response.data
}

/**
 * 获取简历预览 Token（临时链接，24h 有效）
 *
 * @param id 简历 ID
 * @returns 预览 token 和 URL
 */
export async function getPreviewToken(id: string): Promise<{ token: string; expires_at: number; preview_url: string }> {
  const response = await api.post(`/resumes/${id}/preview-token`)
  return response.data
}

export async function getResumeVersions(
  id: string,
  page = 1,
  pageSize = 20,
): Promise<PaginatedData<ResumeVersion>> {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  const response = await api.get<ResumeVersion[]>(`/resumes/${id}/versions?${params}`)
  return parsePaginatedResponse(response, page, pageSize)
}

export async function getResumeVersion(id: string, versionId: string): Promise<ResumeVersionDetail> {
  const response = await api.get<ResumeVersionDetail>(`/resumes/${id}/versions/${versionId}`)
  return response.data
}

export async function createResumeVersion(
  id: string,
  data: CreateResumeVersionRequest,
): Promise<ResumeVersion> {
  const response = await api.post<ResumeVersion>(`/resumes/${id}/versions`, data)
  return response.data
}

export async function restoreResumeVersion(
  id: string,
  versionId: string,
  expectedRevision: number,
): Promise<Resume> {
  const response = await api.post<Resume>(`/resumes/${id}/versions/${versionId}/restore`, {
    expected_revision: expectedRevision,
  })
  return response.data
}
