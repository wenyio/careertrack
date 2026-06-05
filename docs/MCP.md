# CareerTrack MCP 服务

CareerTrack 提供 MCP (Model Context Protocol) 服务，允许 AI Agent 通过标准化协议查询和修改用户的个人信息及简历数据。

## 目录

- [快速开始](#快速开始)
- [创建 MCP Key](#创建-mcp-key)
- [客户端接入](#客户端接入)
- [工具列表](#工具列表)
- [数据校验规则](#数据校验规则)
- [限制与安全说明](#限制与安全说明)

## 快速开始

1. 登录 CareerTrack 获取 JWT Token
2. 调用 API 创建 MCP Key
3. 使用 MCP Key 连接 MCP 服务
4. 调用工具查询/修改数据

## 创建 MCP Key

### 创建 Key

```bash
curl -X POST https://your-domain.com/api/mcp-keys \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{"scope": "read_write"}'
```

响应示例：

```json
{
  "id": "uuid",
  "secret": "ct_mcp_1a2b3c4d5e6f...",
  "prefix": "ct_mcp_1a2b",
  "scope": "read_write",
  "created_at": "2025-01-01T00:00:00Z",
  "message": "请妥善保存 Secret Key，此密钥只会显示一次"
}
```

> **重要**：Secret Key 只在创建时返回一次，请立即保存。之后只能看到 prefix，无法再次获取完整 Key。

### 查看已有 Key

```bash
curl https://your-domain.com/api/mcp-keys \
  -H "Authorization: Bearer <your-jwt-token>"
```

返回的列表只包含 `prefix`，不包含完整 Key。

### 撤销 Key

```bash
curl -X DELETE https://your-domain.com/api/mcp-keys/<key-id> \
  -H "Authorization: Bearer <your-jwt-token>"
```

撤销后的 Key 将立即失效，无法恢复。

## 客户端接入

### MCP 配置示例（Claude Desktop / Claude Code）

在 MCP 客户端配置文件中添加：

```json
{
  "mcpServers": {
    "careertrack": {
      "url": "https://your-domain.com/api/mcp",
      "headers": {
        "Authorization": "Bearer ct_mcp_1a2b3c4d5e6f..."
      }
    }
  }
}
```

### HTTP 请求示例

**POST 请求（推荐，JSON 响应）：**

```bash
curl -X POST https://your-domain.com/api/mcp \
  -H "Authorization: Bearer ct_mcp_1a2b3c4d5e6f..." \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "resume_list",
      "arguments": {}
    }
  }'
```

**也可以使用 X-API-Key 头：**

```bash
curl -X POST https://your-domain.com/api/mcp \
  -H "X-API-Key: ct_mcp_1a2b3c4d5e6f..." \
  -H "Content-Type: application/json" \
  -d '...'
```

### MCP 协议初始化

首次连接需要发送 `initialize` 请求：

```json
{
  "jsonrpc": "2.0",
  "id": 0,
  "method": "initialize",
  "params": {
    "protocolVersion": "2025-03-26",
    "capabilities": {},
    "clientInfo": { "name": "my-agent", "version": "1.0.0" }
  }
}
```

## 工具列表

### 元数据工具

| 工具名 | 说明 |
|--------|------|
| `schema_get` | 获取数据结构定义（模块类型、模板列表、字段配置等） |

### 个人信息工具

| 工具名 | 说明 |
|--------|------|
| `profile_get` | 获取当前用户的完整个人信息 |
| `profile_update` | 局部更新 basic_info 和 summary |
| `profile_add_entry` | 向数组字段添加新条目（教育、工作经历等） |
| `profile_update_entry` | 更新数组字段中的某个条目（按 id，局部 merge） |
| `profile_delete_entry` | 删除数组字段中的某个条目 |
| `profile_update_rich_text` | 更新数组条目的富文本字段（支持 plainText/doc） |

### 简历查询工具

| 工具名 | 说明 |
|--------|------|
| `resume_list` | 获取所有简历列表（含公开链接） |
| `resume_get` | 获取指定简历的完整详情（含公开链接） |
| `resume_preview_get` | 获取简历预览数据和预览链接（已发布返回公开链接，未发布返回签名临时 URL） |

### 简历创建工具

| 工具名 | 说明 |
|--------|------|
| `resume_create` | 创建新简历（支持 `name` 和 `initialize_from_profile` 参数，默认从个人信息初始化） |

### 简历编辑工具

| 工具名 | 说明 |
|--------|------|
| `resume_patch_content` | 局部更新简历内容（支持 deep merge） |
| `resume_update_metadata` | 更新简历名称或模板 |
| `resume_update_rich_text_field` | 更新富文本字段（支持 plainText/doc 模式） |
| `resume_reorder_modules` | 重新排列模块显示顺序 |
| `resume_toggle_module` | 启用/禁用某个模块 |
| `resume_update_preview_config` | 更新预览字号和行距 |
| `resume_rename_module` | 设置模块自定义标题 |

### 简历发布工具

| 工具名 | 说明 |
|--------|------|
| `resume_publish` | 发布简历，设置公开链接（slug） |
| `resume_unpublish` | 取消发布简历，移除公开链接 |

## 数据校验规则

### 模块类型 (ResumeModuleType)

合法值：`basic_info`、`education`、`skills`、`work_experience`、`projects`、`portfolio`、`awards`、`other_experience`、`research`、`summary`

### 模板 ID

合法值：`classic`、`modern`、`minimal`、`black-white`

### 模块顺序

- 必须包含所有 10 个合法模块
- 不能有重复
- `basic_info` 不能被禁用

### 预览配置

- `fontSize`：可选值 12、14、16、18、20
- `lineHeight`：范围 1-3（含小数）

### 富文本字段

支持两种输入模式：

**plainText 模式**（默认）：传入纯文本字符串，自动转换为 TipTap doc JSON。换行符会分隔为段落。

**doc 模式**：直接传入 TipTap doc JSON。只允许以下节点类型：
- `doc`、`paragraph`、`text`、`bulletList`、`orderedList`、`listItem`、`hardBreak`

只允许以下 mark 类型：
- `bold`、`italic`、`underline`、`code`、`strike`、`link`、`textStyle`

## 限制与安全说明

### 鉴权

- 所有 MCP 请求必须携带有效的 MCP Key
- 支持 `Authorization: Bearer <key>` 和 `X-API-Key: <key>` 两种方式
- 已撤销的 Key 立即失效
- Key 只在创建时返回一次明文，数据库只存储 hash

### 权限隔离

- 每个 Key 绑定创建时的用户
- 只能访问该用户自己的数据
- resumeId 必须属于当前 Key 对应的用户

### 导出限制

- 当前版本不支持通过 MCP 导出 PDF/图片
- 如需导出，请使用 Web 界面

### 速率限制

- 当前版本无额外速率限制（依赖基础架构层的限制）
- 建议 Agent 合理控制调用频率

### 数据安全

- MCP Key 使用 SHA-256 哈希存储
- Key 前缀（12 字符）可用于识别，但不足以伪造
- 撤销操作不可逆
- 建议定期轮换 Key
