/**
 * 游客 storage adapter 单元测试
 *
 * 验证 localStorage 适配器的 CRUD 操作。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createCollectionAdapter, createSingletonAdapter } from '../storage'

// Mock localStorage for Node.js environment
const store: Record<string, string> = {}
const localStorageMock = {
  getItem(key: string) { return store[key] ?? null },
  setItem(key: string, value: string) { store[key] = value },
  removeItem(key: string) { delete store[key] },
  clear() { Object.keys(store).forEach(k => delete store[k]) },
  get length() { return Object.keys(store).length },
  key(index: number) { return Object.keys(store)[index] ?? null },
}
vi.stubGlobal('localStorage', localStorageMock)
// storage.ts 中有 typeof window === 'undefined' 检查，需要 mock window
vi.stubGlobal('window', { localStorage: localStorageMock })

interface TestItem {
  id: string
  name: string
  value?: number
}

describe('createCollectionAdapter', () => {
  const adapter = createCollectionAdapter<TestItem>('test_collection')

  beforeEach(() => {
    // 清理 localStorage
    localStorage.removeItem('guest_test_collection')
  })

  it('list() 空存储返回空数组', () => {
    expect(adapter.list()).toEqual([])
  })

  it('create() 添加项目后 list() 可以获取', () => {
    adapter.create({ id: '1', name: 'A' })
    const items = adapter.list()
    expect(items).toHaveLength(1)
    expect(items[0].name).toBe('A')
  })

  it('create() 多个项目', () => {
    adapter.create({ id: '1', name: 'A' })
    adapter.create({ id: '2', name: 'B' })
    expect(adapter.list()).toHaveLength(2)
  })

  it('get() 存在的项目', () => {
    adapter.create({ id: '1', name: 'A' })
    const item = adapter.get('1')
    expect(item).not.toBeNull()
    expect(item!.name).toBe('A')
  })

  it('get() 不存在的项目返回 null', () => {
    expect(adapter.get('nonexistent')).toBeNull()
  })

  it('update() 更新项目', () => {
    adapter.create({ id: '1', name: 'A', value: 1 })
    const updated = adapter.update('1', { name: 'B', value: 2 })
    expect(updated.name).toBe('B')
    expect(updated.value).toBe(2)
    expect(updated.id).toBe('1') // id 保持不变
  })

  it('update() 不存在的项目抛出错误', () => {
    expect(() => adapter.update('nonexistent', { name: 'X' })).toThrow('Item not found')
  })

  it('update() 不覆盖未指定字段', () => {
    adapter.create({ id: '1', name: 'A', value: 1 })
    const updated = adapter.update('1', { name: 'B' })
    expect(updated.name).toBe('B')
    expect(updated.value).toBe(1) // 保持原值
  })

  it('remove() 删除项目', () => {
    adapter.create({ id: '1', name: 'A' })
    adapter.create({ id: '2', name: 'B' })
    adapter.remove('1')
    expect(adapter.list()).toHaveLength(1)
    expect(adapter.get('1')).toBeNull()
  })

  it('remove() 不存在的项目不报错', () => {
    adapter.create({ id: '1', name: 'A' })
    adapter.remove('nonexistent')
    expect(adapter.list()).toHaveLength(1)
  })
})

describe('createSingletonAdapter', () => {
  const adapter = createSingletonAdapter<{ name: string; age?: number }>('test_singleton')

  beforeEach(() => {
    localStorage.removeItem('guest_test_singleton')
  })

  it('get() 空存储返回 null', () => {
    expect(adapter.get()).toBeNull()
  })

  it('set() 后 get() 可以获取', () => {
    adapter.set({ name: '张三', age: 25 })
    const data = adapter.get()
    expect(data).not.toBeNull()
    expect(data!.name).toBe('张三')
    expect(data!.age).toBe(25)
  })

  it('update() 合并更新', () => {
    adapter.set({ name: '张三', age: 25 })
    adapter.update({ age: 26 })
    const data = adapter.get()
    expect(data!.name).toBe('张三')
    expect(data!.age).toBe(26)
  })

  it('update() 空存储时创建新对象', () => {
    adapter.update({ name: '李四' })
    const data = adapter.get()
    expect(data!.name).toBe('李四')
  })

  it('remove() 清除数据', () => {
    adapter.set({ name: '张三' })
    adapter.remove()
    expect(adapter.get()).toBeNull()
  })
})

describe('guest resume 数据兼容性', () => {
  it('guest resume 数据可被 buildResumeSavePayload 消费', async () => {
    const { buildResumeSavePayload } = await import('@/utils/resume-preview')
    const { DEFAULT_MODULES_CONFIG, DEFAULT_MODULES_ORDER } = await import('@/config/modules')

    // 模拟从 localStorage 读取的 guest resume 数据
    const guestResume = {
      id: 'test-id',
      name: '测试简历',
      content: {
        basic_info: { name: '张三', phone: '13800138000' },
        education: [{ id: 'edu-1', school: '清华大学' }],
      },
      modules_config: { ...DEFAULT_MODULES_CONFIG, basic_info: true },
      modules_order: [...DEFAULT_MODULES_ORDER],
      template: 'classic' as const,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    }

    // 模拟 store 的结构
    const store = {
      resumeName: guestResume.name,
      modulesConfig: guestResume.modules_config,
      modulesOrder: guestResume.modules_order,
      content: guestResume.content,
      template: guestResume.template,
    }

    const payload = buildResumeSavePayload(store, guestResume.name)

    expect(payload.name).toBe('测试简历')
    expect(payload.content.basic_info).toEqual({ name: '张三', phone: '13800138000' })
    expect(payload.content.education).toEqual([{ id: 'edu-1', school: '清华大学' }])
    expect(payload.modules_config).toEqual(guestResume.modules_config)
    expect(payload.modules_order).toEqual(guestResume.modules_order)
    expect(payload.template).toBe('classic')
    expect(payload.content.preview_config).toEqual({ fontSize: 14, lineHeight: 1.5 })
  })
})
