/**
 * SEO 工具函数
 *
 * 简历预览页的 SEO 元信息生成、隐私脱敏、语言检测等。
 */

import type { ResumeContent, DescriptionField } from '@/types/resume'
import { richTextToPlainText } from '@/utils/rich-text'

// ============ 常量 ============

/** 站点公开 URL */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://careertrack.example.com'

/** 站点名称 */
export const SITE_NAME = '职迹 CareerTrack'

/** 绝不放入 metadata / JSON-LD 的隐私字段关键词 */
const PRIVACY_PATTERNS = [
  /[\w.-]+@[\w.-]+\.\w+/g,                    // 邮箱
  /1[3-9]\d{9}/g,                               // 中国大陆手机号
  /\d{3,4}[-\s]?\d{7,8}/g,                     // 座机号
  /微信[：:]?\s*\w+/g,                           // 微信号
  /(?<!\w)qq[：:]?\s*\d+/gi,                    // QQ 号
]

// ============ 隐私脱敏 ============

/**
 * 移除文本中的隐私信息（邮箱、电话、微信号等）
 * 用于生成 SEO description 时的安全过滤
 */
export function sanitizeForSEO(text: string): string {
  let result = text
  for (const pattern of PRIVACY_PATTERNS) {
    result = result.replace(pattern, '')
  }
  return result.replace(/\s{2,}/g, ' ').trim()
}

// ============ 文本工具 ============

/** 富文本字段转纯文本 */
function descToPlain(d?: DescriptionField): string {
  return richTextToPlainText((d || '') as Parameters<typeof richTextToPlainText>[0])
}

/**
 * 安全截断中文文本
 * 在指定长度处截断，避免切断单词，末尾加省略号
 */
export function truncateZH(text: string, maxLen: number): string {
  if (!text || text.length <= maxLen) return text
  // 在 maxLen 处截断，尝试在标点或空格处断开
  let end = maxLen
  const breakChars = '，。、；！？,.;!? \n'
  for (let i = maxLen; i > maxLen - 20 && i > 0; i--) {
    if (breakChars.includes(text[i])) {
      end = i + 1
      break
    }
  }
  return text.slice(0, end).replace(/[，。、；！？,.;!?\s]+$/, '') + '……'
}

// ============ 语言检测 ============

/**
 * 检测简历主要语言
 * 基于姓名和职位中中文字符的占比判断
 */
export function detectResumeLanguage(content: ResumeContent): 'zh' | 'en' {
  const name = content.basic_info?.name || ''
  const position = content.basic_info?.job_intention?.position || ''
  const text = name + position
  if (!text) return 'zh' // 默认中文
  const zhChars = (text.match(/[一-鿿]/g) || []).length
  return zhChars / text.length > 0.3 ? 'zh' : 'en'
}

// ============ Description 生成 ============

/** 提取简历中已启用模块的名称列表 */
function getActiveModules(content: ResumeContent): string[] {
  const modules: string[] = []
  if (content.work_experience && content.work_experience.length > 0) modules.push('工作经历')
  if (content.education && content.education.length > 0) modules.push('教育背景')
  if (content.projects && content.projects.length > 0) modules.push('项目经验')
  if (content.skills && content.skills.length > 0) modules.push('专业技能')
  if (content.awards && content.awards.length > 0) modules.push('荣誉奖项')
  if (content.portfolio && content.portfolio.length > 0) modules.push('个人作品')
  if (content.research && content.research.length > 0) modules.push('研究经历')
  if (content.other_experience && content.other_experience.length > 0) modules.push('其他经历')
  return modules
}

/**
 * 生成 SEO description（中文）
 *
 * 优先级：
 * 1. 简历摘要（脱敏后截断）
 * 2. 模块组合描述
 * 3. 全局 fallback
 *
 * @param maxLen 最大长度，默认 155（Google 通常展示 ~155 字符）
 */
