/**
 * 后台管理相关类型定义
 */

import type { ResumeContent, ModulesConfig, ResumeModuleType, ResumeTemplateId } from './resume'

/** 管理员概览统计 */
export interface AdminStats {
  total_users: number
  admin_count: number
  total_resumes: number
  public_resumes: number
  recent_users: AdminRecentUser[]
  recent_resumes: AdminRecentResume[]
}

/** 最近注册用户 */
export interface AdminRecentUser {
  id: string
  username: string
  role: string
  created_at: string
}

/** 最近更新简历 */
export interface AdminRecentResume {
  id: string
  name: string
  username: string
  user_id: string
  is_public: boolean
  updated_at: string
}

/** 管理员用户列表项 */
export interface AdminUserItem {
  id: string
  username: string
  role: string
  otp_enabled: boolean
  auth_provider: number
  disabled_at: string | null
  resume_count: number
  created_at: string
  updated_at: string
}

/** 管理员用户详情 */
export interface AdminUserDetail {
  id: string
  username: string
  role: string
  otp_enabled: boolean
  auth_provider: number
  disabled_at: string | null
  created_at: string
  updated_at: string
}

/** 注册码 */
export interface RegistrationCode {
  id: string
  label: string | null
  created_by: string | null
  used_by_user_id: string | null
  expires_at: string | null
  disabled_at: string | null
  used_at: string | null
  created_at: string
  updated_at: string
  /** 仅在创建时返回一次 */
  code?: string
}

/** 创建注册码请求 */
export interface CreateRegistrationCodeRequest {
  label?: string
  expires_at?: string
}

/** 管理员查看的用户 OAuth 绑定 */
export interface AdminOAuthAccount {
  id: string
  provider: string
  provider_username: string | null
  email: string | null
  avatar_url: string | null
  created_at: string
}

/** 管理员简历列表项 */
export interface AdminResumeItem {
  id: string
  name: string
  user_id: string
  username: string
  is_public: boolean
  public_slug: string | null
  template: ResumeTemplateId
  created_at: string
  updated_at: string
}

/** 管理员简历详情 */
export interface AdminResumeDetail {
  id: string
  user_id: string
  username: string
  name: string
  modules_config: ModulesConfig
  modules_order: ResumeModuleType[]
  content: ResumeContent
  template: ResumeTemplateId
  is_public: boolean
  public_slug: string | null
  created_at: string
  updated_at: string
}
