/**
 * 模块标题组件
 */

import type { ReactNode } from 'react'
import type { ResolvedStyles } from '../types'

export function SectionTitle({ children, styles }: { children: ReactNode; styles: ResolvedStyles }) {
  return <div style={styles.sectionTitle}>{children}</div>
}
