/**
 * 游客简历服务
 *
 * 基于 localStorage 的简历 CRUD 操作。
 * 所有数据存储在浏览器本地，不访问服务端 API。
 */

import { createCollectionAdapter } from '@/lib/guest/storage'
import type { GuestResume } from '@/types/guest'
import type { UpdateResumeRequest } from '@/types/resume'

/**
 * 生成 UUID v4
 *
 * 优先使用 generateId()（安全上下文），否则 fallback 到 Math.random()
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // fallback: 用 Math.random 生成 UUID v4 格式
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
import { DEFAULT_MODULES_CONFIG, DEFAULT_MODULES_ORDER } from '@/config/modules'

const RESUME_STORAGE_KEY = 'resumes'
const adapter = createCollectionAdapter<GuestResume>(RESUME_STORAGE_KEY)

/**
 * 获取所有游客简历
 */
export function getGuestResumes(): GuestResume[] {
  return adapter.list().sort((a, b) =>
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  )
}

/**
 * 获取单个游客简历
 */
export function getGuestResume(id: string): GuestResume | null {
  return adapter.get(id)
}

/**
 * 创建游客简历
 */
export function createGuestResume(name: string): GuestResume {
  const now = new Date().toISOString()
  const resume: GuestResume = {
    id: generateId(),
    name: name || '未命名简历',
    content: {},
    modules_config: { ...DEFAULT_MODULES_CONFIG, basic_info: true },
    modules_order: [...DEFAULT_MODULES_ORDER],
    template: 'classic',
    created_at: now,
    updated_at: now,
  }
  return adapter.create(resume)
}

/**
 * 更新游客简历
 */
export function updateGuestResume(id: string, data: UpdateResumeRequest): GuestResume {
  const existing = adapter.get(id)
  if (!existing) {
    throw new Error(`Resume not found: ${id}`)
  }

  const updated: Partial<GuestResume> = {
    ...data,
    updated_at: new Date().toISOString(),
  }

  return adapter.update(id, updated)
}

/**
 * 删除游客简历
 */
export function deleteGuestResume(id: string): void {
  adapter.remove(id)
}

/**
 * 复制游客简历
 */
export function duplicateGuestResume(id: string): GuestResume {
  const original = adapter.get(id)
  if (!original) {
    throw new Error(`Resume not found: ${id}`)
  }

  const now = new Date().toISOString()
  const copy: GuestResume = {
    ...original,
    id: generateId(),
    name: `${original.name}（副本）`,
    created_at: now,
    updated_at: now,
  }
  return adapter.create(copy)
}
