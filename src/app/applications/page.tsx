'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import dayjs from 'dayjs'
import { Alert, Button, Card, DatePicker, Descriptions, Drawer, Empty, Form, Grid, Input, Modal, Popconfirm, Select, Space, Spin, Statistic, Tabs, Tag, Typography } from 'antd'
import { DeleteOutlined, EditOutlined, ExportOutlined, EyeOutlined, PlusOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/stores/useAuthStore'
import { useJobApplicationActions, useJobApplicationMutations, useJobApplicationSummary, useJobApplications } from '@/hooks/useJobApplications'
import { useResumes } from '@/hooks/useResume'
import { getResumeVersion, getResumeVersions } from '@/services/resume'
import type { CreateJobApplicationRequest, JobApplication, JobApplicationStatus } from '@/types/job-application'
import type { ResumeVersionDetail } from '@/types/resume'
import { JOB_APPLICATION_STATUSES } from '@/types/job-application'
import { APPLICATION_STATUS_COLORS as STATUS_COLORS, APPLICATION_STATUS_LABELS as STATUS_LABELS } from '@/lib/job-applications/config'
import { APPLICATION_ARCHIVED_STATUSES, APPLICATION_STAGE_ORDER, nextApplicationStatus } from '@/lib/job-applications/config'
import { ApplicationDetailDrawer } from '@/components/applications/ApplicationDetailDrawer'

type ApplicationFormValues = Omit<CreateJobApplicationRequest, 'applied_at' | 'next_action_at'> & {
  applied_at?: dayjs.Dayjs
  next_action_at?: dayjs.Dayjs
}

function toPayload(values: ApplicationFormValues): CreateJobApplicationRequest {
  return {
    ...values,
    job_url: values.job_url || null,
    location: values.location || null,
    channel: values.channel || null,
    salary: values.salary || null,
    notes: values.notes || null,
    applied_at: values.applied_at?.format('YYYY-MM-DD') || null,
    next_action_at: values.next_action_at?.format('YYYY-MM-DD') || null,
    resume_id: values.resume_id || null,
    resume_version_id: values.resume_version_id || null,
  }
}

function ApplicationForm({ application, open, onClose }: { application: JobApplication | null; open: boolean; onClose: () => void }) {
  const [form] = Form.useForm<ApplicationFormValues>()
  const screens = Grid.useBreakpoint()
  const { create, update } = useJobApplicationMutations()
  const [resumeQuery, setResumeQuery] = useState('')
  const { data: resumePage, isError: resumesError, refetch: refetchResumes } = useResumes(1, 20, { enabled: open, q: resumeQuery })
  const [resumeId, setResumeId] = useState<string | null | undefined>()
  const [versions, setVersions] = useState<Array<{ id: string; revision: number; source: string; created_at: string }>>([])
  const [versionsError, setVersionsError] = useState(false)

  const effectiveResumeId = resumeId === undefined ? application?.resume_id || undefined : resumeId || undefined

  const loadVersions = useCallback(async (id: string) => {
    try {
      const first = await getResumeVersions(id, 1, 20)
      setVersions(first.items || [])
      setVersionsError(false)
    } catch {
      setVersions([])
      setVersionsError(true)
    }
  }, [])

  useEffect(() => {
    if (open && effectiveResumeId) void Promise.resolve().then(() => loadVersions(effectiveResumeId))
  }, [effectiveResumeId, loadVersions, open])

  const submit = async () => {
    const values = await form.validateFields()
    const payload = toPayload(values)
    if (application) {
      // Keep an existing application snapshot immutable during ordinary edits.
      // Re-sending the unchanged IDs would needlessly re-run ownership checks
      // and makes an unrelated status/date update depend on historical links.
      if (
        payload.resume_id === application.resume_id
        && payload.resume_version_id === application.resume_version_id
      ) {
        delete payload.resume_id
        delete payload.resume_version_id
      }
      update.mutate({ id: application.id, data: { ...payload, expected_revision: application.revision } }, { onSuccess: onClose })
    } else {
      create.mutate(payload, { onSuccess: onClose })
    }
  }

  const formContent = <Form form={form} layout="vertical" requiredMark="optional" initialValues={application ? {
      ...application,
      applied_at: application.applied_at ? dayjs(application.applied_at) : undefined,
      next_action_at: application.next_action_at ? dayjs(application.next_action_at) : undefined,
    } : { status: 'wishlist' }}>
      <Typography.Title level={5}>职位信息</Typography.Title>
      <Typography.Title level={5}>进展与跟进</Typography.Title>
      <Space size="middle" style={{ display: 'flex' }}>
        <Form.Item label="公司" name="company" rules={[{ required: true, message: '请输入公司名称' }, { max: 120, message: '公司名称最多 120 字' }]} style={{ flex: 1 }}><Input autoFocus /></Form.Item>
        <Form.Item label="职位" name="position" rules={[{ required: true, message: '请输入职位名称' }, { max: 120, message: '职位名称最多 120 字' }]} style={{ flex: 1 }}><Input /></Form.Item>
      </Space>
      <Space size="middle" style={{ display: 'flex' }}>
        <Form.Item label="状态" name="status" rules={[{ required: true }]} style={{ flex: 1 }}><Select options={JOB_APPLICATION_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] }))} /></Form.Item>
        <Form.Item label="投递日期" name="applied_at" style={{ flex: 1 }}><DatePicker style={{ width: '100%' }} /></Form.Item>
        <Form.Item label="下次跟进" name="next_action_at" style={{ flex: 1 }}><DatePicker style={{ width: '100%' }} /></Form.Item>
      </Space>
      <Form.Item label="职位链接" name="job_url" rules={[{
        validator: async (_rule, value) => {
          if (!value || /^https?:\/\//i.test(value)) return
          throw new Error('请输入 http 或 https 链接')
        },
      }]}><Input placeholder="https://example.com/jobs/123" /></Form.Item>
      <Space size="middle" style={{ display: 'flex' }}>
        <Form.Item label="地点" name="location" rules={[{ max: 120 }]} style={{ flex: 1 }}><Input /></Form.Item>
        <Form.Item label="投递渠道" name="channel" rules={[{ max: 80 }]} style={{ flex: 1 }}><Input placeholder="官网、内推、招聘平台…" /></Form.Item>
        <Form.Item label="薪资" name="salary" rules={[{ max: 80 }]} style={{ flex: 1 }}><Input /></Form.Item>
      </Space>
      <Typography.Title level={5}>简历与备注</Typography.Title>
      {resumesError && <Alert type="error" showIcon message="简历列表加载失败" action={<Button size="small" onClick={() => void refetchResumes()}>重试</Button>} />}
      <Form.Item label="关联简历（可选）" name="resume_id" extra={resumePage && resumePage.pagination.total_pages > 1 ? '继续输入名称可缩小范围；列表按页加载。' : undefined}><Select allowClear showSearch filterOption={false} onSearch={setResumeQuery} placeholder="搜索并关联简历" options={(resumePage?.items || []).map((resume) => ({ value: resume.id, label: resume.name }))} onChange={(value) => { setResumeId(value || null); setVersions([]); setVersionsError(false); form.setFieldValue('resume_version_id', undefined) }} /></Form.Item>
      {effectiveResumeId && <>{versionsError && <Alert type="error" showIcon message="简历版本加载失败" action={<Button size="small" onClick={() => void loadVersions(effectiveResumeId)}>重试</Button>} />}<Form.Item label="实际投递版本" name="resume_version_id" extra="不选时会为当前简历创建或复用“申请”快照。"><Select allowClear placeholder="使用当前简历快照" options={versions.map((version) => ({ value: version.id, label: `r${version.revision} · ${version.source} · ${dayjs(version.created_at).format('YYYY-MM-DD HH:mm')}` }))} /></Form.Item></>}
      <Form.Item label="备注" name="notes" rules={[{ max: 5000, message: '备注最多 5000 字' }]}><Input.TextArea rows={4} showCount maxLength={5000} /></Form.Item>
    </Form>

  if (!screens.md) {
    return <Drawer title={application ? '编辑求职申请' : '创建求职申请'} open={open} onClose={onClose} placement="bottom" size="92vh" extra={<Button type="primary" onClick={submit} loading={create.isPending || update.isPending}>保存</Button>}>
      {formContent}
    </Drawer>
  }
  return <Modal title={application ? '编辑求职申请' : '创建求职申请'} open={open} onCancel={onClose} onOk={submit} okText={application ? '保存修改' : '创建申请'} confirmLoading={create.isPending || update.isPending} destroyOnHidden width={720}>
    {formContent}
  </Modal>
}

