'use client'

import { Empty, Timeline, Typography } from 'antd'
import dayjs from 'dayjs'
import type { JobApplicationEvent } from '@/types/job-application'
import { APPLICATION_STATUS_LABELS } from '@/lib/job-applications/config'

const labels: Record<JobApplicationEvent['event_type'], string> = {
  created: '创建申请', status_changed: '推进阶段', follow_up: '记录跟进', interview: '面试记录', note: '备注', offer: 'Offer',
}

export function ApplicationEventTimeline({ events }: { events: JobApplicationEvent[] }) {
  if (!events.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有过程记录" />
  return <Timeline items={events.map((event) => ({
    content: <div><Typography.Text strong>{labels[event.event_type]}</Typography.Text><br />
      {event.content && <Typography.Paragraph style={{ margin: '4px 0' }}>{event.content}</Typography.Paragraph>}
      {event.event_type === 'status_changed' && <Typography.Text type="secondary">{APPLICATION_STATUS_LABELS[event.metadata.from as keyof typeof APPLICATION_STATUS_LABELS] || String(event.metadata.from)} → {APPLICATION_STATUS_LABELS[event.metadata.to as keyof typeof APPLICATION_STATUS_LABELS] || String(event.metadata.to)}</Typography.Text>}
      {event.event_type === 'interview' && <Typography.Text type="secondary">{[event.metadata.round, event.metadata.format, event.metadata.result].filter(Boolean).join(' · ')}</Typography.Text>}
      <Typography.Text type="secondary">{dayjs(event.occurred_at).format('YYYY-MM-DD HH:mm')}</Typography.Text></div>,
  }))} />
}
