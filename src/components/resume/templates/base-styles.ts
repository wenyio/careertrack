/**
 * 基础样式生成函数
 *
 * 提供所有模板共享的 base 样式，模板可通过 TemplateStyleOverrides 覆盖。
 */

import type { TemplateStyleOverrides } from './types'

interface BaseStylesConfig {
  primaryColor: string
  textColor: string
}

/**
 * 生成基础样式对象
 *
 * @param config 模板颜色配置
 * @param fontSize 基础字号
 * @param lineHeight 行高
 * @returns 完整的基础样式对象
 */
export function getBaseStyles(
  config: BaseStylesConfig,
  fontSize = 14,
  lineHeight = 1.5,
) {
  const s = (scale: number) => Math.round(fontSize * scale * 10) / 10

  return {
    page: {
      fontFamily: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
      fontSize,
      lineHeight,
      color: '#333',
      padding: '36px 36px 32px 36px',
      width: 794,
      minHeight: 1123,
      backgroundColor: '#fff',
      boxSizing: 'border-box' as const,
    },
    contactItem: {
      fontSize: s(0.9),
      color: '#555',
    },
    section: {
      marginBottom: 14,
    },
    sectionTitle: {
      fontSize: s(1.3),
      fontWeight: 'bold' as const,
      color: config.primaryColor,
      marginBottom: 8,
      paddingBottom: 4,
      borderBottom: `1px solid ${config.primaryColor}`,
    },
    entry: {
      marginBottom: 10,
    },
    entryHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline' as const,
      marginBottom: 2,
    },
    entryTitle: {
      fontSize: s(1.1),
      fontWeight: 'bold' as const,
      color: config.textColor,
    },
    entryDate: {
      fontSize: s(0.9),
      color: '#888',
      flexShrink: 0,
    },
    entrySubtitle: {
      fontSize,
      color: '#666',
      marginBottom: 3,
    },
    description: {
      fontSize,
      color: '#444',
      lineHeight,
    },
    skillTag: {
      fontSize: s(0.9),
      color: config.textColor,
      backgroundColor: '#f3f4f6',
      padding: '3px 8px',
      borderRadius: 2,
    },
    sidebar: {} as React.CSSProperties,
    sidebarName: {} as React.CSSProperties,
    main: {} as React.CSSProperties,
  }
}

/**
 * 将模板样式覆盖合并到基础样式上
 *
 * @param base 基础样式
 * @param overrides 模板覆盖（可选）
 * @returns 合并后的样式
 */
export function applyStyleOverrides<
  T extends ReturnType<typeof getBaseStyles>,
>(
  base: T,
  overrides?:
    | TemplateStyleOverrides
    | ((config: { primaryColor: string; textColor: string; fontSize: number; lineHeight: number; s: (scale: number) => number }) => TemplateStyleOverrides),
  config?: { primaryColor: string; textColor: string; fontSize: number; lineHeight: number },
): T {
  if (!overrides) return base

  const resolved = typeof overrides === 'function'
    ? overrides({
        primaryColor: config?.primaryColor ?? '',
        textColor: config?.textColor ?? '',
        fontSize: config?.fontSize ?? 14,
        lineHeight: config?.lineHeight ?? 1.5,
        s: (scale: number) => Math.round((config?.fontSize ?? 14) * scale * 10) / 10,
      })
    : overrides

  const result = { ...base }
  for (const [key, value] of Object.entries(resolved)) {
    if (value && key in result) {
      ;(result as Record<string, unknown>)[key] = {
        ...(result as Record<string, unknown>)[key] as object,
        ...value,
      }
    }
  }
  return result
}
