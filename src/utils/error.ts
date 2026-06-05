/**
 * 错误处理工具函数
 *
 * 统一处理 Axios 错误和其他常见错误的提取
 */

/**
 * 从错误对象中提取用户友好的错误消息
 *
 * 兼容 Axios 错误、标准 Error 和未知错误类型
 *
 * @param error 捕获的错误对象
 * @param fallback 默认错误消息
 * @returns 用户友好的错误消息
 */
export function getErrorMessage(error: unknown, fallback = '操作失败'): string {
  if (error instanceof Error) {
    // Axios 错误的 response.data.message
    const axiosError = error as { response?: { data?: { message?: string } } }
    return axiosError.response?.data?.message || error.message || fallback
  }
  if (typeof error === 'string') {
    return error || fallback
  }
  return fallback
}

/**
 * 从错误对象中提取错误码
 *
 * @param error 捕获的错误对象
 * @returns 错误码或 null
 */
export function getErrorCode(error: unknown): string | null {
  if (error instanceof Error) {
    const axiosError = error as { response?: { data?: { code?: string } } }
    return axiosError.response?.data?.code || null
  }
  return null
}
