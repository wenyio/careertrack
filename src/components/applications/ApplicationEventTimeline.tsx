'use client'

import { useState } from 'react'
import { Button, Empty, Timeline, Typography } from 'antd'
import dayjs from 'dayjs'
import type { JobApplicationEvent } from '@/types/job-application'
import { APPLICATION_STATUS_LABELS } from '@/lib/job-applications/config'

const labels: Record<JobApplicationEvent['event_type'], string> = {
  created: '创建申请', status_changed: '阶段变更', follow_up: '记录跟进', interview: '面试记录', note: '备注', offer: 'Offer',
}

export function ApplicationEventTimeline({ events, total = events.length, limit = 5, onViewAll }: { events: JobApplicationEvent[]; total?: number; limit?: number | null; onViewAll?: () => void }) {
  const [expanded, setExpanded] = useState(false)
  if (!events.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有过程记录" />
  const shouldLimit = typeof limit === 'number' && limit > 0
  const visibleEvents = expanded || !shouldLimit ? events : events.slice(0, limit)
  return <>
    <Timeline items={visibleEvents.map((event) => ({
      content: <div><Typography.Text strong>{labels[event.event_type]}</Typography.Text>
        <Typography.Text type="secondary"> · {dayjs(event.occurred_at).format('YYYY-MM-DD HH:mm')}</Typography.Text>
        {event.content && <Typography.Paragraph style={{ margin: '4px 0' }}>{event.content}</Typography.Paragraph>}
        {event.event_type === 'status_changed' && <div><Typography.Text type="secondary">{APPLICATION_STATUS_LABELS[event.metadata.from as keyof typeof APPLICATION_STATUS_LABELS] || String(event.metadata.from)} → {APPLICATION_STATUS_LABELS[event.metadata.to as keyof typeof APPLICATION_STATUS_LABELS] || String(event.metadata.to)}</Typography.Text></div>}
        {event.event_type === 'interview' && <div><Typography.Text type="secondary">{[event.metadata.round, event.metadata.format, event.metadata.result].filter(Boolean).join(' · ')}</Typography.Text></div>}
      </div>,
    }))} />
    {shouldLimit && total > limit && <Button type="link" size="small" style={{ padding: 0 }} onClick={onViewAll || (() => setExpanded((value) => !value))}>{onViewAll ? `查看全部 ${total} 条记录` : expanded ? '收起历史记录' : `查看全部 ${total} 条记录`}</Button>}
  </>
}
