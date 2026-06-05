/**
 * TanStack Query 客户端配置
 *
 * TanStack Query 用于管理服务端状态，提供：
 * - 自动数据获取和缓存
 * - 后台数据重新验证
 * - 乐观更新
 * - 错误处理
 */

import { QueryClient } from '@tanstack/react-query'

/**
 * 创建 QueryClient 实例
 *
 * 配置说明：
 * - staleTime: 数据被视为"新鲜"的时间（5分钟），期间不会重新获取
 * - gcTime: 未使用的缓存数据保留时间（10分钟），超过后会被垃圾回收
 * - retry: 请求失败时的重试次数
 */
function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // 数据 5 分钟内视为新鲜，不会重新获取
        staleTime: 5 * 60 * 1000,
        // 缓存数据 10 分钟后被垃圾回收
        gcTime: 10 * 60 * 1000,
        // 请求失败时重试 1 次
        retry: 1,
        // 窗口重新获得焦点时重新获取数据
        refetchOnWindowFocus: false,
      },
      mutations: {
        // mutation 失败时不重试
        retry: false,
      },
    },
  })
}

// 导出全局 QueryClient 实例
export const queryClient = createQueryClient()
