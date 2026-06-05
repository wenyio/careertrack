/**
 * 简历编辑页面布局
 *
 * 编辑页面为私密页面，禁止搜索引擎索引。
 */

import type { Metadata } from 'next'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function EditLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
