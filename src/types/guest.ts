/**
 * 游客模式类型定义
 *
 * 游客简历数据完全存储在浏览器本地（localStorage），
 * 不涉及服务端 API，不生成用户账号。
 */

import type {
  ResumeContent,
  ModulesConfig,
  ResumeModuleType,
  ResumeTemplateId,
} from './resume'

/**
 * 游客简历数据结构
 *
 * 与服务端 Resume 对齐，但去掉 user_id、is_public、public_slug 等服务端字段。
 */
export interface GuestResume {
  id: string
  name: string
  content: ResumeContent
  modules_config: ModulesConfig
  modules_order: ResumeModuleType[]
  template: ResumeTemplateId
  created_at: string
  updated_at: string
}
