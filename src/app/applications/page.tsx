'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import dayjs from 'dayjs'
import { Alert, Button, Card, Col, DatePicker, Drawer, Empty, Form, Grid, Input, List, Popconfirm, Progress, Row, Select, Space, Spin, Statistic, Tabs, Tag, Typography } from 'antd'
import { CalendarOutlined, ClockCircleOutlined, DeleteOutlined, EditOutlined, ExportOutlined, PlusOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/stores/useAuthStore'
import { useJobApplicationActions, useJobApplicationMutations, useJobApplicationSummary, useJobApplications } from '@/hooks/useJobApplications'
import { useResumes } from '@/hooks/useResume'
import { getResumeVersions } from '@/services/resume'
import type { CreateJobApplicationRequest, JobApplication, JobApplicationStatus } from '@/types/job-application'
import { JOB_APPLICATION_STATUSES } from '@/types/job-application'
import { APPLICATION_STATUS_COLORS as STATUS_COLORS, APPLICATION_STATUS_LABELS as STATUS_LABELS, APPLICATION_STATUS_PROGRESS_COLORS as STATUS_PROGRESS_COLORS } from '@/lib/job-applications/config'
import { APPLICATION_STAGE_ORDER } from '@/lib/job-applications/config'
import { ApplicationDetailDrawer } from '@/components/applications/ApplicationDetailDrawer'
import PageContainer from '@/components/layout/PageContainer'

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
      <Space size="middle" orientation={screens.md ? 'horizontal' : 'vertical'} style={{ display: 'flex' }}>
        <Form.Item label="公司" name="company" rules={[{ required: true, message: '请输入公司名称' }, { max: 120, message: '公司名称最多 120 字' }]} style={{ flex: 1 }}><Input autoFocus /></Form.Item>
        <Form.Item label="职位" name="position" rules={[{ required: true, message: '请输入职位名称' }, { max: 120, message: '职位名称最多 120 字' }]} style={{ flex: 1 }}><Input /></Form.Item>
      </Space>
      <Typography.Title level={5}>进展与跟进</Typography.Title>
      <Space size="middle" orientation={screens.md ? 'horizontal' : 'vertical'} style={{ display: 'flex' }}>
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
      <Space size="middle" orientation={screens.md ? 'horizontal' : 'vertical'} style={{ display: 'flex' }}>
        <Form.Item label="地点" name="location" rules={[{ max: 120 }]} style={{ flex: 1 }}><Input /></Form.Item>
        <Form.Item label="投递渠道" name="channel" rules={[{ max: 80 }]} style={{ flex: 1 }}><Input placeholder="官网、内推、招聘平台…" /></Form.Item>
        <Form.Item label="薪资" name="salary" rules={[{ max: 80 }]} style={{ flex: 1 }}><Input /></Form.Item>
      </Space>
      <Typography.Title level={5}>简历与备注</Typography.Title>
      {resumesError && <Alert type="error" showIcon title="简历列表加载失败" action={<Button size="small" onClick={() => void refetchResumes()}>重试</Button>} />}
      <Form.Item label="关联简历（可选）" name="resume_id" extra={resumePage && resumePage.pagination.total_pages > 1 ? '继续输入名称可缩小范围；列表按页加载。' : undefined}><Select allowClear showSearch={{ filterOption: false, onSearch: setResumeQuery }} placeholder="搜索并关联简历" options={(resumePage?.items || []).map((resume) => ({ value: resume.id, label: resume.name }))} onChange={(value) => { setResumeId(value || null); setVersions([]); setVersionsError(false); form.setFieldValue('resume_version_id', undefined) }} /></Form.Item>
      {effectiveResumeId && <>{versionsError && <Alert type="error" showIcon title="简历版本加载失败" action={<Button size="small" onClick={() => void loadVersions(effectiveResumeId)}>重试</Button>} />}<Form.Item label="实际投递版本" name="resume_version_id" extra="不选时会为当前简历创建或复用“申请”快照。"><Select allowClear placeholder="使用当前简历快照" options={versions.map((version) => ({ value: version.id, label: `r${version.revision} · ${version.source} · ${dayjs(version.created_at).format('YYYY-MM-DD HH:mm')}` }))} /></Form.Item></>}
      <Form.Item label="备注" name="notes" rules={[{ max: 5000, message: '备注最多 5000 字' }]}><Input.TextArea rows={4} showCount maxLength={5000} /></Form.Item>
    </Form>

  return <Drawer
    title={<Space orientation="vertical" size={0}><Typography.Text strong>申请工作台</Typography.Text><Typography.Text type="secondary">{application ? '编辑职位信息、阶段和投递快照' : '创建申请后，可继续在详情里记录沟通和面试'}</Typography.Text></Space>}
    open={open}
    onClose={onClose}
    placement="right"
    size="large"
    destroyOnHidden
    extra={<Space><Button onClick={onClose}>取消</Button><Button type="primary" onClick={submit} loading={create.isPending || update.isPending}>{application ? '保存修改' : '创建申请'}</Button></Space>}
  >
    {formContent}
  </Drawer>
}

