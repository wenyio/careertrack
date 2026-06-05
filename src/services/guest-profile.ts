/**
 * 游客 Profile 服务
 *
 * 基于 localStorage 的个人信息管理。
 * 数据存储在浏览器本地，不访问服务端 API。
 *
 * 复用 Profile 的子类型（去掉 id、user_id 等服务端字段），
 * 保证与 ModuleForm、ResumeHtmlPreview 等组件类型兼容。
 */

import { createSingletonAdapter } from '@/lib/guest/storage'
import type {
  BasicInfo,
  Education,
  Skill,
  WorkExperience,
  Project,
  Portfolio,
  Award,
  OtherExperience,
  Research,
} from '@/types/profile'

/**
 * 游客个人信息
 *
 * 与 Profile 结构对齐，但去掉 id、user_id、created_at、updated_at。
 * 所有字段可选（游客首次使用时可能没有填写任何信息）。
 */
export interface GuestProfile {
  basic_info?: Partial<BasicInfo>
  education?: Partial<Education>[]
  skills?: Partial<Skill>[]
  work_experience?: Partial<WorkExperience>[]
  projects?: Partial<Project>[]
  portfolio?: Partial<Portfolio>[]
  awards?: Partial<Award>[]
  other_experience?: Partial<OtherExperience>[]
  research?: Partial<Research>[]
  summary?: string
}

const PROFILE_STORAGE_KEY = 'profile'
const adapter = createSingletonAdapter<GuestProfile>(PROFILE_STORAGE_KEY)

/**
 * 获取游客个人信息
 */
export function getGuestProfile(): GuestProfile | null {
  return adapter.get()
}

/**
 * 更新游客个人信息（合并更新）
 */
export function updateGuestProfile(data: Partial<GuestProfile>): GuestProfile {
  return adapter.update(data)
}
