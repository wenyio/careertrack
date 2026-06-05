/**
 * 游客数据迁移服务单元测试
 *
 * 验证 hasGuestData、clearAllGuestData、migrateGuestResumes 逻辑。
 * 使用 mock 隔离 localStorage 和 API 调用。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock localStorage for Node.js environment
const store: Record<string, string> = {}
const localStorageMock = {
  getItem(key: string) { return store[key] ?? null },
  setItem(key: string, value: string) { store[key] = value },
  removeItem(key: string) { delete store[key] },
  clear() { Object.keys(store).forEach(k => delete store[k]) },
}
vi.stubGlobal('localStorage', localStorageMock)
vi.stubGlobal('window', { localStorage: localStorageMock })

// Mock API services
vi.mock('@/services/resume', () => ({
  createResume: vi.fn(),
  updateResume: vi.fn(),
}))

// Mock guest store
vi.mock('@/stores/useGuestStore', () => ({
  useGuestStore: {
    getState: vi.fn(() => ({
      exitGuestMode: vi.fn(),
    })),
  },
}))

import { hasGuestData, clearAllGuestData, migrateGuestResumes } from '../guest-migration'
import { createResume, updateResume } from '@/services/resume'
import { createGuestResume } from '../guest-resume'

describe('hasGuestData', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('无游客数据时返回 false', () => {
    expect(hasGuestData()).toBe(false)
  })

  it('有游客数据时返回 true', () => {
    createGuestResume('测试简历')
    expect(hasGuestData()).toBe(true)
  })
})

describe('clearAllGuestData', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('清除所有游客数据', () => {
    createGuestResume('简历一')
    createGuestResume('简历二')
    expect(hasGuestData()).toBe(true)

    clearAllGuestData()
    expect(hasGuestData()).toBe(false)
  })

  it('无数据时调用不报错', () => {
    expect(() => clearAllGuestData()).not.toThrow()
  })
})

describe('migrateGuestResumes', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(createResume).mockReset()
    vi.mocked(updateResume).mockReset()
  })

  it('无游客数据时返回空结果', async () => {
    const result = await migrateGuestResumes()
    expect(result).toEqual({ total: 0, success: 0, failed: 0, errors: [] })
  })

  it('成功迁移所有简历', async () => {
    createGuestResume('简历一')
    createGuestResume('简历二')

    vi.mocked(createResume)
      .mockResolvedValueOnce({ id: 'server-1' } as ReturnType<typeof createResume extends (...args: never[]) => infer R ? R : never>)
      .mockResolvedValueOnce({ id: 'server-2' } as ReturnType<typeof createResume extends (...args: never[]) => infer R ? R : never>)
    vi.mocked(updateResume).mockResolvedValue({} as ReturnType<typeof updateResume extends (...args: never[]) => infer R ? R : never>)

    const result = await migrateGuestResumes()

    expect(result.total).toBe(2)
    expect(result.success).toBe(2)
    expect(result.failed).toBe(0)
    expect(result.errors).toEqual([])
    expect(createResume).toHaveBeenCalledTimes(2)
    expect(updateResume).toHaveBeenCalledTimes(2)
    // 迁移后游客数据应被清理
    expect(hasGuestData()).toBe(false)
  })

  it('部分简历迁移失败', async () => {
    createGuestResume('简历一')
    createGuestResume('简历二')

    vi.mocked(createResume)
      .mockResolvedValueOnce({ id: 'server-1' } as ReturnType<typeof createResume extends (...args: never[]) => infer R ? R : never>)
      .mockRejectedValueOnce(new Error('创建失败'))
    vi.mocked(updateResume).mockResolvedValue({} as ReturnType<typeof updateResume extends (...args: never[]) => infer R ? R : never>)

    const result = await migrateGuestResumes()

    expect(result.total).toBe(2)
    expect(result.success).toBe(1)
    expect(result.failed).toBe(1)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].error).toBe('创建失败')
  })

  it('updateResume 失败时简历不被清理', async () => {
    createGuestResume('简历一')

    vi.mocked(createResume).mockResolvedValueOnce({ id: 'server-1' } as ReturnType<typeof createResume extends (...args: never[]) => infer R ? R : never>)
    vi.mocked(updateResume).mockRejectedValueOnce(new Error('更新失败'))

    const result = await migrateGuestResumes()

    expect(result.success).toBe(0)
    expect(result.failed).toBe(1)
    // 失败的简历不应被清理
    expect(hasGuestData()).toBe(true)
  })

  it('调用 createResume 时传 initialize_from_profile: false', async () => {
    createGuestResume('测试简历')

    vi.mocked(createResume).mockResolvedValueOnce({ id: 'server-1' } as ReturnType<typeof createResume extends (...args: never[]) => infer R ? R : never>)
    vi.mocked(updateResume).mockResolvedValue({} as ReturnType<typeof updateResume extends (...args: never[]) => infer R ? R : never>)

    await migrateGuestResumes()

    expect(createResume).toHaveBeenCalledWith({
      name: '测试简历',
      initialize_from_profile: false,
    })
  })

  it('调用 updateResume 时传入正确的简历内容', async () => {
    createGuestResume('测试简历')

    vi.mocked(createResume).mockResolvedValueOnce({ id: 'server-1' } as ReturnType<typeof createResume extends (...args: never[]) => infer R ? R : never>)
    vi.mocked(updateResume).mockResolvedValue({} as ReturnType<typeof updateResume extends (...args: never[]) => infer R ? R : never>)

    await migrateGuestResumes()

    expect(updateResume).toHaveBeenCalledWith('server-1', expect.objectContaining({
      modules_config: expect.objectContaining({ basic_info: true }),
      modules_order: expect.any(Array),
      template: 'classic',
    }))
  })
})
