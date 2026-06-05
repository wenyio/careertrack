/**
 * 格式化工具函数
 *
 * 提供日期、文本等常用格式化功能
 */

import dayjs from 'dayjs'

/**
 * 格式化日期
 *
 * @param date 日期字符串或 dayjs 对象
 * @param format 格式模板，默认 YYYY-MM-DD
 * @returns 格式化后的日期字符串
 *
 * @example
 * formatDate('2024-01-15') // '2024-01-15'
 * formatDate('2024-01-15', 'YYYY年MM月DD日') // '2024年01月15日'
 */
export function formatDate(date: string | dayjs.Dayjs | null | undefined, format = 'YYYY-MM-DD'): string {
  if (!date) return ''
  return dayjs(date).format(format)
}

/**
 * 格式化日期范围
 *
 * @param startDate 开始日期
 * @param endDate 结束日期（null 表示至今）
 * @param format 格式模板
 * @returns 格式化后的日期范围字符串
 *
 * @example
 * formatDateRange('2020-07', '2023-12') // '2020-07 ~ 2023-12'
 * formatDateRange('2020-07', null) // '2020-07 ~ 至今'
 */
export function formatDateRange(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  format = 'YYYY-MM'
): string {
  const start = startDate ? formatDate(startDate, format) : ''
  const end = endDate ? formatDate(endDate, format) : '至今'

  if (!start) return end
  return `${start} ~ ${end}`
}

/**
 * 截断文本
 *
 * @param text 原始文本
 * @param maxLength 最大长度
 * @returns 截断后的文本
 *
 * @example
 * truncateText('这是一段很长的文本', 5) // '这是一段很...'
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

/**
 * 格式化文件大小
 *
 * @param bytes 字节数
 * @returns 格式化后的文件大小
 *
 * @example
 * formatFileSize(1024) // '1 KB'
 * formatFileSize(1048576) // '1 MB'
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 生成随机 ID
 *
 * @param length ID 长度，默认 8
 * @returns 随机 ID 字符串
 *
 * @example
 * generateId() // 'a1b2c3d4'
 */
export function generateId(length = 8): string {
  return Math.random().toString(36).substring(2, 2 + length)
}

/**
 * 深拷贝对象
 *
 * @param obj 要拷贝的对象
 * @returns 拷贝后的新对象
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}
