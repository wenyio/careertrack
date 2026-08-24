/**
 * 后台管理相关 Hooks
 *
 * 使用 TanStack Query 管理后台数据
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { App } from 'antd'
import {
  getAdminStats,
  getAdminUsers,
  getAdminUser,
  updateAdminUserRole,
  deleteAdminUser,
  batchDeleteAdminUsers,
  batchUpdateAdminUserRole,
  getAdminUserResumes,
  getAdminUserProfile,
  getAdminResumes,
  getAdminResume,
  deleteAdminResume,
  batchDeleteAdminResumes,
  createRegistrationCode,
  getRegistrationCodes,
  updateUserStatus,
  getAdminUserOAuthAccounts,
  deleteAdminUserOAuthAccount,
  updateRegistrationCodeStatus,
  deleteRegistrationCode,
} from '@/services/admin'
import { getErrorMessage } from '@/utils/error'
import { useI18n } from '@/i18n'

/** 查询 key 常量 */
export const ADMIN_STATS_KEY = ['admin', 'stats']
export const adminUsersKey = (q?: string, page = 1, pageSize = 20) =>
  ['admin', 'users', q || '', page, pageSize]
export const adminUserKey = (id: string) => ['admin', 'user', id]
export const adminUserResumesKey = (id: string, page = 1, pageSize = 20) =>
  ['admin', 'user', id, 'resumes', page, pageSize]
export const adminUserProfileKey = (id: string) => ['admin', 'user', id, 'profile']
export const adminResumesKey = (
  q?: string,
  pub?: string,
  page = 1,
  pageSize = 20,
) => ['admin', 'resumes', q || '', pub || 'all', page, pageSize]
export const adminResumeKey = (id: string) => ['admin', 'resume', id]
export const adminRegistrationCodesKey = (
  status?: string,
  page = 1,
  pageSize = 20,
) => ['admin', 'registration-codes', status || 'all', page, pageSize]
export const adminUserOAuthAccountsKey = (userId: string) => ['admin', 'user', userId, 'oauth-accounts']

/**
 * 获取概览统计
 */
export function useAdminStats() {
  return useQuery({
    queryKey: ADMIN_STATS_KEY,
    queryFn: getAdminStats,
  })
}

/**
 * 获取用户列表
 */
export function useAdminUsers(q?: string, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: adminUsersKey(q, page, pageSize),
    queryFn: () => getAdminUsers(q, page, pageSize),
  })
}

/**
 * 获取用户详情
 */
export function useAdminUser(id: string) {
  return useQuery({
    queryKey: adminUserKey(id),
    queryFn: () => getAdminUser(id),
    enabled: !!id,
  })
}

/**
 * 修改用户角色
 */
export function useUpdateAdminUserRole() {
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const { t } = useI18n()

  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      updateAdminUserRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: ADMIN_STATS_KEY })
      message.success(t('admin.roleUpdated'))
    },
    onError: (error: Error) => {
      message.error(getErrorMessage(error, t('admin.roleUpdateFailed')))
    },
  })
}

/**
 * 删除用户
 */
export function useDeleteAdminUser() {
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const { t } = useI18n()

  return useMutation({
    mutationFn: (id: string) => deleteAdminUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: ADMIN_STATS_KEY })
      message.success(t('admin.userDeleted'))
    },
    onError: (error: Error) => {
      message.error(getErrorMessage(error, t('admin.deleteFailed')))
    },
  })
}

/**
 * 批量删除用户
 */
export function useBatchDeleteAdminUsers() {
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const { t } = useI18n()

  return useMutation({
    mutationFn: (ids: string[]) => batchDeleteAdminUsers(ids),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: ADMIN_STATS_KEY })
      message.success(t('admin.usersDeleted', { count: data.deleted }))
    },
    onError: (error: Error) => {
      message.error(getErrorMessage(error, t('admin.batchDeleteFailed')))
    },
  })
}

/**
 * 批量修改用户角色
 */
export function useBatchUpdateAdminUserRole() {
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const { t } = useI18n()

  return useMutation({
    mutationFn: ({ ids, role }: { ids: string[]; role: string }) =>
      batchUpdateAdminUserRole(ids, role),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: ADMIN_STATS_KEY })
      message.success(t('admin.usersRoleUpdated', { count: data.updated }))
    },
    onError: (error: Error) => {
      message.error(getErrorMessage(error, t('admin.batchRoleFailed')))
    },
  })
}

/**
 * 获取指定用户的简历列表
 */
export function useAdminUserResumes(id: string, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: adminUserResumesKey(id, page, pageSize),
    queryFn: () => getAdminUserResumes(id, page, pageSize),
    enabled: !!id,
  })
}

/**
 * 获取指定用户的个人信息
 */
export function useAdminUserProfile(id: string) {
  return useQuery({
    queryKey: adminUserProfileKey(id),
    queryFn: () => getAdminUserProfile(id),
    enabled: !!id,
  })
}

/**
 * 获取简历列表
 */
