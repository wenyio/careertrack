/**
 * API 工具函数
 *
 * 提供统一的响应格式和错误处理
 */

import { NextResponse } from 'next/server'
import { verifyToken } from './auth'
import { query } from './db'

/**
 * 成功响应
 */
export function success<T>(data: T, status = 200) {
  return NextResponse.json(data, { status })
}

/**
 * 错误响应
 */
export function error(message: string, status = 400) {
  return NextResponse.json(
    { code: 'ERROR', message },
    { status }
  )
}

/**
 * 从请求中获取认证用户
 *
 * 返回值包含 disabled_at，由调用方决定如何处理。
 * 被禁用的用户不返回 null，而是返回含 disabled_at 的对象，
 * 以便 withAuth 能区分 401（未登录）和 403（被禁用）。
 *
 * @param request 请求对象
 * @returns 用户信息或 null
 */
async function getAuthUser(request: Request): Promise<{ id: string; username: string; disabled_at: string | null } | null> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.slice(7)
  const claims = await verifyToken(token)
  if (!claims) {
    return null
  }

  // 查询用户是否存在
  const result = await query(
    'SELECT id, username, disabled_at FROM users WHERE id = $1',
    [claims.sub]
  )

  if (result.rows.length === 0) {
    return null
  }

  return result.rows[0]
}

/**
 * 需要认证的请求处理
 *
 * @param request 请求对象
 * @param handler 处理函数
 * @returns 响应
 */
export async function withAuth(
  request: Request,
  handler: (user: { id: string; username: string }) => Promise<NextResponse>
) {
  const user = await getAuthUser(request)
  if (!user) {
    return error('未授权', 401)
  }
  if (user.disabled_at) {
    return error('账号已被禁用，请联系管理员', 403)
  }
  return handler(user)
}

/**
 * 需要管理员权限的请求处理
 *
 * 从数据库读取当前用户角色，确认 role === 'admin' 后才允许访问。
 * 权限不足返回 403，未登录返回 401。
 *
 * @param request 请求对象
 * @param handler 处理函数
 * @returns 响应
 */
export async function withAdminAuth(
  request: Request,
  handler: (user: { id: string; username: string; role: string }) => Promise<NextResponse>
) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return error('未授权', 401)
  }
  if (authUser.disabled_at) {
    return error('账号已被禁用，请联系管理员', 403)
  }

  // 从数据库读取最新角色信息
  const result = await query(
    'SELECT id, username, role FROM users WHERE id = $1',
    [authUser.id]
  )

  if (result.rows.length === 0) {
    return error('用户不存在', 401)
  }

  const user = result.rows[0]
  if (user.role !== 'admin') {
    return error('权限不足', 403)
  }

  return handler({ id: user.id, username: user.username, role: user.role })
}
