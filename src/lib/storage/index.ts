/**
 * 存储适配器选择
 *
 * 根据环境变量选择 SQLite 或 PostgreSQL 适配器：
 * - STORAGE_DRIVER=sqlite → SQLite（显式指定）
 * - STORAGE_DRIVER=postgres → PostgreSQL（显式指定）
 * - 未设置 STORAGE_DRIVER 但有 DATABASE_URL → PostgreSQL（向后兼容）
 * - 未设置 STORAGE_DRIVER 且无 DATABASE_URL → SQLite（默认）
 */

import { query as sqliteQuery, transaction as sqliteTransaction, getDb } from './sqlite'
import { query as pgQuery, transaction as pgTransaction, getPool as getPgPool } from './postgres'
import { ensureAdmin } from '../bootstrap'
import type { DatabaseQuery, DatabaseTransaction } from './types'
import { runMigrations } from './migrations'

/** 判断使用的存储驱动 */
const driver =
  process.env.STORAGE_DRIVER === 'postgres' ? 'postgres'
  : process.env.STORAGE_DRIVER === 'sqlite' ? 'sqlite'
  : process.env.DATABASE_URL ? 'postgres'
  : 'sqlite'

const rawQuery: DatabaseQuery = driver === 'postgres'
  ? pgQuery as DatabaseQuery
  : sqliteQuery
const rawTransaction: DatabaseTransaction = driver === 'postgres'
  ? pgTransaction
  : sqliteTransaction

let initializePromise: Promise<void> | null = null

/** 首次运行时显式初始化管理员；模块导入本身不再访问数据库。 */
export function ensureStorageInitialized(): Promise<void> {
  if (!initializePromise) {
    initializePromise = runMigrations(driver, rawTransaction)
      .then(() => ensureAdmin(rawQuery))
      .catch((error) => {
      initializePromise = null
      throw error
      })
  }
  return initializePromise
}

/** API Routes 统一通过此接口访问数据库。 */
export const query: DatabaseQuery = async (text, params) => {
  await ensureStorageInitialized()
  return rawQuery(text, params)
}

export const transaction: DatabaseTransaction = async (callback) => {
  await ensureStorageInitialized()
  return rawTransaction(callback)
}

/**
 * 导出 getPool：返回底层数据库连接实例
 * - PostgreSQL: 返回 pg.Pool
 * - SQLite: 返回 better-sqlite3 Database
 *
 * 注意：此函数主要用于诊断和特殊场景，
 * 正常情况下 API Routes 只需要使用 query()
 */
export async function getPool() {
  return driver === 'postgres' ? getPgPool() : getDb()
}

export type { DatabaseQuery, DatabaseQueryResult } from './types'
