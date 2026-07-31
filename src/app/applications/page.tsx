'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import dayjs from 'dayjs'
import { Button, Card, DatePicker, Empty, Form, Input, Modal, Popconfirm, Select, Space, Spin, Tag, Typography } from 'antd'
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/stores/useAuthStore'
import { useJobApplicationMutations, useJobApplications } from '@/hooks/useJobApplications'
import { useResumes } from '@/hooks/useResume'
import { getResumeVersions } from '@/services/resume'
import type { CreateJobApplicationRequest, JobApplication, JobApplicationStatus } from '@/types/job-application'
import { JOB_APPLICATION_STATUSES } from '@/types/job-application'

const STATUS_LABELS: Record<JobApplicationStatus, string> = {
  wishlist: '心愿单', applied: '已投递', screening: '筛选中', interview: '面试中', offer: '已获 Offer', rejected: '未通过', withdrawn: '已撤回',
}

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
  const { create, update } = useJobApplicationMutations()
  const { data: resumes } = useResumes(1, 100)
  const [resumeId, setResumeId] = useState<string | undefined>()
  const [versions, setVersions] = useState<Array<{ id: string; revision: number; source: string; created_at: string }>>([])

  const effectiveResumeId = resumeId || application?.resume_id || undefined

  useEffect(() => {
    if (!effectiveResumeId) return
    let active = true
    getResumeVersions(effectiveResumeId, 1, 100)
      .then((page) => { if (active) setVersions(page.items) })
      .catch(() => { if (active) setVersions([]) })
    return () => { active = false }
  }, [effectiveResumeId])

  const submit = async () => {
    const values = await form.validateFields()
    const payload = toPayload(values)
    if (application) {
      update.mutate({ id: application.id, data: { ...payload, expected_revision: application.revision } }, { onSuccess: onClose })
    } else {
      create.mutate(payload, { onSuccess: onClose })
    }
  }

  return <Modal
    title={application ? '编辑求职申请' : '创建求职申请'} open={open} onCancel={onClose}
    onOk={submit} okText={application ? '保存修改' : '创建申请'} confirmLoading={create.isPending || update.isPending}
    destroyOnHidden width={720}
  >
    <Form form={form} layout="vertical" requiredMark="optional" initialValues={application ? {
      ...application,
      applied_at: application.applied_at ? dayjs(application.applied_at) : undefined,
      next_action_at: application.next_action_at ? dayjs(application.next_action_at) : undefined,
    } : { status: 'wishlist' }}>
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
      <Form.Item label="关联简历（可选）" name="resume_id"><Select allowClear placeholder="不关联简历" options={resumes?.items.map((resume) => ({ value: resume.id, label: resume.name }))} onChange={(value) => { setResumeId(value); form.setFieldValue('resume_version_id', undefined) }} /></Form.Item>
      {effectiveResumeId && <Form.Item label="实际投递版本" name="resume_version_id" extra="不选时会为当前简历创建或复用“申请”快照。"><Select allowClear placeholder="使用当前简历快照" options={versions.map((version) => ({ value: version.id, label: `r${version.revision} · ${version.source} · ${dayjs(version.created_at).format('YYYY-MM-DD HH:mm')}` }))} /></Form.Item>}
      <Form.Item label="备注" name="notes" rules={[{ max: 5000, message: '备注最多 5000 字' }]}><Input.TextArea rows={4} showCount maxLength={5000} /></Form.Item>
    </Form>
  </Modal>
}

export default function ApplicationsPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'all' | JobApplicationStatus>('all')
  const [editing, setEditing] = useState<JobApplication | null | undefined>(undefined)
  const { data, isLoading } = useJobApplications({ page, pageSize: 20, q, status })
  const { remove } = useJobApplicationMutations()

  useEffect(() => { if (!isAuthenticated) router.replace('/auth/login') }, [isAuthenticated, router])
  const applications = data?.items || []
  const filters = useMemo(() => JOB_APPLICATION_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] })), [])
  if (!isAuthenticated) return null

  return <main style={{ maxWidth: 1120, margin: '0 auto', padding: '88px 20px 40px' }}>
    <Space orientation="vertical" size="large" style={{ display: 'flex' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div><Typography.Title level={2} style={{ margin: 0 }}>求职进展</Typography.Title><Typography.Text type="secondary">记录投递、跟进和实际使用的简历版本</Typography.Text></div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing(null)}>创建申请</Button>
      </div>
      <Space wrap>
        <Input.Search aria-label="搜索公司或职位" placeholder="搜索公司或职位" allowClear onSearch={(value) => { setQ(value); setPage(1) }} style={{ width: 260 }} />
        <Select aria-label="按状态筛选" value={status} onChange={(value) => { setStatus(value); setPage(1) }} options={[{ value: 'all', label: '全部状态' }, ...filters]} style={{ width: 150 }} />
      </Space>
      {isLoading ? <div style={{ textAlign: 'center', padding: 80 }} aria-label="正在加载求职申请"><Spin /></div> : applications.length === 0 ? <Empty description={q || status !== 'all' ? '没有符合条件的申请' : '还没有求职申请'}><Button type="primary" onClick={() => setEditing(null)}>创建第一条申请</Button></Empty> : applications.map((item) => <Card key={item.id} size="small" title={<Space><span>{item.company}</span><Typography.Text type="secondary">{item.position}</Typography.Text><Tag color="blue">{STATUS_LABELS[item.status]}</Tag></Space>} extra={<Space><Button type="text" icon={<EditOutlined />} aria-label={`编辑 ${item.company} 的申请`} onClick={() => setEditing(item)} /><Popconfirm title="删除这条求职申请？" okText="删除" cancelText="取消" onConfirm={() => remove.mutate(item.id)}><Button type="text" danger icon={<DeleteOutlined />} aria-label={`删除 ${item.company} 的申请`} /></Popconfirm></Space>}>
        <Space wrap split={<span>·</span>}><span>{item.location || '地点未填写'}</span>{item.channel && <span>{item.channel}</span>}{item.applied_at && <span>投递：{item.applied_at}</span>}{item.next_action_at && <strong>下次跟进：{item.next_action_at}</strong>}{item.resume_id && <span>已关联简历版本</span>}</Space>
        {item.notes && <Typography.Paragraph type="secondary" style={{ margin: '10px 0 0', whiteSpace: 'pre-wrap' }}>{item.notes}</Typography.Paragraph>}
      </Card>)}
      {data && data.pagination.total_pages > 1 && <div><Button disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button><span style={{ margin: '0 12px' }}>第 {page} / {data.pagination.total_pages} 页</span><Button disabled={page >= data.pagination.total_pages} onClick={() => setPage(page + 1)}>下一页</Button></div>}
    </Space>
    <ApplicationForm key={editing?.id || (editing === null ? 'new' : 'closed')} application={editing || null} open={editing !== undefined} onClose={() => setEditing(undefined)} />
  </main>
}
