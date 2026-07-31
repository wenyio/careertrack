# API 接口文档

## 基础信息

- Base URL: `/api`（相对于当前站点根路径）
- 浏览器认证: `careertrack_session` HttpOnly Cookie（登录、注册或 OAuth 回调自动设置）
- 传输兼容: `Authorization: Bearer <server-issued session JWT>`；令牌仍必须存在于服务端会话表
- 数据格式: JSON

> **注意**：CareerTrack 是 Next.js 全栈应用，API 路由与前端部署在同一域名下，无需单独配置后端地址。
>
> 登录态 Cookie 在生产环境启用 `Secure`，有效期与 JWT 及服务端会话一致（24 小时），前端 JavaScript 无法读取。JWT 只保存签名身份，服务端同时校验会话摘要、撤销状态、过期时间和当前用户状态。受限接口超过配额时返回 `429 RATE_LIMITED`，并携带 `Retry-After` 与 `X-RateLimit-*` 响应头。

所有接收 JSON 的写接口都使用共享 Zod schema 做运行时校验。损坏 JSON、非对象 JSON 或字段类型/边界错误统一返回：

```json
{
  "code": "VALIDATION_ERROR",
  "message": "具体校验错误"
}
```

这些客户端输入错误的 HTTP 状态均为 `400`，不会作为服务器 `500` 错误处理。
MCP Key 和注册码创建接口的请求字段全部可选，因此允许空 HTTP body；其他 JSON 写接口必须提供有效请求体。

JSON 请求体按 UTF-8 实际字节流读取，默认上限为 1 MiB；超限返回 `413 PAYLOAD_TOO_LARGE`。解析后的 JSON 最多允许 32 层嵌套、10,000 个值节点，单个文本字段最多 262,144 个字符，避免异常富文本树消耗过多验证和渲染资源。

富文本字段兼容纯字符串和 TipTap `doc` JSON；历史数据中的字符串化 `doc` 也会先执行相同校验再按原格式保存。结构化内容仅允许 `doc`、`paragraph`、`text`、`bulletList`、`orderedList`、`listItem`、`hardBreak` 节点，以及编辑器支持的文本 marks；服务端同时校验父子层级、节点/mark 属性、颜色、8–48px 字号、1–3 行高、0–8 缩进和链接协议。单个富文本树最多 16 层、2,000 个节点，每个行内节点最多 8 个不重复 marks。

富文本链接最长 2,048 字符，支持 `http`、`https`、`mailto`、`tel` 和相对路径。头像、个人主页、GitHub、项目链接、作品链接及作品图片只支持 `http`、`https` 或相对路径；`javascript:`、`data:`、`vbscript:`、`ftp:`、控制字符和声明了协议但无法解析的 URL 会返回 `400 VALIDATION_ERROR`。REST 与 MCP 写工具共用这些规则。

动态资源路径中的 `:id`、`:oauthAccountId` 必须是 UUID；公开 `:slug` 最长 50 个字符，只能包含中英文、数字、下划线和连字符。查询参数同样经过 Zod 校验，重复的单值参数、未知枚举值或超过 100 字符的后台搜索条件返回 `400 VALIDATION_ERROR`。

分页列表支持 `page`（默认 `1`，最大 `100000`）和 `page_size`（默认 `20`，最大 `100`）。为兼容已有调用方，响应体继续是 JSON 数组，分页元数据通过以下响应头返回：

| 响应头 | 含义 |
|------|------|
| `X-Page` | 当前页码 |
| `X-Page-Size` | 当前每页条数 |
| `X-Total-Count` | 符合当前筛选条件的总记录数 |
| `X-Total-Pages` | 总页数；空列表为 `0` |

当前使用稳定的 offset pagination，并在业务排序字段后追加 `id` 作为确定性排序键。适用端点为 `/api/resumes`、`/api/resumes/:id/versions`、`/api/admin/users`、`/api/admin/resumes`、`/api/admin/users/:id/resumes` 和 `/api/admin/registration-codes`。

