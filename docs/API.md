# API 接口文档

## 基础信息

- Base URL: `/api`（相对于当前站点根路径）
- 认证方式: Bearer Token (JWT)
- 数据格式: JSON

> **注意**：CareerTrack 是 Next.js 全栈应用，API 路由与前端部署在同一域名下，无需单独配置后端地址。

---

## 认证相关

### POST /api/auth/register

用户注册

**请求体:**
```json
{
  "username": "string (3-50 字符)",
  "password": "string (至少 6 字符)"
}
```

**响应:**
```json
{
  "token": "jwt_token",
  "user": {
    "id": "uuid",
    "username": "string",
    "otp_enabled": false,
    "role": "user"
  }
}
```

### POST /api/auth/login

用户登录

**请求体:**
```json
{
  "username": "string",
  "password": "string",
  "otp_code": "string | null"
}
```

**响应:**
```json
{
  "token": "jwt_token",
  "user": {
    "id": "uuid",
    "username": "string",
    "otp_enabled": false
  }
}
```

**错误码:**
- `OTP_REQUIRED` — 用户启用了 OTP，需要提供 `otp_code`

### GET /api/auth/me

获取当前登录用户信息（需认证）

**响应:**
```json
{
  "id": "uuid",
  "username": "string",
  "otp_enabled": false,
  "role": "user"
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

### POST /api/auth/verify-otp

验证 OTP 并完成启用（需认证）

**请求体:**
```json
{
  "code": "123456"
}
```

### DELETE /api/auth/disable-otp

禁用 OTP 二次验证（需认证）

**请求体:**
```json
{
  "password": "string",
  "code": "123456"
}
```

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

## 简历管理

### GET /api/resumes

获取简历列表（需认证）

**响应:**
```json
{
  "resumes": [
    {
      "id": "uuid",
      "name": "string",
      "is_public": false,
      "public_slug": null,
      "template": "classic",
      "created_at": "2026-05-30T00:00:00Z",
      "updated_at": "2026-06-03T00:00:00Z"
    }
  ]
}
```

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

### GET /api/resumes/:id

获取简历详情（需认证）

### PUT /api/resumes/:id

更新简历（需认证）

**请求体:**
```json
{
  "name": "string",
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
  "modules_order": ["basic_info", "education", "skills", "work_experience", "projects"],
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
    "summary": ""
  }
}
```

### DELETE /api/resumes/:id

删除简历（需认证）

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

---

## MCP 服务

MCP 服务通过 `/api/mcp` 端点提供，使用 MCP (Model Context Protocol) 协议。

详细工具列表和使用说明见 [MCP 文档](MCP.md)。

---

## 后台管理（需 admin 角色）

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/admin/stats` | GET | 获取系统统计信息 |
| `/api/admin/users` | GET | 用户列表 |
| `/api/admin/users/:id` | GET/PUT/DELETE | 用户详情/更新/删除 |
| `/api/admin/users/:id/profile` | GET | 查看用户个人信息 |
| `/api/admin/users/:id/resumes` | GET | 查看用户简历列表 |
| `/api/admin/users/:id/role` | PUT | 修改用户角色 |
| `/api/admin/users/batch-delete` | POST | 批量删除用户 |
| `/api/admin/users/batch-role` | POST | 批量修改角色 |
| `/api/admin/resumes` | GET | 简历列表（全量） |
| `/api/admin/resumes/:id` | GET/PUT/DELETE | 简历详情/更新/删除 |
| `/api/admin/resumes/batch-delete` | POST | 批量删除简历 |
