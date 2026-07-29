/**
 * API 工具函数
 *
 * 提供统一的响应格式和错误处理
 */

import { NextResponse } from 'next/server'
import { resolveRequestAuthSession } from '@/lib/security/auth-session'

/**
 * 成功响应
 */
export function success<T>(data: T, status = 200) {
  return NextResponse.json(data, { status })
}

/**
 * 错误响应
 */
const ERROR_CODE_BY_STATUS: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  500: 'INTERNAL_ERROR',
}

export function error(
  message: string,
  status = 400,
  code = ERROR_CODE_BY_STATUS[status] || 'ERROR',
) {
  return NextResponse.json(
    { code, message },
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
async function getAuthUser(request: Request) {
  const session = await resolveRequestAuthSession(request)
  return session?.user || null
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
    return error(
      '账号已被禁用，请联系管理员',
      403,
      'ACCOUNT_DISABLED',
    )
  }
  return handler(user)
}

/**
 * 需要管理员权限的请求处理
 *
 * 会话解析会联表读取数据库中的最新角色，不信任 JWT 内旧角色字段。
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
    return error(
      '账号已被禁用，请联系管理员',
      403,
      'ACCOUNT_DISABLED',
    )
  }

  if (authUser.role !== 'admin') {
    return error('权限不足', 403)
  }

  return handler({
    id: authUser.id,
    username: authUser.username,
    role: authUser.role,
  })
}
