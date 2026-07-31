'use client'

import { useState } from 'react'
import dayjs from 'dayjs'
import { useQuery } from '@tanstack/react-query'
import { Alert, App, Button, Card, DatePicker, Descriptions, Divider, Drawer, Dropdown, Empty, Form, Input, Segmented, Select, Space, Spin, Tag, Typography } from 'antd'
import type { MenuProps } from 'antd'
import { CalendarOutlined, DownOutlined, EditOutlined, ExportOutlined, FileTextOutlined, MessageOutlined } from '@ant-design/icons'
import { ApplicationEventTimeline } from './ApplicationEventTimeline'
import { useJobApplication, useJobApplicationEvents, useJobApplicationMutations } from '@/hooks/useJobApplications'
import { getResumeVersion } from '@/services/resume'
import { StandardResumePreview } from '@/components/resume/ResumePreviewShared'
import { APPLICATION_STATUS_COLORS, APPLICATION_STATUS_LABELS, nextApplicationStatus, previousApplicationStatus } from '@/lib/job-applications/config'
import { getPreviewConfig } from '@/utils/resume-preview'
import type { JobApplication } from '@/types/job-application'
import { JOB_APPLICATION_STATUSES } from '@/types/job-application'
import ResumeMiniPreview from '@/components/resume/ResumeMiniPreview'

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
  const { modal } = App.useApp()
  const [activityType, setActivityType] = useState<ActivityType>(initialActivity)
  const [resumePreviewOpen, setResumePreviewOpen] = useState(false)
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
  const updateStatus = (status: JobApplication['status']) => {
    if (status !== current.status) update.mutate({ id: current.id, data: { expected_revision: current.revision, status } })
  }
  const updateNextAction = (value: dayjs.Dayjs | null) => {
    update.mutate({ id: current.id, data: { expected_revision: current.revision, next_action_at: value?.format('YYYY-MM-DD') || null } })
  }
  const applyTemplate = (content: string) => {
    form.setFieldValue('content', content)
  }
  const snoozeThreeDays = () => {
    form.setFieldsValue({
      content: form.getFieldValue('content') || '重新安排跟进节奏',
      next_action_at: dayjs().add(3, 'day'),
    })
    setActivityType('follow_up')
  }
  const archiveAs = (status: 'rejected' | 'withdrawn') => {
    update.mutate({ id: current.id, data: { expected_revision: current.revision, status } }, { onSuccess: onClose })
  }
  const confirmArchive = (status: 'rejected' | 'withdrawn') => {
    modal.confirm({
      title: status === 'rejected' ? '标记为未通过？' : '标记为已撤回？',
      content: '状态会记录到时间线中，之后仍可在归档状态里查看。',
      okText: '确认',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => archiveAs(status),
    })
  }
  const confirmDelete = () => {
    modal.confirm({
      title: '删除这条求职申请？',
      content: '删除会移除申请和时间线记录，此操作不可恢复。',
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => remove.mutate(current.id, { onSuccess: onClose }),
    })
  }
  const preview = snapshot.data ? getPreviewConfig(snapshot.data.snapshot.content.preview_config) : null
  const actionMenu: MenuProps['items'] = [
    { key: 'previous', label: '退回上一阶段', disabled: !previousApplicationStatus(current.status) },
    { key: 'next', label: nextApplicationStatus(current.status) ? `推进至${APPLICATION_STATUS_LABELS[nextApplicationStatus(current.status)!]}` : '已是最后阶段', disabled: !nextApplicationStatus(current.status) },
    { key: 'snooze', label: '顺延 3 天' },
    { type: 'divider' },
    { key: 'rejected', label: '标记未通过', danger: true },
    { key: 'withdrawn', label: '标记已撤回', danger: true },
  ]
  const handleActionMenu: MenuProps['onClick'] = ({ key }) => {
    if (key === 'previous') advance('previous')
    if (key === 'next') advance('next')
    if (key === 'snooze') snoozeThreeDays()
    if (key === 'rejected') confirmArchive('rejected')
    if (key === 'withdrawn') confirmArchive('withdrawn')
  }

  return <Drawer
    title={<Space orientation="vertical" size={0}><Typography.Text strong>申请工作台</Typography.Text><Typography.Text type="secondary">{current.company} · {current.position}</Typography.Text><Space size={6}><Tag color={APPLICATION_STATUS_COLORS[current.status]}>{APPLICATION_STATUS_LABELS[current.status]}</Tag>{current.next_action_at && <Typography.Text type="secondary">下一步：{current.next_action_at}</Typography.Text>}</Space></Space>}
    open={open}
    onClose={onClose}
    size="large"
    destroyOnHidden
    extra={<Space><Button size="small" icon={<EditOutlined />} onClick={() => onEdit(current)}>编辑</Button><Button size="small" danger loading={remove.isPending} onClick={confirmDelete}>删除</Button></Space>}
  >
    {detail.isFetching && <Typography.Text type="secondary">正在同步最新进展…</Typography.Text>}
    {detail.isError && <Alert style={{ marginTop: 12 }} type="warning" showIcon title="最新资料加载失败，正在展示已缓存内容" action={<Button size="small" onClick={() => void detail.refetch()}>重试</Button>} />}
    <Card size="small" style={{ marginTop: 16 }}>
      <Space wrap size="middle" align="center">
        <Space size={6}>
          <Typography.Text type="secondary">阶段</Typography.Text>
          <Select
            aria-label="当前申请阶段"
            size="small"
            value={current.status}
            style={{ width: 144 }}
            popupMatchSelectWidth={false}
            options={JOB_APPLICATION_STATUSES.map((value) => ({ value, label: APPLICATION_STATUS_LABELS[value] }))}
            onChange={updateStatus}
          />
        </Space>
        <Space size={6}>
          <Typography.Text type="secondary">下次行动</Typography.Text>
          <DatePicker
            aria-label="下次行动日期"
            size="small"
            value={current.next_action_at ? dayjs(current.next_action_at) : null}
            style={{ width: 150 }}
            onChange={updateNextAction}
          />
        </Space>
        <Dropdown menu={{ items: actionMenu, onClick: handleActionMenu }} trigger={['click']}>
          <Button size="small">更多操作 <DownOutlined /></Button>
        </Dropdown>
      </Space>
    </Card>
    <Descriptions size="small" column={1} style={{ marginTop: 20 }} items={[
      { key: 'location', label: '地点', children: current.location || '未填写' },
      { key: 'salary', label: '薪资', children: current.salary || '未填写' },
      { key: 'channel', label: '渠道', children: current.channel || '未填写' },
      { key: 'applied', label: '投递日期', children: current.applied_at || '未填写' },
      { key: 'url', label: '职位链接', children: current.job_url && /^https?:\/\//i.test(current.job_url) ? <a href={current.job_url} target="_blank" rel="noopener noreferrer">打开职位链接 <ExportOutlined /></a> : '未填写' },
    ]} />
    {current.notes && <Typography.Paragraph style={{ marginTop: 16, whiteSpace: 'pre-wrap' }}><Typography.Text type="secondary">申请备注</Typography.Text><br />{current.notes}</Typography.Paragraph>}
    <Card size="small" title="投递简历" style={{ marginTop: 16 }} extra={current.resume_name && <Button size="small" onClick={() => setResumePreviewOpen((value) => !value)}>{resumePreviewOpen ? '收起快照' : '查看快照'}</Button>}>
      {current.resume_name ? <Space size="middle" align="start">
        {snapshot.data && <ResumeMiniPreview content={snapshot.data.snapshot.content} modulesConfig={snapshot.data.snapshot.modules_config} modulesOrder={snapshot.data.snapshot.modules_order} template={snapshot.data.snapshot.template} width={84} />}
        <Space orientation="vertical" size={2}>
          <Typography.Text strong>{current.resume_name}</Typography.Text>
          <Typography.Text type="secondary">投递版本：r{current.resume_version_revision || '?'}</Typography.Text>
          {snapshot.isError && <Typography.Text type="danger">快照加载失败</Typography.Text>}
        </Space>
      </Space> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="未关联投递简历" />}
      {resumePreviewOpen && <div style={{ marginTop: 16, maxHeight: 520, overflow: 'auto', border: '1px solid #f0f0f0', borderRadius: 6, background: '#fafafa', padding: 16 }}>
        {snapshot.isError ? <Alert type="error" showIcon title="投递快照加载失败" action={<Button size="small" onClick={() => void snapshot.refetch()}>重试</Button>} /> : snapshot.data && snapshot.data.id === current.resume_version_id && preview ? <div aria-label="投递简历只读预览" className="resume-a4-preview" style={{ margin: '0 auto' }}><StandardResumePreview content={snapshot.data.snapshot.content} modulesConfig={snapshot.data.snapshot.modules_config} modulesOrder={snapshot.data.snapshot.modules_order} template={snapshot.data.snapshot.template} fontSize={preview.fontSize} lineHeight={preview.lineHeight} /></div> : snapshot.isLoading ? <Spin aria-label="加载投递快照" /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="未关联投递快照" />}
      </div>}
    </Card>
    <Divider />
    <Typography.Title level={5} style={{ marginTop: 0 }}>记录一次进展</Typography.Title>
    <Typography.Paragraph type="secondary">每次记录会保留在时间线中；填写“下一步行动”会同时更新行动中心。</Typography.Paragraph>
    <Segmented value={activityType} options={activityOptions} onChange={(value) => { setActivityType(value as ActivityType); form.resetFields() }} />
    <Space wrap style={{ marginTop: 12 }}>
      <Button size="small" onClick={() => applyTemplate('已邮件跟进 HR，等待回复')}>邮件跟进</Button>
      <Button size="small" onClick={() => { setActivityType('interview'); applyTemplate('已完成面试复盘，补充关键问题和下一步准备') }}>面试复盘</Button>
      <Button size="small" onClick={() => applyTemplate('已根据 JD 调整简历，并确认投递版本')}>更新简历版本</Button>
    </Space>
    <Form form={form} layout="vertical" preserve={false} style={{ marginTop: 16 }}>
      <Form.Item label={copy.title} name="content" rules={[{ max: 5000, message: '内容最多 5000 字' }]}>
        <Input.TextArea rows={3} maxLength={5000} showCount placeholder={copy.placeholder} />
      </Form.Item>
      {activityType === 'interview' && <Space size="middle" style={{ display: 'flex' }}>
        <Form.Item label="轮次" name="round" style={{ flex: 1 }}><Select placeholder="选择轮次" options={['一面', '二面', '三面', 'HR 面', '终面'].map((value) => ({ value, label: value }))} /></Form.Item>
        <Form.Item label="形式" name="format" style={{ flex: 1 }}><Select placeholder="选择形式" options={['线上', '现场', '电话'].map((value) => ({ value, label: value }))} /></Form.Item>
        <Form.Item label="结果" name="result" style={{ flex: 1 }}><Select placeholder="选择结果" options={['待定', '通过', '未通过', '需补充材料'].map((value) => ({ value, label: value }))} /></Form.Item>
      </Space>}
      {activityType !== 'note' && <Form.Item label="下次行动日期" name="next_action_at" extra="留空不会改动当前日期；可在完成后安排下一次跟进。"><DatePicker style={{ width: 160 }} /></Form.Item>}
      <Button type="primary" icon={activityType === 'interview' ? <CalendarOutlined /> : activityType === 'note' ? <FileTextOutlined /> : <MessageOutlined />} loading={addEvent.isPending} onClick={() => void submitEvent()}>{copy.action}</Button>
    </Form>
    <Divider />
    <Typography.Title level={5} style={{ marginTop: 0 }}>活动时间线</Typography.Title>
    {eventsError ? <Alert type="error" showIcon title="活动加载失败" action={<Button size="small" onClick={() => void refetchEvents()}>重试</Button>} /> : <ApplicationEventTimeline events={events || []} />}
  </Drawer>
}