export function generateSeoDescription(content: ResumeContent, maxLen = 155): string {
  const name = content.basic_info?.name || '求职者'
  const position = content.basic_info?.job_intention?.position

  // 优先级 1：简历摘要
  const summary = sanitizeForSEO(descToPlain(content.summary))
  if (summary && summary.length > 20) {
    return truncateZH(summary, maxLen)
  }

  // 优先级 2：组合模块亮点
  const highlights = getActiveModules(content)
  const modulePart = highlights.length > 0
    ? `包含${highlights.join('、')}`
    : '查看完整简历内容'

  const intentionPart = position
    ? `${name}正在寻找${position}相关机会。`
    : `${name}的在线职业档案。`

  const full = `查看${name}的在线简历，${modulePart}。${intentionPart}`
  return truncateZH(full, maxLen)
}

/**
 * 生成英文简历的 SEO description
 */
export function generateSeoDescriptionEN(content: ResumeContent, maxLen = 155): string {
  const name = content.basic_info?.name || 'Job seeker'
  const position = content.basic_info?.job_intention?.position

  const summary = sanitizeForSEO(descToPlain(content.summary))
  if (summary && summary.length > 20) {
    return truncateZH(summary, maxLen)
  }

  const highlights: string[] = []
  if (content.work_experience && content.work_experience.length > 0) highlights.push('work experience')
  if (content.education && content.education.length > 0) highlights.push('education background')
  if (content.projects && content.projects.length > 0) highlights.push('project experience')
  if (content.skills && content.skills.length > 0) highlights.push('professional skills')

  const modulePart = highlights.length > 0
    ? `featuring ${highlights.join(', ')}`
    : 'view the full resume'

  const intentionPart = position
    ? `${name} is seeking ${position} opportunities.`
    : `${name}'s professional profile.`

  const full = `View ${name}'s online resume, ${modulePart}. ${intentionPart}`
  return truncateZH(full, maxLen)
}

// ============ Title 生成 ============

/**
 * 生成中文 SEO title（不含站点后缀，由模板自动拼接）
 *
 * 格式: {姓名}的简历 - {职位方向}
 * fallback: 在线简历
 */
export function generateSeoTitle(content: ResumeContent): string {
  const name = content.basic_info?.name
  const position = content.basic_info?.job_intention?.position

  if (name && position) return `${name}的简历 - ${position}`
  if (name) return `${name}的简历`
  return '在线简历'
}

/**
 * 生成英文 SEO title
 */
export function generateSeoTitleEN(content: ResumeContent): string {
  const name = content.basic_info?.name
  const position = content.basic_info?.job_intention?.position

  if (name && position) return `${name}'s Resume - ${position}`
  if (name) return `${name}'s Resume`
  return 'Online Resume'
}

// ============ OG / Twitter ============

/**
 * 生成 Open Graph metadata
 *
 * images 数组包含方图 (800×800) 和横图 (1200×630)：
 *   - 方图优先：微信 / 朋友圈等国内平台偏好正方形
 *   - 横图兜底：微博 / Twitter / 网页等平台使用
 */
