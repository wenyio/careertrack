'use client'

import { useState } from 'react'
import dayjs from 'dayjs'
import { useQuery } from '@tanstack/react-query'
import { Alert, Button, DatePicker, Descriptions, Divider, Drawer, Empty, Form, Input, Segmented, Space, Spin, Tabs, Tag, Typography } from 'antd'
import { CalendarOutlined, EditOutlined, ExportOutlined, FileTextOutlined, MessageOutlined } from '@ant-design/icons'
import { ApplicationEventTimeline } from './ApplicationEventTimeline'
import { useJobApplication, useJobApplicationEvents, useJobApplicationMutations } from '@/hooks/useJobApplications'
import { getResumeVersion } from '@/services/resume'
import { StandardResumePreview } from '@/components/resume/ResumePreviewShared'
import { APPLICATION_STATUS_COLORS, APPLICATION_STATUS_LABELS, nextApplicationStatus, previousApplicationStatus } from '@/lib/job-applications/config'
import { getPreviewConfig } from '@/utils/resume-preview'
import type { JobApplication } from '@/types/job-application'

type ActivityType = 'follow_up' | 'interview' | 'note'
type EventValues = { content?: string; next_action_at?: dayjs.Dayjs; round?: string; format?: string; result?: string }

const activityOptions = [
  { value: 'follow_up', label: '跟进' },
  { value: 'interview', label: '面试' },
  { value: 'note', label: '备注' },
]

function activityCopy(type: ActivityType) {
  if (type === 'interview') return { title: '记录面试', placeholder: '面试重点、反馈或待确认事项', action: '保存面试记录' }
  if (type === 'note') return { title: '添加备注', placeholder: '记录不会改变当前阶段', action: '保存备注' }
  return { title: '记录跟进', placeholder: '例如：已发邮件询问面试安排', action: '保存跟进' }
}

