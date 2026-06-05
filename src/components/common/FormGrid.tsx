/**
 * 表单栅格布局组件
 *
 * 统一三列布局：普通字段一行三个，日期范围占两列，富文本独占一行。
 * 移动端一列，平板两列。
 */

'use client'

import { Row, Col } from 'antd'

interface FormGridProps {
  children: React.ReactNode
  gutter?: [number, number]
}

/** 三列栅格容器 */
export function FormGrid({ children, gutter = [16, 16] }: FormGridProps) {
  return <Row gutter={gutter}>{children}</Row>
}

/** 普通字段：xs=24 sm=12 md=8（一行三个） */
export function FormGridNormal({ children }: { children: React.ReactNode }) {
  return <Col xs={24} sm={12} md={8}>{children}</Col>
}

/** 宽字段（日期范围）：xs=24 sm=24 md=16（占两列） */
export function FormGridWide({ children }: { children: React.ReactNode }) {
  return <Col xs={24} sm={24} md={16}>{children}</Col>
}

/** 整行字段（富文本）：xs=24（独占一行） */
export function FormGridFull({ children }: { children: React.ReactNode }) {
  return <Col xs={24}>{children}</Col>
}
