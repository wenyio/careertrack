/**
 * SQLite 存储适配器
 *
 * 使用 better-sqlite3 实现与 PostgreSQL 相同的 query(text, params) 接口
 * 自动将 PostgreSQL 方言 SQL 转换为 SQLite 方言
 */

import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { SCHEMA_SQL } from './schema'

/** 查询结果接口（与 pg 模块一致） */
export interface QueryResult<T = Record<string, unknown>> {
  rows: T[]
  rowCount: number
}

/** 已知的 JSON 字段名 */
const JSON_COLUMNS = new Set([
  'basic_info', 'education', 'skills', 'work_experience', 'projects',
  'portfolio', 'awards', 'other_experience', 'research',
  'modules_config', 'modules_order', 'content',
])

/** 已知的布尔字段名 */
const BOOLEAN_COLUMNS = new Set(['otp_enabled', 'is_public'])

/**
 * 全局数据库实例缓存（避免 Next.js 热重载重复创建）
 */
const globalForDb = globalThis as unknown as {
  sqliteDb: Database.Database | undefined
}

/**
 * 获取 SQLite 数据库实例
 * 首次调用时自动创建数据库文件和表结构
 */
export function getDb(): Database.Database {
  if (!globalForDb.sqliteDb) {
    // 注意：此处动态路径会导致 Next.js NFT (Node File Tracing) 追踪整个项目目录。
    // 这是 SQLite 方案的已知限制，生产部署时建议通过 SQLITE_DB_PATH 指向明确子目录。
    // 当前 warning 不影响功能，仅增加 .next 输出体积。
    const dbPath = resolve(process.env.SQLITE_DB_PATH || '.careertrack/careertrack.db')

    // 确保目录存在
    mkdirSync(dirname(dbPath), { recursive: true })

    const db = new Database(dbPath)

    // 启用外键约束
    db.pragma('foreign_keys = ON')

    // 自动建表
    db.exec(SCHEMA_SQL)

    globalForDb.sqliteDb = db
  }

  return globalForDb.sqliteDb
}

/**
 * SQL 方言翻译：将 PostgreSQL 方言转换为 SQLite 方言
 *
 * 处理的差异：
 * - $N 参数占位符 → ?
 * - = ANY($N) → IN (?, ?, ...)
 * - NOW() → datetime('now')
 * - ILIKE → LIKE（SQLite LIKE 默认对 ASCII 不区分大小写）
 * - COUNT(*) FILTER (WHERE ...) → SUM(CASE WHEN ... THEN 1 ELSE 0 END)
 * - ::int 类型转换 → 移除
 */
function translate(sql: string, params?: unknown[]): { sql: string; params: unknown[] } {
  if (!params || params.length === 0) {
    return { sql: applyDialectFunctions(sql), params: [] }
  }

  const newParams: unknown[] = []

  // 单次遍历：同时处理 = ANY($N) 和普通 $N
  // 组合正则：= ANY($N) 优先匹配（更长的模式在前）
  const combinedRegex = /=\s*ANY\(\$(\d+)\)|\$(\d+)/gi
  let result = ''
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = combinedRegex.exec(sql)) !== null) {
    // 追加匹配之前的文本
    result += sql.substring(lastIndex, match.index)

    if (match[1]) {
      // = ANY($N) 匹配
      const idx = parseInt(match[1]) - 1
      const arr = params[idx] as unknown[]
      if (!Array.isArray(arr)) {
        throw new Error(`Expected array for ANY parameter $${match[1]}`)
      }
      result += `IN (${arr.map(() => '?').join(', ')})`
      newParams.push(...arr)
    } else if (match[2]) {
      // 普通 $N 匹配
      const idx = parseInt(match[2]) - 1
      result += '?'
      newParams.push(params[idx])
    }

    lastIndex = match.index + match[0].length
  }

  // 追加剩余文本
  result += sql.substring(lastIndex)

  // 应用其他方言转换
  result = applyDialectFunctions(result)

  return { sql: result, params: newParams }
}

/**
 * 应用非参数相关的 SQL 方言转换
 */
function applyDialectFunctions(sql: string): string {
  let result = sql

  // NOW() → datetime('now')
  result = result.replace(/NOW\(\)/gi, "datetime('now')")

  // ILIKE → LIKE（SQLite 的 LIKE 对 ASCII 默认不区分大小写）
  result = result.replace(/\bILIKE\b/gi, 'LIKE')

  // COUNT(*) FILTER (WHERE condition) → SUM(CASE WHEN condition THEN 1 ELSE 0 END)
  result = result.replace(
    /COUNT\(\*\)\s+FILTER\s+\(WHERE\s+(.+?)\)/gi,
    'SUM(CASE WHEN $1 THEN 1 ELSE 0 END)'
  )

  // 移除 ::int 类型转换（SQLite 不需要，COUNT/SUM 返回数值）
  result = result.replace(/::int/gi, '')

  return result
}

/**
 * 后处理查询结果
 * - BOOLEAN 字段：0/1 → false/true
 * - JSON 字段：字符串 → 解析后的对象
 */
function postProcess(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map((row) => {
    const processed: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(row)) {
      if (BOOLEAN_COLUMNS.has(key)) {
        processed[key] = value === 1 || value === true
      } else if (JSON_COLUMNS.has(key) && typeof value === 'string') {
        try {
          processed[key] = JSON.parse(value)
        } catch {
          processed[key] = value
        }
      } else {
        processed[key] = value
      }
    }
    return processed
  })
}

/**
 * 执行查询（与 pg 模块的 query 接口一致）
 *
 * @param text SQL 语句（PostgreSQL 方言）
 * @param params 参数
 * @returns 查询结果
 */
export async function query(text: string, params?: unknown[]): Promise<QueryResult> {
  const db = getDb()
  const { sql, params: translatedParams } = translate(text, params)
  const start = Date.now()

  let result: QueryResult

  // 根据是否包含 RETURNING 决定执行方式
  // better-sqlite3 的 .run() 不返回 RETURNING 的行，需要 .all()
  if (/RETURNING/i.test(sql)) {
    const rows = db.prepare(sql).all(...translatedParams) as Record<string, unknown>[]
    result = { rows: postProcess(rows), rowCount: rows.length }
  } else if (/^\s*(SELECT|WITH|PRAGMA)/i.test(sql)) {
    const rows = db.prepare(sql).all(...translatedParams) as Record<string, unknown>[]
    result = { rows: postProcess(rows), rowCount: rows.length }
  } else {
    const info = db.prepare(sql).run(...translatedParams)
    result = { rows: [], rowCount: info.changes }
  }

  const duration = Date.now() - start
  if (process.env.NODE_ENV === 'development' && duration > 100) {
    console.log('慢查询:', { text: sql, duration, rows: result.rowCount })
  }

  return result
}
