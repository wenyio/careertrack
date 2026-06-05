/**
 * 后台管理 API 服务
 *
 * 处理管理员相关的数据请求
 */

import api from './api'
import type {
  AdminStats,
  AdminUserItem,
  AdminUserDetail,
  AdminResumeItem,
  AdminResumeDetail,
  RegistrationCode,
  CreateRegistrationCodeRequest,
  AdminOAuthAccount,
} from '@/types/admin'
import type { Profile } from '@/types/profile'

/**
 * 获取概览统计
 */
export async function getAdminStats(): Promise<AdminStats> {
  const response = await api.get<AdminStats>('/admin/stats')
  return response.data
}

/**
 * 获取用户列表
 */
export async function getAdminUsers(q?: string): Promise<AdminUserItem[]> {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  const response = await api.get<AdminUserItem[]>(`/admin/users?${params.toString()}`)
  return response.data
}

/**
 * 获取用户详情
 */
export async function getAdminUser(id: string): Promise<AdminUserDetail> {
  const response = await api.get<AdminUserDetail>(`/admin/users/${id}`)
  return response.data
}

/**
 * 修改用户角色
 */
export async function updateAdminUserRole(id: string, role: string): Promise<AdminUserDetail> {
  const response = await api.patch<AdminUserDetail>(`/admin/users/${id}/role`, { role })
  return response.data
}

/**
 * 获取指定用户的简历列表
 */
export async function getAdminUserResumes(id: string): Promise<AdminResumeItem[]> {
  const response = await api.get<AdminResumeItem[]>(`/admin/users/${id}/resumes`)
  return response.data
}

/**
 * 获取指定用户的个人信息
 */
export async function getAdminUserProfile(id: string): Promise<Profile> {
  const response = await api.get<Profile>(`/admin/users/${id}/profile`)
  return response.data
}

/**
 * 删除用户
 */
export async function deleteAdminUser(id: string): Promise<void> {
  await api.delete(`/admin/users/${id}`)
}

/**
 * 批量删除用户
 */
export async function batchDeleteAdminUsers(ids: string[]): Promise<{ deleted: number }> {
  const response = await api.post<{ deleted: number }>('/admin/users/batch-delete', { ids })
  return response.data
}

/**
 * 批量修改用户角色
 */
export async function batchUpdateAdminUserRole(ids: string[], role: string): Promise<{ updated: number }> {
  const response = await api.post<{ updated: number }>('/admin/users/batch-role', { ids, role })
  return response.data
}

/**
 * 获取简历列表
 */
export async function getAdminResumes(q?: string, pub?: string): Promise<AdminResumeItem[]> {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (pub && pub !== 'all') params.set('public', pub)
  const response = await api.get<AdminResumeItem[]>(`/admin/resumes?${params.toString()}`)
  return response.data
}

/**
 * 获取简历详情
 */
export async function getAdminResume(id: string): Promise<AdminResumeDetail> {
  const response = await api.get<AdminResumeDetail>(`/admin/resumes/${id}`)
  return response.data
}

/**
 * 删除简历
 */
export async function deleteAdminResume(id: string): Promise<void> {
  await api.delete(`/admin/resumes/${id}`)
}

/**
 * 批量删除简历
 */
export async function batchDeleteAdminResumes(ids: string[]): Promise<{ deleted: number }> {
  const response = await api.post<{ deleted: number }>('/admin/resumes/batch-delete', { ids })
  return response.data
}

// ============ 注册码管理 ============

/**
 * 创建注册码
 *
 * 明文仅在创建响应中返回一次
 */
export async function createRegistrationCode(data?: CreateRegistrationCodeRequest): Promise<RegistrationCode> {
  const response = await api.post<RegistrationCode>('/admin/registration-codes', data || {})
  return response.data
}

/**
 * 获取注册码列表
 *
 * @param status 筛选状态：all | unused | used | disabled | expired
 */
export async function getRegistrationCodes(status?: string): Promise<RegistrationCode[]> {
  const params = new URLSearchParams()
  if (status && status !== 'all') params.set('status', status)
  const response = await api.get<RegistrationCode[]>(`/admin/registration-codes?${params.toString()}`)
  return response.data
}

// ============ 用户状态管理 ============

/**
 * 禁用或启用用户
 */
export async function updateUserStatus(id: string, disabled: boolean): Promise<AdminUserDetail> {
  const response = await api.patch<AdminUserDetail>(`/admin/users/${id}/status`, { disabled })
  return response.data
}

// ============ OAuth 绑定管理 ============

/**
 * 获取指定用户的 OAuth 绑定列表
 */
export async function getAdminUserOAuthAccounts(userId: string): Promise<AdminOAuthAccount[]> {
  const response = await api.get<AdminOAuthAccount[]>(`/admin/users/${userId}/oauth-accounts`)
  return response.data
}

/**
 * 管理员解绑用户 OAuth 账号
 */
export async function deleteAdminUserOAuthAccount(userId: string, oauthAccountId: string): Promise<void> {
  await api.delete(`/admin/users/${userId}/oauth-accounts/${oauthAccountId}`)
}

// ============ 注册码状态管理 ============

/**
 * 禁用或启用注册码
 */
export async function updateRegistrationCodeStatus(id: string, disabled: boolean): Promise<RegistrationCode> {
  const response = await api.patch<RegistrationCode>(`/admin/registration-codes/${id}/status`, { disabled })
  return response.data
}

/**
 * 删除注册码
 */
export async function deleteRegistrationCode(id: string): Promise<void> {
  await api.delete(`/admin/registration-codes/${id}`)
}