export function ApplicationDetailDrawer({ application, open, onClose, onEdit, initialActivity = 'follow_up' }: {
  application: JobApplication | null
  open: boolean
  onClose: () => void
  onEdit: (application: JobApplication) => void
  initialActivity?: ActivityType
}) {
  const detail = useJobApplication(application?.id, open)
  const current = detail.data || application
  const { data: events, isError: eventsError, refetch: refetchEvents } = useJobApplicationEvents(current?.id, open)
  const { addEvent, update, remove } = useJobApplicationMutations()
  const [activityType, setActivityType] = useState<ActivityType>(initialActivity)
  const [form] = Form.useForm<EventValues>()
  const snapshot = useQuery({
    queryKey: ['job-applications', 'snapshot', current?.resume_id, current?.resume_version_id],
    queryFn: () => getResumeVersion(current!.resume_id!, current!.resume_version_id!),
    enabled: open && Boolean(current?.resume_id && current.resume_version_id),
  })

  if (!current) return null
  const copy = activityCopy(activityType)
  const submitEvent = async () => {
    const values = await form.validateFields()
    addEvent.mutate({ id: current.id, data: {
      event_type: activityType,
      content: values.content || null,
      next_action_at: values.next_action_at?.format('YYYY-MM-DD') || undefined,
      expected_revision: current.revision,
      metadata: activityType === 'interview'
        ? { round: values.round || undefined, format: values.format || undefined, result: values.result || undefined }
        : {},
    } }, { onSuccess: () => form.resetFields() })
  }
  const advance = (direction: 'next' | 'previous') => {
    const status = direction === 'next' ? nextApplicationStatus(current.status) : previousApplicationStatus(current.status)
    if (status) update.mutate({ id: current.id, data: { expected_revision: current.revision, status } })
  }
  const preview = snapshot.data ? getPreviewConfig(snapshot.data.snapshot.content.preview_config) : null

  return <Drawer
    title={<Space direction="vertical" size={0}><Typography.Text strong>{current.company} · {current.position}</Typography.Text><Space size={6}><Tag color={APPLICATION_STATUS_COLORS[current.status]}>{APPLICATION_STATUS_LABELS[current.status]}</Tag>{current.next_action_at && <Typography.Text type="secondary">下一步：{current.next_action_at}</Typography.Text>}</Space></Space>}
    open={open}
    onClose={onClose}
    width={760}
    destroyOnHidden
    extra={<Space><Button icon={<EditOutlined />} onClick={() => onEdit(current)}>编辑</Button><Button danger loading={remove.isPending} onClick={() => remove.mutate(current.id, { onSuccess: onClose })}>删除</Button></Space>}
  >
    {detail.isFetching && <Typography.Text type="secondary">正在同步最新进展…</Typography.Text>}
    {detail.isError && <Alert style={{ marginTop: 12 }} type="warning" showIcon message="最新资料加载失败，正在展示已缓存内容" action={<Button size="small" onClick={() => void detail.refetch()}>重试</Button>} />}
    <Space wrap style={{ marginTop: 16 }}>
      <Button disabled={!previousApplicationStatus(current.status)} onClick={() => advance('previous')}>退回阶段</Button>
      <Button type="primary" disabled={!nextApplicationStatus(current.status)} loading={update.isPending} onClick={() => advance('next')}>推进至{nextApplicationStatus(current.status) ? APPLICATION_STATUS_LABELS[nextApplicationStatus(current.status)!] : ''}</Button>
    </Space>
    <Descriptions size="small" column={1} style={{ marginTop: 20 }} items={[
      { key: 'location', label: '地点', children: current.location || '未填写' },
      { key: 'salary', label: '薪资', children: current.salary || '未填写' },
      { key: 'channel', label: '渠道', children: current.channel || '未填写' },
      { key: 'applied', label: '投递日期', children: current.applied_at || '未填写' },
      { key: 'next', label: '下一步行动', children: current.next_action_at || '未安排' },
      { key: 'resume', label: '投递简历', children: current.resume_name ? `${current.resume_name} · r${current.resume_version_revision || '?'}` : '未关联' },
      { key: 'url', label: '职位链接', children: current.job_url && /^https?:\/\//i.test(current.job_url) ? <a href={current.job_url} target="_blank" rel="noopener noreferrer">打开职位链接 <ExportOutlined /></a> : '未填写' },
    ]} />
    {current.notes && <Typography.Paragraph style={{ marginTop: 16, whiteSpace: 'pre-wrap' }}><Typography.Text type="secondary">申请备注</Typography.Text><br />{current.notes}</Typography.Paragraph>}
    <Divider />
    <Typography.Title level={5} style={{ marginTop: 0 }}>记录一次进展</Typography.Title>
    <Typography.Paragraph type="secondary">每次记录会保留在时间线中；填写“下一步行动”会同时更新行动中心。</Typography.Paragraph>
    <Segmented value={activityType} options={activityOptions} onChange={(value) => { setActivityType(value as ActivityType); form.resetFields() }} />
    <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
      <Form.Item label={copy.title} name="content" rules={[{ max: 5000, message: '内容最多 5000 字' }]}>
        <Input.TextArea rows={3} maxLength={5000} showCount placeholder={copy.placeholder} />
      </Form.Item>
      {activityType === 'interview' && <Space size="middle" style={{ display: 'flex' }}>
        <Form.Item label="轮次" name="round" style={{ flex: 1 }}><Input placeholder="一面、HR 面…" /></Form.Item>
        <Form.Item label="形式" name="format" style={{ flex: 1 }}><Input placeholder="线上 / 现场" /></Form.Item>
        <Form.Item label="结果" name="result" style={{ flex: 1 }}><Input placeholder="待定、通过…" /></Form.Item>
      </Space>}
      {activityType !== 'note' && <Form.Item label="下次行动日期" name="next_action_at" extra="留空不会改动当前日期；可在完成后安排下一次跟进。"><DatePicker style={{ width: '100%' }} /></Form.Item>}
      <Button type="primary" icon={activityType === 'interview' ? <CalendarOutlined /> : activityType === 'note' ? <FileTextOutlined /> : <MessageOutlined />} loading={addEvent.isPending} onClick={() => void submitEvent()}>{copy.action}</Button>
    </Form>
    <Divider />
    <Tabs items={[
      { key: 'timeline', label: '活动时间线', children: eventsError ? <Alert type="error" showIcon message="活动加载失败" action={<Button size="small" onClick={() => void refetchEvents()}>重试</Button>} /> : <ApplicationEventTimeline events={events || []} /> },
      { key: 'resume', label: '投递快照', children: snapshot.isError ? <Alert type="error" showIcon message="投递快照加载失败" action={<Button size="small" onClick={() => void snapshot.refetch()}>重试</Button>} /> : snapshot.data && snapshot.data.id === current.resume_version_id && preview ? <div aria-label="投递简历只读预览" className="resume-a4-preview"><StandardResumePreview content={snapshot.data.snapshot.content} modulesConfig={snapshot.data.snapshot.modules_config} modulesOrder={snapshot.data.snapshot.modules_order} template={snapshot.data.snapshot.template} fontSize={preview.fontSize} lineHeight={preview.lineHeight} /></div> : snapshot.isLoading ? <Spin aria-label="加载投递快照" /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="未关联投递快照" /> },
    ]} />
  </Drawer>
}