所有 `/api/*` 响应都携带 `X-Request-ID`。入站请求中只包含字母、数字、点、下划线、冒号或连字符的 1–128 字符 ID 会被保留；其他情况由服务端生成 UUID。该 ID 同时传入 Route Handler，可用于日志和跨服务排查；它只用于关联请求，不应被视为经过认证的调用方身份。

通用错误响应保持 `{ code, message }` 格式，按 HTTP 语义使用以下稳定错误码：

| HTTP 状态 | 错误码 | 含义 |
|------|------|------|
| 400 | `VALIDATION_ERROR` / `BAD_REQUEST` | 输入结构无效 / 业务前置条件不满足 |
| 401 | `UNAUTHORIZED` | 未登录或会话无效 |
| 403 | `FORBIDDEN` / `ACCOUNT_DISABLED` | 权限不足 / 账号被禁用 |
| 404 | `NOT_FOUND` | 资源不存在或不属于当前用户 |
| 409 | `CONFLICT` | 乐观并发版本冲突 |
| 413 | `PAYLOAD_TOO_LARGE` | JSON 请求体超过字节上限 |
| 429 | `RATE_LIMITED` | 请求超过配额 |
| 500 | `INTERNAL_ERROR` | 未预期的服务端错误 |

认证流程还会返回 `OTP_REQUIRED`、`TOTP_ERROR` 等业务专用错误码。

---

## 认证相关

### POST /api/auth/register

用户注册（需要注册码）

**请求体:**
```json
{
  "username": "string (3-50 字符)",
  "password": "string (至少 10 字符)",
  "registration_code": "string"
}
```

**响应:**
```json
{
  "user": {
    "id": "uuid",
    "username": "string",
    "otp_enabled": false,
    "role": "user",
    "auth_provider": 1
  }
}
```

成功响应同时设置 HttpOnly 会话 Cookie。注册码的校验、用户/Profile 创建和一次性领取在同一事务中完成；无效、过期、禁用或已使用的注册码返回 `400 VALIDATION_ERROR`。

### POST /api/auth/login

用户登录

**请求体:**
```json
{
  "username": "string",
  "password": "string",
  "otp_code": "6 位数字，可选",
  "recovery_code": "16 位十六进制恢复码，可选"
}
```

`otp_code` 与 `recovery_code` 只能提供一个。恢复码可使用
`XXXX-XXXX-XXXX-XXXX` 或不带连字符的格式，不区分大小写。

**响应:**
```json
{
  "user": {
    "id": "uuid",
    "username": "string",
    "otp_enabled": false,
    "auth_provider": 1
  }
}
```

使用恢复码时，响应额外返回：

```json
{
  "recovery_code_used": true,
  "recovery_codes_remaining": 9
}
```

**错误码:**
- `OTP_REQUIRED` — 用户启用了 OTP，需要提供 `otp_code` 或 `recovery_code`
- `TOTP_ERROR` — OTP 验证码或恢复码无效
- `ACCOUNT_DISABLED` — 账号已被禁用

成功响应同时设置 HttpOnly 会话 Cookie，不在 JSON 中返回 JWT。

### POST /api/auth/logout

撤销当前服务端会话并清除浏览器 Cookie，成功返回 `204 No Content`。即使调用方保留了登出前的 Cookie/JWT，也不能继续访问受保护接口。

### GET /api/auth/me

获取当前登录用户信息（需认证）

**响应:**
```json
{
  "id": "uuid",
  "username": "string",
  "otp_enabled": false,
  "role": "user",
  "auth_provider": 1
}
```

### POST /api/auth/setup-otp

启用 OTP 二次验证（需认证）

**请求体:**
```json
{
  "password": "string"
}
```

**响应:**
```json
{
  "secret": "TOTP_SECRET",
  "qr_code_url": "otpauth://totp/..."
}
```

服务端只在本次设置响应中返回明文密钥；数据库保存的是通过
`TOTP_ENCRYPTION_KEY` 加密且绑定当前用户 ID 的密文。再次设置会覆盖尚未确认的
设置，但已启用 OTP 时必须先禁用。

### POST /api/auth/verify-otp

验证 OTP 并完成启用（需认证）

**请求体:**
```json
{
  "code": "6 位数字"
}
```

