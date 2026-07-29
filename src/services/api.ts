/**
 * API 请求配置
 *
 * 使用 Axios 作为 HTTP 客户端，统一处理：
 * - 请求/响应拦截
 * - 同源 HttpOnly 会话 Cookie
 * - 错误处理
 * - 请求取消
 */

import axios from 'axios'
import { useAuthStore } from '@/stores/useAuthStore'
import { queryClient } from '@/lib/query-client'

/**
 * 创建 Axios 实例
 *
 * 使用相对路径 /api，因为前后端同源
 */
const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 30000, // 30 秒超时
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * 响应拦截器
 *
 * 统一处理响应错误：
 * - 401: 会话过期或无效，清除客户端认证状态并跳转登录页
 * - 403: 权限不足
 * - 500: 服务器错误
 */
api.interceptors.response.use(
  (response) => {
    // 直接返回响应数据
    return response
  },
  (error) => {
    // 处理网络错误
    if (!error.response) {
      return Promise.reject(error)
    }

    const { status } = error.response

    switch (status) {
      case 401: {
        // 会话过期或无效，清除认证状态并跳转登录页
        // 避免在以下场景触发重定向，防止死循环：
        // 1. 已在登录/注册页
        // 2. 请求的是公开 API（/public/）
        // 3. 请求的是用户状态查询接口（/auth/、/profile），公开页也会调用
        if (typeof window !== 'undefined') {
          const path = window.location.pathname
          const isAuthPage = path.startsWith('/auth/')
          const requestUrl = error.config?.url || ''
          const isPublicApi = requestUrl.includes('/public/')
          const isStatusCheck = requestUrl.includes('/auth/') || requestUrl.includes('/profile')

          if (!isAuthPage && !isPublicApi && !isStatusCheck) {
            queryClient.clear()
            useAuthStore.getState().logout()
            window.location.href = '/auth/login'
          }
        }
        break
      }
    }

    return Promise.reject(error)
  }
)

export default api
