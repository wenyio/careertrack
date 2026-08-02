import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import {
  createJobApplication,
  createJobApplicationEvent,
  deleteJobApplication,
  getJobApplication,
  getJobApplicationActionCenter,
  getJobApplicationSummary,
  listJobApplicationEvents,
  listJobApplications,
  updateJobApplication,
  JobApplicationConflictError,
} from '@/lib/services/job-application'
import { safeWebUrlSchema } from '@/lib/validation/business'
import { registerMcpTool } from './tool-config'

const JOB_APPLICATION_STATUSES = [
  'wishlist', 'applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn',
] as const

const JOB_APPLICATION_SORTS = [
  'updated', 'next_action', 'applied_at', 'company',
] as const

const EVENT_TYPES = ['follow_up', 'interview', 'note', 'offer'] as const

const STATUS_LABELS: Record<string, string> = {
  wishlist: '心愿单', applied: '已投递', screening: '沟通中', interview: '面试中',
  offer: 'Offer', rejected: '未通过', withdrawn: '已撤回',
}

/** 注册求职进展（Job Applications）领域工具。 */
export function registerJobApplicationTools(
  server: McpServer,
  userId: string,
  canWrite: boolean,
): void {
  // ===== 只读工具 =====

  registerMcpTool(server,
    'applications_summary',
    '获取求职进展的整体统计概览，包括各状态数量、活跃申请数、面试数、Offer 数、今日待办和逾期数',
    {},
    async () => {
      const summary = await getJobApplicationSummary(userId)
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            ...summary,
            by_status_label: Object.fromEntries(
              Object.entries(summary.by_status).map(([k, v]) => [STATUS_LABELS[k] || k, v]),
            ),
          }, null, 2),
        }],
      }
    },
  )

  registerMcpTool(server,
    'applications_list',
    '获取求职申请列表，支持搜索（公司/职位）、状态筛选、排序和分页',
    {
      q: z.string().optional()
        .describe('搜索关键词，匹配公司名和职位名'),
      status: z.enum(['all', ...JOB_APPLICATION_STATUSES]).default('all')
        .describe('按状态筛选，默认 all 返回全部'),
      sort: z.enum(JOB_APPLICATION_SORTS).default('updated')
        .describe('排序方式：updated=最近更新, next_action=下一步日期, applied_at=投递日期, company=公司名'),
      page: z.number().int().min(1).default(1)
        .describe('页码，从 1 开始'),
      pageSize: z.number().int().min(1).max(100).default(20)
        .describe('每页条数，默认 20，最大 100'),
    },
    async (args) => {
      const result = await listJobApplications(userId, {
        q: args.q,
        status: args.status as 'all' | typeof JOB_APPLICATION_STATUSES[number],
        sort: args.sort,
        page: args.page,
        pageSize: args.pageSize,
      })
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(result, null, 2),
        }],
      }
    },
  )

  registerMcpTool(server,
    'applications_get',
    '获取单条求职申请的完整详情，含 revision 字段（后续写操作需提供 expected_revision 做乐观锁校验）',
    {
      id: z.string().describe('申请 ID'),
    },
    async (args) => {
      const application = await getJobApplication(args.id, userId)
      if (!application) {
        return {
          content: [{ type: 'text' as const, text: '错误：求职申请不存在' }],
          isError: true,
        }
      }
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(application, null, 2),
        }],
      }
    },
  )

  registerMcpTool(server,
    'applications_action_center',
    '获取优先处理中心，按紧急程度分桶：逾期项、今日到期、近 7 天待办、待安排。仅含活跃状态（wishlist/applied/screening/interview）的申请',
    {},
    async () => {
      const center = await getJobApplicationActionCenter(userId)
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(center, null, 2),
        }],
      }
    },
  )

  registerMcpTool(server,
    'applications_events_list',
    '获取某条求职申请的事件时间线（状态变更、跟进、面试、笔记、Offer 等）',
    {
      applicationId: z.string().describe('申请 ID'),
      page: z.number().int().min(1).default(1)
        .describe('页码，从 1 开始'),
      pageSize: z.number().int().min(1).max(100).default(20)
        .describe('每页条数，默认 20，最大 100'),
    },
    async (args) => {
      const result = await listJobApplicationEvents(args.applicationId, userId, {
        page: args.page,
        pageSize: args.pageSize,
      })
      if (result === null) {
        return {
          content: [{ type: 'text' as const, text: '错误：求职申请不存在' }],
          isError: true,
        }
      }
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(result, null, 2),
        }],
      }
    },
  )

  // ===== 写工具 =====
  if (!canWrite) return

  registerMcpTool(server,
    'applications_create',
    '创建一条新的求职申请。company 和 position 必填，其他字段可选。status 默认为 wishlist',
    {
      company: z.string().min(1).describe('公司名称（必填）'),
      position: z.string().min(1).describe('职位名称（必填）'),
      status: z.enum(JOB_APPLICATION_STATUSES).default('wishlist')
        .describe('初始状态，默认 wishlist（心愿单）'),
      job_url: safeWebUrlSchema.nullable().default(null)
        .describe('职位链接'),
      location: z.string().nullable().default(null)
        .describe('工作地点'),
      channel: z.string().nullable().default(null)
        .describe('投递渠道（如 Boss直聘、内推、官网等）'),
      salary: z.string().nullable().default(null)
        .describe('薪资范围'),
      notes: z.string().nullable().default(null)
        .describe('备注'),
      applied_at: z.string().nullable().default(null)
        .describe('投递日期，格式 YYYY-MM-DD'),
      next_action_at: z.string().nullable().default(null)
        .describe('下一步行动日期，格式 YYYY-MM-DD'),
      resume_id: z.string().nullable().default(null)
        .describe('关联的简历 ID'),
      resume_version_id: z.string().nullable().default(null)
        .describe('关联的简历版本 ID（需同时传 resume_id）'),
    },
    async (args) => {
      try {
        const application = await createJobApplication(userId, {
          company: args.company,
          position: args.position,
          status: args.status,
          job_url: args.job_url,
          location: args.location,
          channel: args.channel,
          salary: args.salary,
          notes: args.notes,
          applied_at: args.applied_at,
          next_action_at: args.next_action_at,
          resume_id: args.resume_id,
          resume_version_id: args.resume_version_id,
        })
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              ...application,
              message: '求职申请创建成功',
              tip: '后续可通过 applications_create_event 记录进展或推进阶段',
            }, null, 2),
          }],
        }
      } catch (error) {
        return toolError(error)
      }
    },
  )

  registerMcpTool(server,
    'applications_update',
    '更新求职申请的元信息（公司、职位、状态、薪资等）。需提供 expected_revision（从 applications_get 获取），仅传需要修改的字段即可',
    {
      id: z.string().describe('申请 ID'),
      expected_revision: z.number().int().min(0)
        .describe('期望的 revision 版本号，用于乐观锁校验。先调用 applications_get 获取当前 revision'),
      company: z.string().min(1).optional()
        .describe('公司名称'),
      position: z.string().min(1).optional()
        .describe('职位名称'),
      status: z.enum(JOB_APPLICATION_STATUSES).optional()
        .describe('申请状态'),
      job_url: safeWebUrlSchema.nullable().optional()
        .describe('职位链接'),
      location: z.string().nullable().optional()
        .describe('工作地点'),
      channel: z.string().nullable().optional()
        .describe('投递渠道'),
      salary: z.string().nullable().optional()
        .describe('薪资范围'),
      notes: z.string().nullable().optional()
        .describe('备注'),
      applied_at: z.string().nullable().optional()
        .describe('投递日期，格式 YYYY-MM-DD'),
      next_action_at: z.string().nullable().optional()
        .describe('下一步行动日期，格式 YYYY-MM-DD'),
      resume_id: z.string().nullable().optional()
        .describe('关联的简历 ID'),
      resume_version_id: z.string().nullable().optional()
        .describe('关联的简历版本 ID（需同时传 resume_id）'),
    },
    async (args) => {
      try {
        const { id, expected_revision, ...fields } = args
        const application = await updateJobApplication(id, userId, {
          expected_revision,
          ...fields,
        })
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              ...application,
              message: '求职申请更新成功',
            }, null, 2),
          }],
        }
      } catch (error) {
        return toolError(error)
      }
    },
  )

  registerMcpTool(server,
    'applications_create_event',
    '为求职申请记录一条事件（跟进、面试、笔记、Offer），同时可推进阶段和/或设置下一步日期。这是推进求职进展的核心工具',
    {
      applicationId: z.string().describe('申请 ID'),
      event_type: z.enum(EVENT_TYPES)
        .describe('事件类型：follow_up=跟进, interview=面试, note=笔记, offer=Offer'),
      content: z.string().nullable().default(null)
        .describe('事件内容（支持纯文本）'),
      metadata: z.record(z.string(), z.unknown()).default({})
        .describe('事件附加数据（JSON 对象）'),
      occurred_at: z.string().optional()
        .describe('事件发生时间（ISO 8601 格式），不传则使用当前时间'),
      expected_revision: z.number().int().min(0).optional()
        .describe('期望的 revision 版本号。如果要推进阶段或设置下一步日期则必填；仅记录事件可不传'),
      next_action_at: z.string().nullable().optional()
        .describe('更新下一步行动日期，格式 YYYY-MM-DD。传 null 表示清除'),
      next_status: z.enum(JOB_APPLICATION_STATUSES).optional()
        .describe('推进到的目标状态，如从 interview 推到 offer'),
    },
    async (args) => {
      try {
        const event = await createJobApplicationEvent(args.applicationId, userId, {
          event_type: args.event_type,
          content: args.content,
          metadata: args.metadata,
          occurred_at: args.occurred_at,
          expected_revision: args.expected_revision,
          next_action_at: args.next_action_at,
          next_status: args.next_status,
        })
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              ...event,
              message: '事件记录成功',
            }, null, 2),
          }],
        }
      } catch (error) {
        return toolError(error)
      }
    },
  )

  registerMcpTool(server,
    'applications_delete',
    '⚠️ 永久删除一条求职申请及其所有事件记录，不可恢复，请谨慎使用',
    {
      id: z.string().describe('申请 ID'),
    },
    async (args) => {
      try {
        const deleted = await deleteJobApplication(args.id, userId)
        if (!deleted) {
          return {
            content: [{ type: 'text' as const, text: '错误：求职申请不存在或无权删除' }],
            isError: true,
          }
        }
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({ id: args.id, message: '求职申请已永久删除' }, null, 2),
          }],
        }
      } catch (error) {
        return toolError(error)
      }
    },
  )
}

function toolError(error: unknown) {
  const message = error instanceof JobApplicationConflictError
    ? `冲突：${error.message}（请重新调用 applications_get 获取最新 revision 后重试）`
    : `错误：${(error as Error).message}`
  return {
    content: [{ type: 'text' as const, text: message }],
    isError: true,
  }
}