export default function ApplicationsPage() {
  const router = useRouter()
  const { isAuthenticated, sessionReady } = useAuthStore()
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'all' | JobApplicationStatus>('all')
  const [view, setView] = useState<'actions' | 'stages' | 'all'>('actions')
  const [editing, setEditing] = useState<JobApplication | null | undefined>(undefined)
  const [detail, setDetail] = useState<JobApplication | null>(null)
  const { data, isLoading, isError, refetch } = useJobApplications({ page, pageSize: 20, q, status })
  const { data: summary, isError: isSummaryError, refetch: refetchSummary } = useJobApplicationSummary()
  const { data: actions, isError: isActionsError, refetch: refetchActions } = useJobApplicationActions()
  const { remove, update } = useJobApplicationMutations()
  const [snapshot, setSnapshot] = useState<ResumeVersionDetail | null>(null)
  const [snapshotError, setSnapshotError] = useState<string | null>(null)

  const openSnapshot = useCallback(async (item: JobApplication) => {
    if (!item.resume_id || !item.resume_version_id) return
    setSnapshotError(null)
    try {
      setSnapshot(await getResumeVersion(item.resume_id, item.resume_version_id))
    } catch {
      setSnapshotError('投递快照暂不可读取，请重试。')
    }
  }, [])

  useEffect(() => { if (sessionReady && !isAuthenticated) router.replace('/auth/login') }, [isAuthenticated, router, sessionReady])
  const applications = data?.items || []
  const filters = useMemo(() => JOB_APPLICATION_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] })), [])
  if (!sessionReady || !isAuthenticated) return null

  const today = dayjs().format('YYYY-MM-DD')
  const isActionable = (item: JobApplication) => ['wishlist', 'applied', 'screening', 'interview'].includes(item.status)
  const actionSections: Array<[string, JobApplication[]]> = [
    ['已逾期', actions?.overdue || []], ['今天需要跟进', actions?.due_today || []], ['未来七天', actions?.upcoming || []],
  ]

  return <main style={{ maxWidth: 1120, margin: '0 auto', padding: '88px 20px 40px' }}>
    <Space orientation="vertical" size="large" style={{ display: 'flex' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div><Typography.Title level={2} style={{ margin: 0 }}>求职进展</Typography.Title><Typography.Text type="secondary">记录投递、跟进和实际使用的简历版本</Typography.Text></div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing(null)}>创建申请</Button>
      </div>
      {(isError || isSummaryError || isActionsError) && <Alert type="error" showIcon message="求职数据加载失败" description="请检查网络后重试。" action={<Button size="small" onClick={() => { void refetch(); void refetchSummary(); void refetchActions() }}>重试</Button>} />}
      {summary && <div aria-label="求职申请概览" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
        {[['全部', summary.total, 'all'], ['进行中', summary.active, 'active'], ['面试', summary.interview, 'interview'], ['Offer', summary.offer, 'offer'], ['今日待跟进', summary.due_today, 'today'], ['已逾期', summary.overdue, 'overdue']].map(([label, value, filter]) => <Card size="small" key={String(label)} hoverable onClick={() => { setView(filter === 'today' || filter === 'overdue' ? 'actions' : 'all'); setStatus(filter === 'active' ? 'all' : filter === 'all' || filter === 'today' || filter === 'overdue' ? 'all' : filter as JobApplicationStatus); setPage(1) }}><Statistic title={label} value={Number(value)} /></Card>)}
      </div>}
      <Tabs activeKey={view} onChange={(key) => setView(key as typeof view)} items={[{ key: 'actions', label: '行动中心' }, { key: 'stages', label: '阶段视图' }, { key: 'all', label: '全部申请' }]} />
      {view === 'actions' && <div aria-label="行动中心"><Typography.Title level={4}>行动中心</Typography.Title>{actionSections.map(([label, items]) => <section key={label}><Typography.Title level={5}>{label}（{items.length}）</Typography.Title>{items.length === 0 ? <Typography.Text type="secondary">暂无事项</Typography.Text> : items.map((item) => <Card key={item.id} size="small" style={{ marginBottom: 8 }} actions={[<Button key="follow" type="link" onClick={() => setDetail(item)}>记录跟进</Button>, <Button key="next" type="link" onClick={() => setDetail(item)}>安排下一步</Button>, <Button key="status" type="link" onClick={() => update.mutate({ id: item.id, data: { expected_revision: item.revision, status: nextApplicationStatus(item.status) || item.status } })}>推进状态</Button>]}><strong>{item.company}</strong> · {item.position} · {item.next_action_at}</Card>)}</section>)}</div>}
      {view === 'stages' && <div aria-label="阶段视图" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>{APPLICATION_STAGE_ORDER.map((stage) => { const items = applications.filter((item) => item.status === stage); return <Card key={stage} title={`${STATUS_LABELS[stage]}（${summary?.by_status[stage] || 0}）`}>{items.length ? items.map((item) => <Button block type="text" key={item.id} onClick={() => setDetail(item)}>{item.company} · {item.position}</Button>) : <Typography.Text type="secondary">当前页暂无</Typography.Text>}</Card> })}<Card title={`归档（${(summary?.by_status.rejected || 0) + (summary?.by_status.withdrawn || 0)}）`}>{applications.filter((item) => APPLICATION_ARCHIVED_STATUSES.includes(item.status)).map((item) => <Button block type="text" key={item.id} onClick={() => setDetail(item)}>{item.company} · {item.position}</Button>)}</Card></div>}
      {view === 'all' && <>
      <Space wrap>
        <Input.Search aria-label="搜索公司或职位" placeholder="搜索公司或职位" allowClear onSearch={(value) => { setQ(value); setPage(1) }} style={{ width: 260 }} />
        <Select aria-label="按状态筛选" value={status} onChange={(value) => { setStatus(value); setPage(1) }} options={[{ value: 'all', label: `全部状态 (${summary?.total || 0})` }, ...filters.map((filter) => ({ ...filter, label: `${filter.label} (${summary?.by_status[filter.value] || 0})` }))]} style={{ width: 170 }} />
      </Space>
      {isLoading ? <div style={{ textAlign: 'center', padding: 80 }} aria-label="正在加载求职申请"><Spin /></div> : applications.length === 0 ? <Empty description={q || status !== 'all' ? '没有符合条件的申请' : '还没有求职申请'}><Button type="primary" onClick={() => setEditing(null)}>创建第一条申请</Button></Empty> : applications.map((item) => {
        const overdue = Boolean(item.next_action_at && item.next_action_at < today && isActionable(item))
        const title = <Space><span>{item.company}</span><Typography.Text type="secondary">{item.position}</Typography.Text><Tag color={STATUS_COLORS[item.status]}>{STATUS_LABELS[item.status]}</Tag>{overdue && <Tag color="error">跟进已逾期</Tag>}</Space>
        const actions = <Space>
          <Select aria-label={`快速修改 ${item.company} 的状态`} value={item.status} size="small" options={JOB_APPLICATION_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] }))} onChange={(nextStatus) => update.mutate({ id: item.id, data: { expected_revision: item.revision, status: nextStatus } })} />
          <Button type="text" aria-label={`查看详情 ${item.company}`} onClick={() => setDetail(item)}>详情</Button>
          <Button type="text" icon={<EditOutlined />} aria-label={`编辑 ${item.company} 的申请`} onClick={() => setEditing(item)} />
          <Popconfirm title="删除这条求职申请？" okText="删除" cancelText="取消" onConfirm={() => remove.mutate(item.id)}><Button type="text" danger icon={<DeleteOutlined />} aria-label={`删除 ${item.company} 的申请`} /></Popconfirm>
        </Space>
        return <Card key={item.id} size="small" style={overdue ? { borderColor: '#ff7875', background: '#fff2f0' } : undefined} title={title} extra={actions}>
          <Space wrap separator={<span>·</span>}><span>{item.location || '地点未填写'}</span>{item.salary && <span>薪资：{item.salary}</span>}{item.channel && <span>渠道：{item.channel}</span>}{item.applied_at && <span>投递：{item.applied_at}</span>}{item.next_action_at && <strong>下次跟进：{item.next_action_at}</strong>}{item.job_url && /^https?:\/\//i.test(item.job_url) && <a href={item.job_url} target="_blank" rel="noopener noreferrer" aria-label={`打开 ${item.company} 的职位链接`}>职位链接 <ExportOutlined /></a>}{item.resume_id && <span>简历：{item.resume_name || '已删除'}{item.resume_version_revision ? ` · r${item.resume_version_revision}` : ''}</span>}{item.resume_id && item.resume_version_id && <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => void openSnapshot(item)}>查看投递快照</Button>}</Space>
          {item.notes && <Typography.Paragraph type="secondary" style={{ margin: '10px 0 0', whiteSpace: 'pre-wrap' }}>{item.notes}</Typography.Paragraph>}
        </Card>
      })}
      {data && data.pagination.total_pages > 1 && <div><Button disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button><span style={{ margin: '0 12px' }}>第 {page} / {data.pagination.total_pages} 页</span><Button disabled={page >= data.pagination.total_pages} onClick={() => setPage(page + 1)}>下一页</Button></div>}
      </>}
    </Space>
    <ApplicationForm key={editing?.id || (editing === null ? 'new' : 'closed')} application={editing || null} open={editing !== undefined} onClose={() => setEditing(undefined)} />
    <ApplicationDetailDrawer application={detail} open={Boolean(detail)} onClose={() => setDetail(null)} onEdit={() => { setEditing(detail); setDetail(null) }} />
    <Modal title={snapshot ? `投递快照 · r${snapshot.revision}` : '投递快照'} open={Boolean(snapshot) || Boolean(snapshotError)} onCancel={() => { setSnapshot(null); setSnapshotError(null) }} footer={<Button aria-label="关闭投递快照" onClick={() => { setSnapshot(null); setSnapshotError(null) }}>关闭</Button>}>
      {snapshotError ? <Alert type="error" message={snapshotError} /> : snapshot && <Descriptions column={1} size="small" items={[{ key: 'name', label: '简历名称', children: snapshot.snapshot.name }, { key: 'template', label: '模板', children: snapshot.snapshot.template }, { key: 'revision', label: '版本', children: `r${snapshot.revision}` }]} />}
    </Modal>
  </main>
}