export function generateOpenGraph(
  content: ResumeContent,
  slug: string,
  lang: 'zh' | 'en' = 'zh',
) {
  const name = content.basic_info?.name
  const description = lang === 'en'
    ? generateSeoDescriptionEN(content)
    : generateSeoDescription(content)

  const title = lang === 'en'
    ? (name ? `${name}'s Resume` : 'Online Resume')
    : (name ? `${name}的简历` : '在线简历')

  const resumeUrl = `${SITE_URL}/resume/${slug}`

  return {
    title,
    description,
    url: resumeUrl,
    siteName: SITE_NAME,
    locale: lang === 'en' ? 'en_US' : 'zh_CN',
    type: 'profile' as const,
    images: [
      {
        url: `${resumeUrl}/square-image`,
        width: 800,
        height: 800,
        alt: title,
        type: 'image/png',
      },
      {
        url: `${resumeUrl}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: title,
        type: 'image/png',
      },
    ],
  }
}

/**
 * 生成 Twitter Card metadata
 *
 * Twitter 统一使用 1200×630 横图。
 */
export function generateTwitterCard(
  content: ResumeContent,
  slug: string,
  lang: 'zh' | 'en' = 'zh',
) {
  const name = content.basic_info?.name
  const description = lang === 'en'
    ? generateSeoDescriptionEN(content, 70)
    : generateSeoDescription(content, 70)

  const title = lang === 'en'
    ? (name ? `${name}'s Resume` : 'Online Resume')
    : (name ? `${name}的简历` : '在线简历')

  return {
    card: 'summary_large_image' as const,
    title,
    description,
    images: [`${SITE_URL}/resume/${slug}/opengraph-image`],
  }
}

// ============ JSON-LD ============

/**
 * 生成简历页的 JSON-LD 结构化数据
 *
 * 包含 ProfilePage 和 Person 两个实体，通过 @graph 关联。
 * 所有字段均经过隐私脱敏处理。
 */
export function generateResumeJsonLd(content: ResumeContent, slug: string) {
  const name = content.basic_info?.name || '求职者'
  const jobTitle = content.basic_info?.job_intention?.position || ''
  const avatar = content.basic_info?.avatar
  const city = content.basic_info?.other?.city
  const description = generateSeoDescription(content)

  // 教育经历 → alumniOf
  const alumniOf = (content.education || [])
    .filter(e => e.school)
    .map(e => ({
      '@type': 'EducationalOrganization' as const,
      name: e.school,
      ...(e.college ? { department: e.college } : {}),
    }))

  // 工作经历 → worksFor（取最近 3 段）
  const worksFor = (content.work_experience || [])
    .filter(w => w.company)
    .slice(0, 3)
    .map(w => ({
      '@type': 'Organization' as const,
      name: w.company,
    }))

  // 技能 → knowsAbout（取前 10 个）
  const knowsAbout = (content.skills || [])
    .map(s => s.name)
    .filter(Boolean)
    .slice(0, 10)

  const pageUrl = `${SITE_URL}/resume/${slug}`

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ProfilePage',
        '@id': `${pageUrl}#webpage`,
        url: pageUrl,
        name: `${name}的简历 | ${SITE_NAME}`,
        description,
        inLanguage: 'zh-CN',
        isPartOf: { '@id': `${SITE_URL}#website` },
        about: { '@id': `${pageUrl}#person` },
      },
      {
        '@type': 'Person',
        '@id': `${pageUrl}#person`,
        name,
        ...(jobTitle ? { jobTitle } : {}),
        description,
        ...(avatar ? { image: avatar } : {}),
        url: pageUrl,
        ...(city ? { address: { '@type': 'PostalAddress', addressLocality: city } } : {}),
        ...(alumniOf.length > 0 ? { alumniOf } : {}),
        ...(worksFor.length > 0 ? { worksFor } : {}),
        ...(knowsAbout.length > 0 ? { knowsAbout } : {}),
      },
    ],
  }
}

// ============ Fallback 文案 ============

/** SEO 文案 fallback（当简历数据不完整或出错时使用） */
export const SEO_FALLBACK = {
  zh: {
    title: '在线简历',
    description: '在 CareerTrack 上查看在线简历，了解求职者的工作经历、教育背景与专业技能。',
    ogTitle: '在线简历 | 职迹 CareerTrack',
    ogDescription: '使用 CareerTrack 创建的专业在线简历，展示职业成长轨迹。',
    notFoundTitle: '简历不存在',
    notFoundDescription: '该简历不存在或未公开发布。',
    errorTitle: '个人简历',
    errorDescription: '查看个人简历 - 由职迹 CareerTrack 生成',
  },
  en: {
    title: 'Online Resume',
    description: "View an online resume on CareerTrack, showcasing work experience, education, and professional skills.",
    ogTitle: 'Online Resume | CareerTrack',
    ogDescription: 'A professional online resume created with CareerTrack.',
    notFoundTitle: 'Resume Not Found',
    notFoundDescription: 'This resume does not exist or is not published.',
    errorTitle: 'Resume',
    errorDescription: 'View resume - powered by CareerTrack',
  },
} as const