**响应:**
```json
{
  "success": true,
  "recovery_codes": [
    "ABCD-EF01-2345-6789"
  ]
}
```

成功时生成 10 个一次性恢复码，只在本次响应中返回明文。服务端仅保存摘要；
客户端必须立即保存。启用 OTP 会撤销该用户的全部旧会话，并为当前客户端轮换
会话 Cookie。

### POST /api/auth/recovery-codes

重新生成 OTP 恢复码（需认证、已启用 OTP）

**请求体:**
```json
{
  "password": "string",
  "code": "6 位 OTP 验证码或恢复码"
}
```

**响应:**
```json
{
  "recovery_codes": [
    "ABCD-EF01-2345-6789"
  ]
}
```

成功后全部旧恢复码立即失效，新码同样只显示一次。

### DELETE /api/auth/disable-otp

禁用 OTP 二次验证（需认证）

**请求体:**
```json
{
  "password": "string",
  "code": "6 位 OTP 验证码或恢复码"
}
```

成功后清除加密 TOTP 密钥和全部恢复码，撤销该用户的全部旧会话，并为当前
客户端轮换会话 Cookie。

### PUT /api/auth/username

修改用户名（需认证）

**请求体:**
```json
{
  "username": "string (3-50 字符)",
  "current_password": "string"
}
```

> 如果用户有密码，需要提供当前密码验证。GitHub-only 用户（无密码）可直接修改。成功后撤销该用户的全部旧会话，并为当前客户端轮换会话 Cookie。

### PUT /api/auth/password

修改密码（需认证）

**请求体:**
```json
{
  "current_password": "string | null",
  "new_password": "string (至少 10 字符)"
}
```

> GitHub-only 用户首次设置密码时，`current_password` 可省略。成功后撤销所有设备的旧会话，并为当前客户端签发新会话。

---

## GitHub OAuth

### GET /api/auth/github/start

发起 GitHub OAuth 登录/绑定

**查询参数:**
| 参数 | 说明 |
|------|------|
| `mode` | `login`（默认）、`register` 或 `bind`（绑定已有账号） |

**行为:**
- `login` / `register` 模式：已有绑定直接登录，无绑定则自动创建账号（无需注册码）
- `bind` 模式：将 GitHub 账号绑定到当前已登录的用户

### GET /api/auth/github/callback

GitHub OAuth 回调（由 GitHub 重定向，前端无需直接调用）

### GET /api/auth/oauth-accounts

获取当前用户的 OAuth 绑定列表（需认证）

**响应:**
```json
[
  {
    "id": "uuid",
    "provider": "github",
    "provider_username": "string",
    "email": "string",
    "avatar_url": "string",
    "created_at": "2026-01-01T00:00:00Z"
  }
]
```

### DELETE /api/auth/oauth-accounts/:id

解绑 OAuth 账号（需认证）

> 解绑后如果用户没有密码且无其他登录方式，需要先设置密码。

---

## 个人信息管理

### GET /api/profile

获取当前用户个人信息（需认证）

**响应:**
```json
{
  "id": "uuid",
  "basic_info": {
    "name": "string",
    "phone": "string",
    "email": "string",
    "avatar": "string",
    "job_intention": {
      "current_status": "string",
      "position": "string",
      "expected_city": "string",
      "expected_salary": "string"
    },
    "other": {
      "education_level": "string",
      "website": "string",
      "wechat": "string",
      "city": "string",
      "github": "string",
      "age": 0,
      "work_years": 0,
      "gender": "string"
    }
  },
  "education": [],
  "skills": [],
  "work_experience": [],
  "projects": [],
  "portfolio": [],
  "awards": [],
  "other_experience": [],
  "research": [],
  "summary": ""
}
```

### PUT /api/profile

更新个人信息（需认证）

**请求体:** 同 GET 响应结构

---

## 求职申请跟踪

以下接口仅支持登录用户；不提供游客、MCP、公开或后台入口。列表沿用数组响应体和
`X-Page`、`X-Page-Size`、`X-Total-Count`、`X-Total-Pages` 分页头，支持 `page`、
`page_size`（也兼容 `pageSize`）、`q`（公司/职位，最多 100 字）、`status` 和 `sort`。

