/**
 * 应用引导模块
 *
 * 首次启动时检查是否存在管理员账号。
 * 若不存在且配置了 ADMIN_USERNAME / ADMIN_PASSWORD 环境变量，则自动创建。
 */

import { hashPassword } from './auth'

/** 全局标记，避免重复执行（Next.js 热重载场景） */
const globalForBootstrap = globalThis as unknown as {
  adminEnsured: boolean
}

/**
 * 确保至少存在一个管理员账号
 *
 * @param queryFn 数据库查询函数（由调用方注入，避免循环依赖）
 */
export async function ensureAdmin(
  queryFn: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>
): Promise<void> {
  if (globalForBootstrap.adminEnsured) return

  try {
    // 检查是否已有管理员
    const { rows } = await queryFn(
      `SELECT id FROM users WHERE role = 'admin' LIMIT 1`
    )

    if (rows.length > 0) {
      globalForBootstrap.adminEnsured = true
      return
    }

    // 没有管理员，尝试从环境变量创建
    const username = process.env.ADMIN_USERNAME
    const password = process.env.ADMIN_PASSWORD

    if (!username || !password) {
      console.warn(
        '[bootstrap] 未检测到管理员账号。' +
        '请设置 ADMIN_USERNAME 和 ADMIN_PASSWORD 环境变量后重启，' +
        '或手动在数据库中创建管理员用户。'
      )
      globalForBootstrap.adminEnsured = true
      return
    }

    if (password.length < 6) {
      console.error('[bootstrap] ADMIN_PASSWORD 长度不能少于 6 位，跳过自动创建。')
      globalForBootstrap.adminEnsured = true
      return
    }

    const passwordHash = await hashPassword(password)

    await queryFn(
      `INSERT INTO users (username, password_hash, role, auth_provider)
       VALUES ($1, $2, 'admin', 1)`,
      [username, passwordHash]
    )

    console.log(`[bootstrap] 管理员账号已创建: ${username}`)
    globalForBootstrap.adminEnsured = true
  } catch (error) {
    // 数据库不存在、用户名已存在等情况不阻塞启动
    // 数据库不存在时会在后续请求中由 schema init 自动创建
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes('does not exist') || msg.includes('ECONNREFUSED')) {
      // 数据库尚未就绪，下次请求时重试
      console.warn('[bootstrap] 数据库未就绪，稍后重试:', msg)
    } else {
      console.error('[bootstrap] 创建管理员账号失败:', error)
      globalForBootstrap.adminEnsured = true
    }
  }
}
