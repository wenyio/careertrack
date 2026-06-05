/**
 * BasicInfoHeader 样式 helper
 *
 * 提供 StandardBasicInfoHeader 内部使用的图标和文字条目样式工厂函数。
 */

import type { CSSProperties } from 'react'

/** 生成图标容器样式 */
export function makeIconStyle(color: string, marginRight = 5, fontSize: CSSProperties['fontSize'] = '0.85em'): CSSProperties {
  return {
    display: 'inline-flex',
    flexShrink: 0,
    marginRight,
    color,
    fontSize,
    lineHeight: 1,
    justifyContent: 'center',
  }
}

/** 生成文字条目样式 */
export function makeTextItemStyle(
  fontSize: string | number,
  color: string,
  extra?: CSSProperties,
): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    fontSize,
    color,
    ...extra,
  }
}