### GET /api/job-applications

返回当前用户的申请列表。`sort` 默认为 `updated`，也可传 `next_action`（无日期置后）、
`applied_at`（无日期置后）或 `company`；每种排序都有稳定的更新时间或 ID 兜底。`status` 可为
`all` 或稳定英文枚举 `wishlist`、`applied`、`screening`、`interview`、`offer`、
`rejected`、`withdrawn`。

### GET /api/job-applications/summary

返回当前用户全部申请的服务端聚合：`total`、`active`、`interview`、`offer`、
`due_today`、`overdue` 和完整 `by_status` 状态计数。汇总不依赖当前分页、搜索或筛选；
待跟进和逾期仅统计仍可推进的 `wishlist`、`applied`、`screening`、`interview` 状态。

### GET /api/job-applications/actions

返回行动中心所需的服务端集合：`overdue`、`due_today`、`upcoming`（未来七天）和
`unplanned`（尚未安排下一步）。它独立于“全部申请”的分页结果，且仅包含仍可推进的申请。

### POST /api/job-applications

创建申请。`company`、`position` 必填（各最多 120 字），`status` 默认为 `wishlist`；
`job_url` 可空但只能为 http/https，`notes` 最多 5,000 字，日期始终为时区无关的
`YYYY-MM-DD` 或 `null`。
可选 `resume_id` 和 `resume_version_id`。若只提供 `resume_id`，服务端在事务中创建或复用
该用户当前简历的 `application` 快照；若提供版本，必须属于该用户及所选简历。成功返回 `201`。

### GET /api/job-applications/:id

返回当前用户的一条申请；不存在或不属于当前用户均返回 `404 NOT_FOUND`。

### PUT /api/job-applications/:id

部分更新，但必须提交正整数 `expected_revision`。服务端以用户 ID 和 revision 条件更新；
过期 revision 返回 `409 CONFLICT`，不存在或越权统一返回 `404`。状态实际变化时更新
`status_changed_at`，并在同一事务追加一条 `status_changed` 过程事件；所有成功写入递增 `revision`。

### GET/POST /api/job-applications/:id/events

返回或追加当前用户该申请的倒序活动时间线。可追加 `follow_up`、`interview`、`note`、`offer`；
事件为追加式，不会覆盖历史。面试 metadata 至少包含 `round`，可包含 `format`、`result` 等字段。
可同时传入 `next_status` 与 `next_action_at`（`null` 表示清除下一步）；当前阶段、下一步摘要、
`status_changed` 事件和本次过程事件在同一事务提交。只要更新阶段或下一步，就应传
`expected_revision` 避免并发覆盖；成功后申请 revision 递增一次。

关联错误稳定返回 `400`，不存在或越权返回 `404`，过期 revision 返回 `409`；未知存储错误会
记录服务端日志并返回通用 `500 INTERNAL_ERROR`，不会向客户端暴露异常文本。

### DELETE /api/job-applications/:id

删除当前用户的申请并返回 `204`；不存在或越权统一返回 `404`。

首版不提供提醒、拖拽看板、日历/邮件同步、JD 抓取、ATS/AI 分析或游客模式；过程时间线仅限申请所有者读取。

## 简历管理

### GET /api/resumes

获取简历列表（需认证）。支持通用分页参数。

**响应:**
```json
[
  {
    "id": "uuid",
    "name": "string",
    "is_public": false,
    "public_slug": null,
    "template": "classic",
    "preview_sections": [
      "basic_info",
      "education",
      "skills",
      "work_experience",
      "projects"
    ],
    "updated_at": "2026-06-03T00:00:00Z"
  }
]
```

列表 DTO 不包含 `content`、`modules_config`、`modules_order`、`revision` 或创建时间。`preview_sections` 只用于绘制轻量结构缩略图；需要正文、编辑版本或完整配置时调用 `GET /api/resumes/:id`。

### POST /api/resumes

创建简历（需认证）

**请求体:**
```json
{
  "name": "我的简历",
  "initialize_from_profile": true
}
```

