/**
 * Gravatar 头像工具
 *
 * 通过邮箱获取 Gravatar 头像 URL，使用 SHA-256 哈希邮箱地址。
 * 不保存头像文件到服务器，不在 URL 中暴露邮箱明文。
 *
 * SHA-256 优先使用 Web Crypto API（HTTPS），HTTP 下降级为 js-sha256 纯 JS 实现。
 */

import { useState, useEffect } from 'react'
import { sha256 as jsSha256 } from 'js-sha256'

const GRAVATAR_BASE = process.env.NEXT_PUBLIC_GRAVATAR_BASE || 'https://www.gravatar.com/avatar/'

/** 判断 URL 是否为 Gravatar 地址（官方或镜像），通过路径特征 /avatar/{hex} 匹配 */
export function isGravatarUrl(url?: string): boolean {
  return !!url && /\/avatar\/[0-9a-f]{32,}/.test(url)
}

/**
 * 将字符串转换为 SHA-256 十六进制摘要
 *
 * HTTPS 环境使用原生 Web Crypto API（更快），
 * HTTP 环境降级为 js-sha256 纯 JS 实现（功能等价）。
 */
async function sha256Hex(message: string): Promise<string> {
  const normalized = message.trim().toLowerCase()

  // HTTPS 环境：使用原生 Web Crypto API
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder()
    const data = encoder.encode(normalized)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  }

  // HTTP 降级：纯 JS SHA-256
  return jsSha256(normalized)
}

/**
 * 根据邮箱生成 Gravatar 头像 URL
 *
 * @param email  用户邮箱（自动 trim + lowercase）
 * @param size   请求的头像尺寸（默认 256）
 * @returns      Gravatar URL；邮箱为空时返回空字符串
 */
export async function getGravatarUrl(email: string, size = 256): Promise<string> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return ''
  const hash = await sha256Hex(normalized)
  return `${GRAVATAR_BASE}${hash}?s=${size}&d=mp&r=g`
}

/**
 * React Hook：异步获取 Gravatar URL
 *
 * @param email  用户邮箱
 * @param size   请求的头像尺寸（默认 256）
 * @returns      Gravatar URL，加载完成前返回空字符串
 */
export function useGravatarUrl(email?: string, size = 256): string {
  const [url, setUrl] = useState('')

  useEffect(() => {
    if (!email) {
      // 通过 requestAnimationFrame 延迟清空，避免 effect 内同步 setState
      const id = requestAnimationFrame(() => setUrl(''))
      return () => cancelAnimationFrame(id)
    }
    let cancelled = false
    getGravatarUrl(email, size)
      .then((result) => {
        if (!cancelled) setUrl(result)
      })
      .catch(() => {
        // 降级失败时静默处理
      })
    return () => {
      cancelled = true
    }
  }, [email, size])

  return url
}

/**
 * 获取头像显示 URL（同步逻辑，不含 Gravatar 解析）
 *
 * 优先使用 avatar 字段，否则返回空字符串等待 Gravatar 异步解析。
 * 此函数供不需要 Gravatar 回退的场景使用。
 */
export function getAvatarUrl(avatar?: string): string {
  return avatar || ''
}