export function useAdminResumes(
  q?: string,
  pub?: string,
  page = 1,
  pageSize = 20,
) {
  return useQuery({
    queryKey: adminResumesKey(q, pub, page, pageSize),
    queryFn: () => getAdminResumes(q, pub, page, pageSize),
  })
}

/**
 * 获取简历详情
 */
export function useAdminResume(id: string) {
  return useQuery({
    queryKey: adminResumeKey(id),
    queryFn: () => getAdminResume(id),
    enabled: !!id,
  })
}

/**
 * 删除简历
 */
export function useDeleteAdminResume() {
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const { t } = useI18n()

  return useMutation({
    mutationFn: (id: string) => deleteAdminResume(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'resumes'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'user'] })
      queryClient.invalidateQueries({ queryKey: ADMIN_STATS_KEY })
      message.success(t('admin.resumeDeleted'))
    },
    onError: (error: Error) => {
      message.error(getErrorMessage(error, t('admin.deleteFailed')))
    },
  })
}

/**
 * 批量删除简历
 */
export function useBatchDeleteAdminResumes() {
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const { t } = useI18n()

  return useMutation({
    mutationFn: (ids: string[]) => batchDeleteAdminResumes(ids),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'resumes'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'user'] })
      queryClient.invalidateQueries({ queryKey: ADMIN_STATS_KEY })
      message.success(t('admin.resumesDeleted', { count: data.deleted }))
    },
    onError: (error: Error) => {
      message.error(getErrorMessage(error, t('admin.batchDeleteFailed')))
    },
  })
}

// ============ 注册码管理 ============

/**
 * 获取注册码列表
 */
export function useRegistrationCodes(
  status?: string,
  page = 1,
  pageSize = 20,
) {
  return useQuery({
    queryKey: adminRegistrationCodesKey(status, page, pageSize),
    queryFn: () => getRegistrationCodes(status, page, pageSize),
  })
}

/**
 * 创建注册码
 */
export function useCreateRegistrationCode() {
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const { t } = useI18n()

  return useMutation({
    mutationFn: (data?: { label?: string; expires_at?: string }) =>
      createRegistrationCode(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'registration-codes'] })
      message.success(t('admin.registrationCodeCreated'))
    },
    onError: (error: Error) => {
      message.error(getErrorMessage(error, t('admin.registrationCodeCreateFailed')))
    },
  })
}

// ============ 用户状态管理 ============

/**
 * 禁用/启用用户
 */
export function useUpdateUserStatus() {
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const { t } = useI18n()

  return useMutation({
    mutationFn: ({ id, disabled }: { id: string; disabled: boolean }) =>
      updateUserStatus(id, disabled),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: adminUserKey(variables.id) })
      queryClient.invalidateQueries({ queryKey: ADMIN_STATS_KEY })
      message.success(variables.disabled ? t('admin.userDisabled') : t('admin.userEnabled'))
    },
    onError: (error: Error) => {
      message.error(getErrorMessage(error, t('admin.operationFailed')))
    },
  })
}

// ============ OAuth 绑定管理 ============

/**
 * 获取指定用户的 OAuth 绑定列表
 */
export function useAdminUserOAuthAccounts(userId: string) {
  return useQuery({
    queryKey: adminUserOAuthAccountsKey(userId),
    queryFn: () => getAdminUserOAuthAccounts(userId),
    enabled: !!userId,
  })
}

/**
 * 管理员解绑用户 OAuth 账号
 */
export function useDeleteAdminUserOAuthAccount() {
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const { t } = useI18n()

  return useMutation({
    mutationFn: ({ userId, oauthAccountId }: { userId: string; oauthAccountId: string }) =>
      deleteAdminUserOAuthAccount(userId, oauthAccountId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: adminUserOAuthAccountsKey(variables.userId) })
      queryClient.invalidateQueries({ queryKey: adminUserKey(variables.userId) })
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      message.success(t('admin.unbound'))
    },
    onError: (error: Error) => {
      message.error(getErrorMessage(error, t('admin.unbindFailed')))
    },
  })
}

// ============ 注册码状态管理 ============

/**
 * 禁用/启用注册码
 */
export function useUpdateRegistrationCodeStatus() {
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const { t } = useI18n()

  return useMutation({
    mutationFn: ({ id, disabled }: { id: string; disabled: boolean }) =>
      updateRegistrationCodeStatus(id, disabled),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'registration-codes'] })
      message.success(variables.disabled ? t('admin.registrationCodeDisabled') : t('admin.registrationCodeEnabled'))
    },
    onError: (error: Error) => {
      message.error(getErrorMessage(error, t('admin.operationFailed')))
    },
  })
}

/**
 * 删除注册码
 */
export function useDeleteRegistrationCode() {
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const { t } = useI18n()

  return useMutation({
    mutationFn: (id: string) => deleteRegistrationCode(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'registration-codes'] })
      message.success(t('admin.registrationCodeDeleted'))
    },
    onError: (error: Error) => {
      message.error(getErrorMessage(error, t('admin.deleteFailed')))
    },
  })
}