export default function ApplicationsPage() {
  const router = useRouter()
  const { isAuthenticated, sessionReady } = useAuthStore()
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'all' | JobApplicationStatus>('all')
  const [view, setView] = useState<'recent' | 'stages' | 'all'>('recent')
  const [editing, setEditing] = useState<JobApplication | null | undefined>(undefined)
  const [detail, setDetail] = useState<JobApplication | null>(null)
  const [detailActivity, setDetailActivity] = useState<'follow_up' | 'interview' | 'note'>('follow_up')
  const { data, isLoading, isError, refetch } = useJobApplications({ page, pageSize: 20, q, status })
  const { data: summary, isError: isSummaryError, refetch: refetchSummary } = useJobApplicationSummary()
  const { data: actions, isError: isActionsError, refetch: refetchActions } = useJobApplicationActions()
  const { remove, update } = useJobApplicationMutations()
  useEffect(() => { if (sessionReady && !isAuthenticated) router.replace('/auth/login') }, [isAuthenticated, router, sessionReady])
  const applications = data?.items || []
  const filters = useMemo(() => JOB_APPLICATION_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] })), [])
  if (!sessionReady || !isAuthenticated) return null

  const today = dayjs().format('YYYY-MM-DD')
  const isActionable = (item: JobApplication) => ['wishlist', 'applied', 'screening', 'interview'].includes(item.status)
  const priorityItems = [
    ...(actions?.overdue || []).map((item) => ({ item, tone: 'error' as const, label: '已逾期', description: `原定 ${item.next_action_at}` })),
    ...(actions?.due_today || []).map((item) => ({ item, tone: 'warning' as const, label: '今天', description: '今天需要完成跟进' })),
    ...(actions?.upcoming || []).map((item) => ({ item, tone: 'processing' as const, label: '未来七天', description: `${item.next_action_at} 前处理` })),
  ].slice(0, 3)
  const statusStages = APPLICATION_STAGE_ORDER
  const statusMax = Math.max(...statusStages.map((stage) => summary?.by_status[stage] || 0), 1)
  const displayedApplications = view === 'recent' ? applications.slice(0, 5) : applications

  const openDetail = (item: JobApplication, activity: 'follow_up' | 'interview' | 'note' = 'follow_up') => {
    setDetailActivity(activity)
    setDetail(item)
  }

  const renderApplicationCard = (item: JobApplication) => {
    const overdue = Boolean(item.next_action_at && item.next_action_at < today && isActionable(item))
    const title = <Space wrap size={8}><span>{item.company}</span><Typography.Text type="secondary">{item.position}</Typography.Text><Tag color={STATUS_COLORS[item.status]}>{STATUS_LABELS[item.status]}</Tag>{overdue && <Tag color="error">跟进已逾期</Tag>}</Space>
    const actions = <Space wrap size={4}>
      <Select aria-label={`快速修改 ${item.company} 的状态`} value={item.status} size="small" style={{ width: 128 }} popupMatchSelectWidth={false} options={JOB_APPLICATION_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] }))} onChange={(nextStatus) => update.mutate({ id: item.id, data: { expected_revision: item.revision, status: nextStatus } })} />
      <Button type="text" aria-label={`查看详情 ${item.company}`} onClick={() => openDetail(item)}>详情</Button>
      <Button type="text" icon={<EditOutlined />} aria-label={`编辑 ${item.company} 的申请`} onClick={() => setEditing(item)} />
      <Popconfirm title="删除这条求职申请？" okText="删除" cancelText="取消" onConfirm={() => remove.mutate(item.id)}><Button type="text" danger icon={<DeleteOutlined />} aria-label={`删除 ${item.company} 的申请`} /></Popconfirm>
    </Space>
    return <List.Item key={item.id} style={overdue ? { background: '#fff2f0', margin: '0 -24px', padding: '16px 24px' } : undefined} actions={[actions]}>
      <List.Item.Meta
        title={title}
        description={<Space orientation="vertical" size={4}>
          <Space wrap separator={<span>·</span>}><span>{item.location || '地点未填写'}</span>{item.salary && <span>薪资：{item.salary}</span>}{item.channel && <span>渠道：{item.channel}</span>}{item.applied_at && <span>投递：{item.applied_at}</span>}{item.next_action_at && <strong><CalendarOutlined /> 下次跟进：{item.next_action_at}</strong>}{item.job_url && /^https?:\/\//i.test(item.job_url) && <a href={item.job_url} target="_blank" rel="noopener noreferrer" aria-label={`打开 ${item.company} 的职位链接`}>职位链接 <ExportOutlined /></a>}{item.resume_id && <span>简历：{item.resume_name || '已删除'}{item.resume_version_revision ? ` · r${item.resume_version_revision}` : ''}</span>}</Space>
          {item.notes && <Typography.Text type="secondary" style={{ whiteSpace: 'pre-wrap' }}>{item.notes}</Typography.Text>}
        </Space>}
      />
    </List.Item>
  }
  const renderStageView = () => {
    const stageRows = [...APPLICATION_STAGE_ORDER, 'rejected' as const, 'withdrawn' as const]
    return <List
      aria-label="阶段视图"
      dataSource={stageRows}
      renderItem={(stage) => {
        const items = applications.filter((item) => item.status === stage)
        const count = summary?.by_status[stage] || 0
        return <List.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '150px minmax(0, 1fr)', gap: 16, width: '100%', alignItems: 'start' }}>
            <Space size={8}>
              <Tag color={STATUS_COLORS[stage]}>{STATUS_LABELS[stage]}</Tag>
              <Typography.Text type="secondary">{count}</Typography.Text>
            </Space>
            {items.length ? <Space wrap size={[8, 8]}>
              {items.map((item) => <Button key={item.id} size="small" onClick={() => openDetail(item)}>{item.company} · {item.position}{item.next_action_at ? ` · ${item.next_action_at}` : ''}</Button>)}
            </Space> : <Typography.Text type="secondary">当前页暂无</Typography.Text>}
          </div>
        </List.Item>
      }}
    />
  }

  return <PageContainer
    size="lg"
    title="求职进展"
    subtitle="记录投递、跟进和实际使用的简历版本"
    extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing(null)}>新建申请</Button>}
  >
    <Space orientation="vertical" size="large" style={{ display: 'flex' }}>
      {(isError || isSummaryError || isActionsError) && <Alert type="error" showIcon title="求职数据加载失败" description="请检查网络后重试。" action={<Button size="small" onClick={() => { void refetch(); void refetchSummary(); void refetchActions() }}>重试</Button>} />}
      <Row gutter={[20, 16]} align="top">
        <Col xs={24} lg={15}>
          <Card title="优先处理" extra={<Button type="link" onClick={() => setView('all')}>查看全部</Button>} styles={{ body: { padding: priorityItems.length ? '0 24px' : 24 } }}>
            {isActionsError ? <Alert type="error" showIcon title="优先事项加载失败" action={<Button size="small" onClick={() => void refetchActions()}>重试</Button>} /> : priorityItems.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂时没有需要处理的申请" style={{ margin: '24px 0' }} /> : <List
              dataSource={priorityItems}
              split
              renderItem={({ item, tone, label, description }, index) => <List.Item actions={[
                <Button key="follow-up" size="small" type={index === 0 ? 'primary' : 'default'} onClick={() => openDetail(item, 'follow_up')}>记录跟进</Button>,
                <Button key="interview" size="small" onClick={() => openDetail(item, 'interview')}>面试</Button>,
              ]}>
                <Space orientation="vertical" size={4}>
                  <Space wrap size={8}><Typography.Text strong>{item.company}</Typography.Text><Typography.Text type="secondary">{item.position}</Typography.Text><Tag color={STATUS_COLORS[item.status]}>{STATUS_LABELS[item.status]}</Tag><Tag color={tone}>{label}</Tag></Space>
                  <Typography.Text type={tone === 'error' ? 'danger' : 'secondary'}><ClockCircleOutlined /> {description}</Typography.Text>
                </Space>
              </List.Item>}
            />}
          </Card>
        </Col>
        <Col xs={24} lg={9}>
          <Card title="进展概览" extra={<Button type="link" onClick={() => { setStatus('all'); setView('all'); setPage(1) }}>全部申请</Button>}>
            {summary ? <Space orientation="vertical" size="middle" style={{ display: 'flex' }}>
            <div aria-label="求职申请概览" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
              <Button type="text" style={{ height: 'auto', padding: 0, textAlign: 'left' }} onClick={() => { setStatus('all'); setView('all'); setPage(1) }}><Statistic title="进行中" value={summary.active} /></Button>
              <Button type="text" style={{ height: 'auto', padding: 0, textAlign: 'left' }} onClick={() => setView('recent')}><Statistic title="待跟进" value={summary.due_today + summary.overdue} styles={summary.overdue ? { content: { color: '#ff4d4f' } } : undefined} /></Button>
              <Button type="text" style={{ height: 'auto', padding: 0, textAlign: 'left' }} onClick={() => { setStatus('interview'); setView('all'); setPage(1) }}><Statistic title="面试中" value={summary.interview} /></Button>
            </div>
            <Space orientation="vertical" size={10} style={{ display: 'flex' }}>
              {statusStages.map((stage) => <Button key={stage} type="text" style={{ height: 'auto', padding: 0, textAlign: 'left' }} onClick={() => { setStatus(stage); setView('all'); setPage(1) }} block>
                <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr 28px', gap: 8, alignItems: 'center', width: '100%' }}>
                  <Typography.Text type="secondary">{STATUS_LABELS[stage]}</Typography.Text>
                  <Progress percent={(summary.by_status[stage] || 0) === 0 ? 0 : ((summary.by_status[stage] || 0) / statusMax) * 100} showInfo={false} strokeColor={STATUS_PROGRESS_COLORS[stage]} size="small" />
                  <Typography.Text type={(summary.by_status[stage] || 0) === 0 ? 'secondary' : undefined}>{summary.by_status[stage] || 0}</Typography.Text>
                </div>
              </Button>)}
            </Space>
            </Space> : <Spin aria-label="正在加载求职概览" />}
          </Card>
        </Col>
      </Row>
      <Card styles={{ body: { paddingTop: 0 } }}>
        <Tabs activeKey={view} onChange={(key) => setView(key as typeof view)} items={[{ key: 'recent', label: `最近动态${summary?.overdue ? ` · ${summary.overdue} 项逾期` : ''}` }, { key: 'all', label: '全部申请' }, { key: 'stages', label: '阶段视图' }]} />
        <Space wrap style={{ marginBottom: 16 }}>
          <Input.Search aria-label="搜索公司或职位" placeholder="搜索公司或职位" allowClear value={q} onChange={(event) => setQ(event.target.value)} onSearch={(value) => { setQ(value); setPage(1) }} style={{ width: 260 }} />
          <Select aria-label="按状态筛选" value={status} onChange={(value) => { setStatus(value); setPage(1); setView('all') }} options={[{ value: 'all', label: `全部状态 (${summary?.total || 0})` }, ...filters.map((filter) => ({ ...filter, label: `${filter.label} (${summary?.by_status[filter.value] || 0})` }))]} style={{ width: 170 }} />
          <Button onClick={() => { setQ(''); setStatus('all'); setPage(1) }}>清空筛选</Button>
        </Space>
      {view === 'stages' && renderStageView()}
      {view !== 'stages' && <>
      {isLoading ? <div style={{ textAlign: 'center', padding: 80 }} aria-label="正在加载求职申请"><Spin /></div> : displayedApplications.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={q || status !== 'all' ? '没有符合条件的申请' : '还没有求职申请'} style={{ margin: '32px 0' }}><Button type="primary" onClick={() => setEditing(null)}>创建第一条申请</Button></Empty> : <List dataSource={displayedApplications} renderItem={renderApplicationCard} />}
      {data && data.pagination.total_pages > 1 && <div><Button disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button><span style={{ margin: '0 12px' }}>第 {page} / {data.pagination.total_pages} 页</span><Button disabled={page >= data.pagination.total_pages} onClick={() => setPage(page + 1)}>下一页</Button></div>}
      </>}
      </Card>
    </Space>
    <ApplicationForm key={`application-form-${editing?.id || (editing === null ? 'new' : 'closed')}`} application={editing || null} open={editing !== undefined} onClose={() => setEditing(undefined)} />
    <ApplicationDetailDrawer key={`application-detail-${detail?.id || 'closed'}-${detailActivity}`} application={detail} open={Boolean(detail)} initialActivity={detailActivity} onClose={() => setDetail(null)} onEdit={(current) => { setEditing(current); setDetail(null) }} />
  </PageContainer>
}
