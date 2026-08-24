'use client'

import { useState } from 'react'
import { Button, Empty, Timeline, Typography } from 'antd'
import dayjs from 'dayjs'
import type { JobApplicationEvent, JobApplicationStatus } from '@/types/job-application'
import { JOB_APPLICATION_STATUSES } from '@/types/job-application'
import { useI18n } from '@/i18n'

export function ApplicationEventTimeline({ events, total = events.length, limit = 5, onViewAll }: { events: JobApplicationEvent[]; total?: number; limit?: number | null; onViewAll?: () => void }) {
  const { t } = useI18n()
  const [expanded, setExpanded] = useState(false)
  const labels: Record<JobApplicationEvent['event_type'], string> = {
    created: t('applications.timeline.created'),
    status_changed: t('applications.timeline.statusChanged'),
    follow_up: t('applications.timeline.followUp'),
    interview: t('applications.timeline.interview'),
    note: t('applications.timeline.note'),
    offer: t('applications.timeline.offer'),
  }
  const statusLabel = (status: unknown) => {
    if (typeof status !== 'string') return String(status)
    return JOB_APPLICATION_STATUSES.includes(status as JobApplicationStatus) ? t(`applications.status.${status}`) : status
  }
  if (!events.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('applications.timeline.empty')} />
  const shouldLimit = typeof limit === 'number' && limit > 0
  const visibleEvents = expanded || !shouldLimit ? events : events.slice(0, limit)
  return <>
    <Timeline items={visibleEvents.map((event) => ({
      content: <div><Typography.Text strong>{labels[event.event_type]}</Typography.Text>
        <Typography.Text type="secondary"> · {dayjs(event.occurred_at).format('YYYY-MM-DD HH:mm')}</Typography.Text>
        {event.content && <Typography.Paragraph style={{ margin: '4px 0' }}>{event.content}</Typography.Paragraph>}
        {event.event_type === 'status_changed' && <div><Typography.Text type="secondary">{statusLabel(event.metadata.from)} → {statusLabel(event.metadata.to)}</Typography.Text></div>}
        {event.event_type === 'interview' && <div><Typography.Text type="secondary">{[event.metadata.round, event.metadata.format, event.metadata.result].filter(Boolean).join(' · ')}</Typography.Text></div>}
      </div>,
    }))} />
    {shouldLimit && total > limit && <Button type="link" size="small" style={{ padding: 0 }} onClick={onViewAll || (() => setExpanded((value) => !value))}>{onViewAll ? t('applications.timeline.viewAll', { total }) : expanded ? t('applications.timeline.collapseHistory') : t('applications.timeline.viewAll', { total })}</Button>}
  </>
}
