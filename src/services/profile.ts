/**
 * 个人信息相关 API 服务
 *
 * 处理个人信息的 CRUD 操作
 */

import api from './api'
import type { Profile } from '@/types/profile'

/**
 * 获取个人信息
 *
 * @returns 完整的个人信息
 */
export async function getProfile(): Promise<Profile> {
  const response = await api.get<Profile>('/profile')
  return response.data
}

/**
 * 更新个人信息
 *
 * @param profile 要更新的个人信息（部分更新）
 * @returns 更新后的个人信息
 */
export async function updateProfile(profile: Partial<Profile>): Promise<Profile> {
  const response = await api.put<Profile>('/profile', profile)
  return response.data
}
