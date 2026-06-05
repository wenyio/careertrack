/**
 * 游客模式 localStorage 适配器
 *
 * 封装 localStorage 的 CRUD 操作，使用 JSON 序列化。
 * 所有 key 统一使用 `guest_` 前缀，避免与正式用户数据冲突。
 *
 * 提供两种模式：
 * - 集合适配器（createCollectionAdapter）：管理数组集合，如简历列表
 * - 单例适配器（createSingletonAdapter）：管理单个对象，如 profile
 */

const KEY_PREFIX = 'guest_'

/**
 * 集合存储适配器接口
 */
export interface CollectionAdapter<T extends { id: string }> {
  list(): T[]
  get(id: string): T | null
  create(item: T): T
  update(id: string, data: Partial<T>): T
  remove(id: string): void
}

/**
 * 单例存储适配器接口
 */
export interface SingletonAdapter<T> {
  get(): T | null
  set(data: T): T
  update(data: Partial<T>): T
  remove(): void
}

/**
 * 创建集合适配器（管理数组集合）
 *
 * @param storageKey localStorage key（不含前缀）
 */
export function createCollectionAdapter<T extends { id: string }>(
  storageKey: string,
): CollectionAdapter<T> {
  const fullKey = KEY_PREFIX + storageKey

  function readAll(): T[] {
    if (typeof window === 'undefined') return []
    try {
      const raw = localStorage.getItem(fullKey)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  function writeAll(items: T[]): void {
    localStorage.setItem(fullKey, JSON.stringify(items))
  }

  return {
    list(): T[] {
      return readAll()
    },

    get(id: string): T | null {
      const items = readAll()
      return items.find((item) => item.id === id) || null
    },

    create(item: T): T {
      const items = readAll()
      items.push(item)
      writeAll(items)
      return item
    },

    update(id: string, data: Partial<T>): T {
      const items = readAll()
      const index = items.findIndex((item) => item.id === id)
      if (index === -1) {
        throw new Error(`Item not found: ${id}`)
      }
      const updated = { ...items[index], ...data, id } as T
      items[index] = updated
      writeAll(items)
      return updated
    },

    remove(id: string): void {
      const items = readAll()
      writeAll(items.filter((item) => item.id !== id))
    },
  }
}

/**
 * 创建单例适配器（管理单个对象）
 *
 * @param storageKey localStorage key（不含前缀）
 */
export function createSingletonAdapter<T>(storageKey: string): SingletonAdapter<T> {
  const fullKey = KEY_PREFIX + storageKey

  return {
    get(): T | null {
      if (typeof window === 'undefined') return null
      try {
        const raw = localStorage.getItem(fullKey)
        return raw ? JSON.parse(raw) : null
      } catch {
        return null
      }
    },

    set(data: T): T {
      localStorage.setItem(fullKey, JSON.stringify(data))
      return data
    },

    update(data: Partial<T>): T {
      const existing = this.get() || ({} as T)
      const updated = { ...existing, ...data } as T
      localStorage.setItem(fullKey, JSON.stringify(updated))
      return updated
    },

    remove(): void {
      localStorage.removeItem(fullKey)
    },
  }
}
