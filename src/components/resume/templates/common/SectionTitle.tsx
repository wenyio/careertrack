/**
 * 模块标题组件
 */

import type { ReactNode } from 'react'
import type { ResolvedStyles } from '../types'

export function SectionTitle({ children, styles }: { children: ReactNode; styles: ResolvedStyles }) {
  return <div className="resume-section-title" style={styles.sectionTitle}>{children}</div>
}
