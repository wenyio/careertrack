/**
 * OG Image 共享工具（纯数据层，无 JSX）
 *
 * 横图 (1200×630) 与方图 (800×800) 共用的数据读取、解析与辅助函数。
 */

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { query } from '@/lib/db'

// ============ 数据读取 ============

export interface OGResumeData {
  name: string
  position: string
  skills: string[]
  degree: string
  workYears: string
  city: string
}

/** 安全解析 JSON */
function safeParse<T>(value: unknown, fallback: T): T {
  if (!value) return fallback
  if (typeof value === 'string') {
    try { return JSON.parse(value) as T } catch { return fallback }
  }
  return value as T
}

/**
 * 从数据库读取简历 OG 所需字段
 * 查询失败时返回全部 fallback 值，不抛异常。
 */
export async function fetchOGResumeData(slug: string): Promise<OGResumeData> {
  const data: OGResumeData = {
    name: '在线简历',
    position: '',
    skills: [],
    degree: '',
    workYears: '',
    city: '',
  }

  try {
    const result = await query(
      `SELECT content FROM resumes WHERE public_slug = $1 AND is_public = true`,
      [slug],
    )
    if (result.rows.length === 0) return data

    const content = safeParse(result.rows[0].content, {} as Record<string, unknown>) as Record<string, unknown>
    const basicInfo = (content.basic_info || {}) as Record<string, unknown>
    const jobIntention = (basicInfo.job_intention || {}) as Record<string, unknown>
    const other = (basicInfo.other || {}) as Record<string, unknown>

    data.name = (basicInfo.name as string) || '在线简历'
    data.position = (jobIntention.position as string) || ''
    data.city = (other.city as string) || (jobIntention.expected_city as string) || ''
    data.workYears = other.work_years ? `${other.work_years}年` : ''
    data.degree = (other.education_level as string) || ''

    const skillsArr = (content.skills || []) as Array<{ name?: string }>
    data.skills = skillsArr.map(s => s.name).filter(Boolean).slice(0, 5) as string[]
  } catch {
    // 数据库查询失败时使用默认值
  }

  return data
}

// ============ 字体加载 ============

let cachedFont: ArrayBuffer | null = null
let fontLoadFailed = false

/**
 * 通过文件系统加载 Noto Sans SC 字体
 * 使用 node:fs 避免运行时依赖公网请求，结果缓存避免重复 IO。
 */
export async function loadFont(): Promise<ArrayBuffer | null> {
  if (fontLoadFailed) return null
  if (cachedFont) return cachedFont

  try {
    const fontPath = join(process.cwd(), 'public', 'fonts', 'NotoSansSC-Regular.ttf')
    const buffer = await readFile(fontPath)
    cachedFont = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
    return cachedFont
  } catch {
    fontLoadFailed = true
    return null
  }
}

// ============ 文本工具 ============

/** 截断文本到指定长度 */
export function truncate(text: string, max: number): string {
  if (!text || text.length <= max) return text || ''
  return text.slice(0, max) + '…'
}

/** 组装信息行：职位 · 年限 · 城市 · 学历 */
export function buildInfoLine(data: OGResumeData): string {
  const parts: string[] = []
  if (data.position) parts.push(data.position)
  if (data.workYears) parts.push(data.workYears)
  if (data.city) parts.push(data.city)
  if (data.degree) parts.push(data.degree)
  return parts.join(' · ')
}

// ============ 样式常量 ============

/** 品牌蓝 */
export const BRAND_BLUE = '#1677ff'
/** 品牌深蓝 */
export const BRAND_BLUE_DARK = '#0958d9'
/** 外层背景渐变色（与登录页一致） */
export const BG_GRADIENT_START = '#667eea'
export const BG_GRADIENT_END = '#764ba2'
/** 主文字色 */
export const TEXT_PRIMARY = '#1a1a1a'
/** 副文字色 */
export const TEXT_SECONDARY = '#666'
/** 浅蓝标签背景 */
export const TAG_BG = '#f0f5ff'