- `initialize_from_profile`（可选，默认 `true`）：是否从当前个人信息初始化简历内容。传 `false` 创建空白简历。
- `name`：去除首尾空白后不能为空，最长 50 个字符。创建和更新接口都会在服务端校验，超限返回 `400`。

### GET /api/resumes/:id

获取简历详情（需认证）

### PUT /api/resumes/:id

更新简历（需认证）

**请求体:**
```json
{
  "name": "string",
  "revision": 3,
  "template": "classic | modern | minimal | black-white",
  "modules_config": {
    "basic_info": true,
    "education": true,
    "skills": true,
    "work_experience": true,
    "projects": true,
    "portfolio": false,
    "awards": false,
    "other_experience": false,
    "research": false,
    "summary": false
  },
  "modules_order": ["basic_info", "education", "skills", "work_experience", "projects", "portfolio", "awards", "other_experience", "research", "summary"],
  "content": {
    "basic_info": {},
    "education": [],
    "skills": [],
    "work_experience": [],
    "projects": [],
    "portfolio": [],
    "awards": [],
    "other_experience": [],
    "research": [],
    "summary": "",
    "module_titles": {
      "education": "学习经历"
    },
    "basic_info_display": {
      "avatar_left": false
    },
    "preview_config": {
      "fontSize": 14,
      "lineHeight": 1.5
    }
  }
}
```

`revision` 是推荐携带的乐观并发令牌。每次写入成功后服务端递增并返回新值；提交旧 revision 时返回 `409`，客户端应重新读取最新数据后再决定合并或覆盖。为兼容旧客户端，该字段暂时可省略。

`modules_order` 传入时必须包含全部 10 个模块且不能重复；`modules_config` 继续兼容局部更新。未识别的顶层字段会被忽略。

### DELETE /api/resumes/:id

删除简历（需认证）

### GET /api/resumes/:id/versions

获取当前用户简历的版本列表（需认证，支持通用分页）。响应只返回 `id`、
`resume_id`、`revision`、`source`、`label`、`created_at` 元数据，绝不在列表中
返回 `snapshot`。简历或版本不属于当前用户时一律返回 `404`。

### POST /api/resumes/:id/versions

创建手动版本（需认证）。`expected_revision` 必填，客户端应先完成当前编辑保存并使用
服务端返回的最新 revision；可选 `label` 为 1–100 字符：

```json
{ "expected_revision": 12, "label": "投递前" }
```

同一简历、revision 与 `manual` 来源重复提交会返回已有逻辑版本；每份简历最多
100 个手动版本，达到上限返回 `409 VERSION_LIMIT_REACHED`，不会静默删除数据。当前
revision 不匹配时返回 `409 CONFLICT`，且不会写入旧快照。

### GET /api/resumes/:id/versions/:versionId

读取单个历史版本（需认证）。这是唯一返回完整 `snapshot` 的版本接口。快照至少
包含 `name`、`template`、`modules_config`、`modules_order` 和 `content`。

### POST /api/resumes/:id/versions/:versionId/restore

恢复指定历史版本（需认证）：

```json
{ "expected_revision": 12 }
```

服务端在单个事务中校验所有权和当前 revision，覆盖快照字段并将当前简历 revision
递增，再创建 `restore` 来源快照。当前简历已变化时返回 `409 CONFLICT`；恢复绝不
让 revision 倒退，也不会恢复或改变公开状态。

### POST /api/resumes/:id/duplicate

复制简历（需认证）

### POST /api/resumes/:id/publish

公开简历（需认证）

**请求体:**
```json
{
  "slug": "my-resume"
}
```

`slug` 最长 50 个字符，只能包含中英文、数字、下划线和连字符。

### DELETE /api/resumes/:id/unpublish

取消公开（需认证）

### POST /api/resumes/:id/preview-token

为未发布简历生成临时预览链接（需认证）

**响应:**
```json
{
  "token": "signed_token",
  "expires_at": "2026-06-04T00:00:00Z",
  "preview_url": "/resume/preview?token=signed_token"
}
```

---

## 公开简历（无需认证）

### GET /api/public/:slug

获取公开简历

响应为公开 DTO，只包含 `name`、展示配置、模板、内容、公开状态和 slug；不会返回内部 `id` 或 `user_id`。

