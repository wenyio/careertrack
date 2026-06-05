/**
 * 游客数据迁移服务
 *
 * 将 localStorage 中的游客简历迁移到服务端账号。
 * 采用两步操作：先 createResume 创建空简历，再 updateResume 写入内容。
 */

import { getGuestResumes, deleteGuestResume } from './guest-resume'
import { createResume, updateResume } from './resume'
import { useGuestStore } from '@/stores/useGuestStore'

export interface MigrationResult {
  /** 待迁移总数 */
  total: number
  /** 成功迁移数 */
  success: number
  /** 失败数 */
  failed: number
  /** 失败详情 */
  errors: Array<{ name: string; error: string }>
}

/**
 * 检查是否存在游客数据
 */
export function hasGuestData(): boolean {
  return getGuestResumes().length > 0
}

/**
 * 清除所有游客数据（跳过迁移时使用）
 */
export function clearAllGuestData(): void {
  const resumes = getGuestResumes()
  for (const resume of resumes) {
    deleteGuestResume(resume.id)
  }
  useGuestStore.getState().exitGuestMode()
}

/**
 * 迁移游客简历到服务端账号
 *
 * 对每份游客简历执行：
 * 1. createResume({ name, initialize_from_profile: false }) → 获取服务端 ID
 * 2. updateResume(serverId, { content, modules_config, modules_order, template })
 *
 * 迁移成功后自动清理对应的游客数据。
 */
export async function migrateGuestResumes(): Promise<MigrationResult> {
  const guestResumes = getGuestResumes()
  const result: MigrationResult = {
    total: guestResumes.length,
    success: 0,
    failed: 0,
    errors: [],
  }

  for (const guest of guestResumes) {
    try {
      // Step 1: 创建空简历
      const serverResume = await createResume({
        name: guest.name,
        initialize_from_profile: false,
      })

      // Step 2: 写入游客简历内容
      await updateResume(serverResume.id, {
        content: guest.content,
        modules_config: guest.modules_config,
        modules_order: guest.modules_order,
        template: guest.template,
      })

      // 成功后清理游客数据
      deleteGuestResume(guest.id)
      result.success++
    } catch (e) {
      result.failed++
      result.errors.push({
        name: guest.name,
        error: e instanceof Error ? e.message : '未知错误',
      })
    }
  }

  // 全部迁移完成后退出游客模式
  if (result.failed === 0) {
    useGuestStore.getState().exitGuestMode()
  }

  return result
}
