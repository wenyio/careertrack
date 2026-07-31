'use client'

import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { Alert, Button, DatePicker, Descriptions, Divider, Drawer, Form, Input, Space, Tabs, Tag, Typography } from 'antd'
import { ExportOutlined } from '@ant-design/icons'
import { ApplicationEventTimeline } from './ApplicationEventTimeline'
import { useJobApplicationEvents, useJobApplicationMutations } from '@/hooks/useJobApplications'
import { getResumeVersion } from '@/services/resume'
import { StandardResumePreview } from '@/components/resume/ResumePreviewShared'
import { APPLICATION_STATUS_COLORS, APPLICATION_STATUS_LABELS, nextApplicationStatus, previousApplicationStatus } from '@/lib/job-applications/config'
import type { JobApplication } from '@/types/job-application'
import type { ResumeVersionDetail } from '@/types/resume'

type EventValues = { content?: string; next_action_at?: dayjs.Dayjs; round?: string; format?: string; result?: string }

export function ApplicationDetailDrawer({ application, open, onClose, onEdit }: {
  application: JobApplication | null
  open: boolean
  onClose: () => void
  onEdit: () => void
}) {
  const { data: events, isError, refetch } = useJobApplicationEvents(application?.id, open)
  const { addEvent, update, remove } = useJobApplicationMutations()
  const [snapshot, setSnapshot] = useState<ResumeVersionDetail | null>(null)
  const [snapshotError, setSnapshotError] = useState(false)
  const [form] = Form.useForm<EventValues>()

  useEffect(() => {
    if (!open || !application?.resume_id || !application.resume_version_id) return
    void getResumeVersion(application.resume_id, application.resume_version_id)
      .then((detail) => { setSnapshot(detail); setSnapshotError(false) })
      .catch(() => setSnapshotError(true))
  }, [application?.resume_id, application?.resume_version_id, open])

  if (!application) return null
  const submitEvent = async (event_type: 'follow_up' | 'interview') => {
    const values = await form.validateFields()
    addEvent.mutate({ id: application.id, data: {
      event_type, content: values.content || null,
      next_action_at: values.next_action_at?.format('YYYY-MM-DD') || undefined,
      expected_revision: application.revision,
      metadata: event_type === 'interview' ? { round: values.round, format: values.format, result: values.result } : {},
    } }, { onSuccess: () => form.resetFields() })
  }
  const advance = (direction: 'next' | 'previous') => {
    const status = direction === 'next' ? nextApplicationStatus(application.status) : previousApplicationStatus(application.status)
    if (status) update.mutate({ id: application.id, data: { expected_revision: application.revision, status } })
  }

  return <Drawer title={`${application.company} · ${application.position}`} open={open} onClose={onClose} width={720} extra={<Space><Button onClick={onEdit}>编辑资料</Button><Button danger onClick={() => remove.mutate(application.id, { onSuccess: onClose })}>删除</Button></Space>}>
    <Space wrap><Tag color={APPLICATION_STATUS_COLORS[application.status]}>{APPLICATION_STATUS_LABELS[application.status]}</Tag><Button size="small" disabled={!previousApplicationStatus(application.status)} onClick={() => advance('previous')}>退回阶段</Button><Button size="small" type="primary" disabled={!nextApplicationStatus(application.status)} onClick={() => advance('next')}>推进状态</Button></Space>
    <Descriptions size="small" column={1} style={{ marginTop: 16 }} items={[
      { key: 'location', label: '地点', children: application.location || '未填写' },
      { key: 'salary', label: '薪资', children: application.salary || '未填写' },
      { key: 'channel', label: '渠道', children: application.channel || '未填写' },
      { key: 'applied', label: '投递日期', children: application.applied_at || '未填写' },
      { key: 'next', label: '下一步行动', children: application.next_action_at || '未安排' },
      { key: 'resume', label: '投递简历', children: application.resume_name ? `${application.resume_name} · r${application.resume_version_revision || '?'}` : '未关联' },
      { key: 'url', label: '职位链接', children: application.job_url && /^https?:\/\//i.test(application.job_url) ? <a href={application.job_url} target="_blank" rel="noopener noreferrer">打开职位链接 <ExportOutlined /></a> : '未填写' },
    ]} />
    <Divider />
    <Typography.Title level={5}>记录过程</Typography.Title>
    <Form form={form} layout="vertical"><Form.Item label="内容" name="content" rules={[{ max: 5000 }]}><Input.TextArea rows={2} /></Form.Item><Form.Item label="下一步行动" name="next_action_at"><DatePicker style={{ width: '100%' }} /></Form.Item><Space><Button onClick={() => void submitEvent('follow_up')}>记录跟进</Button><Button onClick={() => void submitEvent('interview')}>新增面试记录</Button></Space><Space style={{ marginTop: 8 }}><Form.Item label="轮次" name="round"><Input /></Form.Item><Form.Item label="形式" name="format"><Input placeholder="线上 / 现场" /></Form.Item><Form.Item label="结果" name="result"><Input /></Form.Item></Space></Form>
    <Divider />
    <Tabs items={[{ key: 'timeline', label: '活动时间线', children: isError ? <Alert type="error" message="活动加载失败" action={<Button onClick={() => void refetch()}>重试</Button>} /> : <ApplicationEventTimeline events={events || []} /> }, { key: 'resume', label: '投递快照', children: snapshotError ? <Alert type="error" message="投递快照加载失败" /> : snapshot?.id === application.resume_version_id ? <StandardResumePreview content={snapshot.snapshot.content} modulesConfig={snapshot.snapshot.modules_config} modulesOrder={snapshot.snapshot.modules_order} template={snapshot.snapshot.template} /> : <Typography.Text type="secondary">未关联投递快照</Typography.Text> }]} />
  </Drawer>
}