---

## MCP Key 管理

### GET /api/mcp-keys

列出当前用户的所有 MCP Key（需认证）

> 返回列表只包含 `prefix`，不包含完整 Key。

**响应:**
```json
[
  {
    "id": "uuid",
    "prefix": "ct_mcp_1a2b",
    "scope": "read_write",
    "created_at": "2026-06-01T00:00:00Z",
    "last_used_at": "2026-06-03T00:00:00Z",
    "revoked_at": null
  }
]
```

### POST /api/mcp-keys

创建新 MCP Key（需认证）

> **重要**：Secret Key 只在创建时返回一次，请立即保存。

**请求体:**
```json
{
  "scope": "read_write | read_only"
}
```

请求体可省略，`scope` 默认为 `read_write`。

**响应:**
```json
{
  "id": "uuid",
  "secret": "ct_mcp_1a2b3c4d5e6f...",
  "prefix": "ct_mcp_1a2b",
  "scope": "read_write",
  "created_at": "2026-06-01T00:00:00Z"
}
```

### DELETE /api/mcp-keys/:id

撤销 MCP Key（需认证）

撤销后的 Key 将立即失效，无法恢复。
传入 `?action=delete` 时物理删除 Key；其他 `action` 值会被拒绝，不会退化为撤销操作。

---

## MCP 服务

MCP 服务通过 `/api/mcp` 端点提供，使用 MCP (Model Context Protocol) 协议。

详细工具列表和使用说明见 [MCP 文档](MCP.md)。

---

## 后台管理（需 admin 角色）

### 用户管理

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/admin/stats` | GET | 获取系统统计信息 |
| `/api/admin/users` | GET | 用户列表 |
| `/api/admin/users/:id` | GET/DELETE | 用户详情/删除 |
| `/api/admin/users/:id/profile` | GET | 查看用户个人信息 |
| `/api/admin/users/:id/resumes` | GET | 查看用户简历列表 |
| `/api/admin/users/:id/role` | PATCH | 修改用户角色 |
| `/api/admin/users/:id/status` | PATCH | 启用/禁用用户账号 |
| `/api/admin/users/:id/oauth-accounts` | GET | 查看用户 OAuth 绑定 |
| `/api/admin/users/:id/oauth-accounts/:oauthAccountId` | DELETE | 删除用户 OAuth 绑定 |
| `/api/admin/users/batch-delete` | POST | 批量删除用户 |
| `/api/admin/users/batch-role` | POST | 批量修改角色 |

用户列表支持 `q` 模糊搜索（最多 100 个字符）和通用分页参数；指定用户简历列表也使用相同分页契约。
批量用户和简历接口的 `ids` 必须是非空字符串数组，单次最多 100 个 ID；重复 ID 会自动去重。

### 简历管理

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/admin/resumes` | GET | 简历列表（分页） |
| `/api/admin/resumes/:id` | GET/DELETE | 简历详情/删除 |
| `/api/admin/resumes/batch-delete` | POST | 批量删除简历 |

简历列表支持通用分页参数、`q` 模糊搜索和 `public=all|true|false` 公开状态筛选。

### 注册码管理

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/admin/registration-codes` | GET | 注册码列表（支持状态筛选） |
| `/api/admin/registration-codes` | POST | 生成注册码 |
| `/api/admin/registration-codes/:id` | DELETE | 删除未使用的注册码 |
| `/api/admin/registration-codes/:id/status` | PATCH | 启用/禁用注册码 |

注册码列表支持通用分页参数；`status` 支持 `all`、`unused`、`used`、`disabled` 和 `expired`。

**POST /api/admin/registration-codes 请求体:**
```json
{
  "label": "string (可选，备注)",
  "expires_at": "2026-12-31T23:59:59Z (可选)"
}
```

**响应:**
```json
{
  "id": "uuid",
  "code": "ABCD1234EFGH",
  "label": "string",
  "expires_at": "2026-12-31T23:59:59Z",
  "created_at": "2026-06-05T00:00:00Z"
}
```

> 注册码只在创建时返回一次明文，之后只存储哈希值。
