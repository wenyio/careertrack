# CareerTrack 项目完整评估

> 评估日期：2026-07-29
> 基线：`main` / `419f663`
> 评估范围：产品边界、前后端代码、认证与授权、MCP、数据模型、测试、构建、部署、性能、可访问性、新功能路线
> 文档性质：保留初始评估证据，并持续记录 v1.0.3 整改进度

## 1. 结论先行

CareerTrack 已经不是原型，而是一个功能覆盖较完整的 1.0 全栈产品：简历编辑、模板、公开分享、SEO/OG、PDF 打印、游客模式、账号体系、GitHub OAuth、TOTP、后台管理、SQLite/PostgreSQL、自托管和 MCP 均已形成闭环。

评估基线当时仍属于“功能完成度高、生产工程底座尚未收紧”的阶段，核心风险集中在公开页注入、MCP 权限、默认密钥、会话存储、并发写入、事务、迁移和测试可信度。该结论触发了 v1.0.3 整改；截至本报告最新状态，全部 P0 已关闭并通过回归验证。

以下评分保留为整改前基线，便于后续对比，不代表 v1.0.3 当前状态：

| 维度 | 评分 | 判断 |
| --- | ---: | --- |
| 产品完整度 | 8/10 | 核心简历工作流完整，功能密度高 |
| 架构与可维护性 | 6/10 | 单体架构合理，但大组件、重复配置和副作用开始积累 |
| 安全性 | 4/10 | 有基础鉴权和所有权校验，但存在可利用的高风险缺口 |
| 数据一致性 | 5/10 | CRUD 完整，但缺少事务、版本控制和正式迁移体系 |
| 测试与交付 | 5/10 | 单测基础不错；lint、E2E、依赖审计和 CI 尚未形成可靠门禁 |
| 部署与运维 | 4/10 | 有 standalone/Docker/双数据库，但默认配置和初始化流程风险较高 |
| 性能与规模化 | 6/10 | 当前规模可用；列表、构建追踪、缓存和同步 SQLite 会限制增长 |
| 可访问性 | 4/10 | 视觉功能完整，语义化、键盘操作和自动化可访问性测试不足 |

### 1.1 v1.0.3 整改进展

用户确认按建议实施后，本报告中的 P0 已于同日完成代码整改。下表是当前状态；后续各问题章节保留发现时证据，作为决策记录，不再代表现行实现。

| 编号 | 状态 | v1.0.3 处理结果 |
| --- | --- | --- |
| SEC-01 | 已关闭 | JSON-LD 使用统一安全序列化器，转义 HTML 敏感字符并增加 `</script>` 回归测试；公开 API 改用最小 DTO |
| MCP-01 | 已关闭 | `read_only` 只注册 5 个读取工具；Key 鉴权关联未禁用用户；增加 scope 契约测试 |
| AUTH-01 | 已关闭 | `start.sh` 删除默认 JWT 密钥，生产强制不少于 32 字符并拒绝已知弱值 |
| AUTH-02 | 已关闭 | 浏览器改用 HttpOnly Cookie，移除 localStorage token；服务端仅登记 JWT 摘要并支持登出、改密、改名、禁用即时撤销；GitHub 绑定回调校验实时会话与 state 用户归属；关键入口限流；密码最小 10 位 |
| AUTH-03 | 主体已关闭 | TOTP secret 改为用户绑定的 AES-256-GCM 密文；增加 10 个一次性恢复码、原子消费、再生成和启禁用会话轮换；可信代理/canonical origin 仍需结合真实部署确认 |
| DATA-01 | 已关闭 | SQLite/PostgreSQL 新增事务；SQLite 进程内写事务串行化，避免 async 回调与同步 busy wait 互锁；注册、注册码原子领取及 GitHub 首次注册纳入事务；注册码哈希唯一 |
| DATA-02 | 已关闭 | 简历引入 `revision` 条件写入和 409 冲突；自动保存改为单飞串行队列 |
| OPS-01 | 已关闭 | Docker 数据固定为 `/data/careertrack.db`，修复 UID 1001 权限，声明 volume 与健康检查 |
| SCALE-01 | 已关闭 | 5 个 REST 列表接入有界服务端分页；个人简历改为无正文摘要 DTO；MCP 限制 100 份；补稳定排序与索引 |

同期完成的 P1 基础项：

- 增加 `schema_migrations` 及顺序向前迁移，构建阶段不再访问数据库；
- 修复公开页 SSR 404 和动态 sitemap，收紧 standalone 文件追踪；
- 增加安全响应头、数据库健康检查和专项安全冒烟脚本；
- 全部 19 个 JSON 写接口接入共享 JSON/Zod 运行时校验，非法输入统一返回 400；
- 全部 18 个动态 API 路由和 8 组查询参数接入共享校验，通用错误码按 HTTP 语义收敛；
- JSON 请求体增加 1 MiB 流式字节上限和结构复杂度预算，全部 API 响应增加 request ID；
- REST 与 MCP 共用富文本节点/mark/样式语义校验及 URL 协议白名单；
- ESLint 已清零；TOTP 密钥、恢复码和并发消费已加入单元与真实认证链路回归；
- Playwright 改用隔离 SQLite 测试库、独立测试密钥和稳定测试 IP，修复本机环境与限流对回归的污染；
- GitHub Actions 增加静态质量、PostgreSQL 15 集成和 Chromium 三个并行门禁；
- PostgreSQL 集成脚本使用随机子数据库验证自动建库、迁移、事务、JSONB、
  revision 和 TOTP，结束后仅删除生成的测试库；
- 迁移 004 将 PostgreSQL 历史简历配置列归并到 `content`，恢复双驱动 Schema 一致性；
- 简历名称创建/更新统一增加 50 字符服务端校验，补齐简历卡片和富文本工具栏的关键可访问名称；
- 文档已同步到 v1.0.3。

仍未关闭、不得被本轮改动掩盖的重点包括：`TOTP_ENCRYPTION_KEY`
在线轮换、多实例共享限流、PostgreSQL 门禁首次 CI 实跑、依赖审计/SBOM、
超大数据集 cursor pagination 以及系统性可访问性审计。这些继续按本文 P1/P2
路线推进。其中 Redis 共享限流与 `audit_logs` 已按用户决定暂缓，不计入近期
重构迭代，但状态仍是“未关闭”。

### 1.2 v1.0.3 最终验收

| 检查 | 最终结果 | 说明 |
| --- | --- | --- |
| `npm run lint` | 通过 | ESLint 无 error、无 warning |
| `npm run test:unit` | 通过 | 28 个测试文件、204 项测试通过；含 Profile 并发条件更新/SQLite 方言、MCP 工具清单、编辑器 selector 隔离、初始化/预览配置、Canvas 编码、密钥加解密、恢复码、原子消费和旧库迁移 |
| `npm run build` | 通过 | Next.js 生产编译、类型检查和 43 个静态页面生成通过；构建阶段未访问数据库 |
| `npm run test:security-smoke` | 通过 | 8 项：HttpOnly 会话、TOTP 恢复码、注册码并发、revision 冲突、公开 DTO、JSON-LD XSS、禁用用户 MCP、服务端会话撤销 |
| `npx playwright test --workers=1` | 通过 | Chromium 全量 116/116；含关键键盘交互、编辑器性能预算、预览配置保存/重载、OTP 设置、列表分页/轻量 DTO、公开 A4 分页、证件照格式切换和 Profile/Resume 隔离 |
| `npm run test:postgres` | 待 CI 实跑 | 隔离脚本和 PostgreSQL 15 service 门禁已实现；当前开发机没有 PostgreSQL/Docker 运行时，不能把静态检查冒充真实通过 |
| `.github/workflows/ci.yml` | 静态通过 | YAML 解析通过；quality、postgres、browser 三作业将在 push/PR 首次执行 |
| `git diff --check` | 通过 | 无尾随空格或补丁格式错误 |

本轮已达到“单实例受控部署/试运行”的发布质量。首次 CI 的 PostgreSQL 与
browser 作业通过后，可把自动化门禁视为正式闭环；若进入多实例公网部署，仍应
先完成共享限流和备份恢复演练。

## 2. 本次评估方法

本次覆盖了约 3 万行 TypeScript/JavaScript 源码和测试代码，并执行了：

- 仓库、依赖、目录、路由、数据模型和部署资产盘点；
- 认证授权、公开简历、富文本、MCP、管理后台和双数据库实现的静态审查；
- 单元测试、ESLint、生产构建和隔离 E2E 验证；
- 构建产物、字体资产、standalone 文件追踪和代码体量检查；
- 产品定位与后续功能依赖分析。

优先级定义：

- **P0**：可能导致账号/数据被越权操作、代码执行、密钥失守、数据损坏或默认部署不可用，应立即修复；
- **P1**：会显著影响可靠性、隐私、规模化或交付质量，应进入最近一个版本；
- **P2**：主要影响性能、可维护性、体验或长期研发速度，可在基础稳定后持续治理。

## 3. 做得好的部分

1. 当前阶段选择 Next.js 全栈单体是合适的。页面、API、SEO、OG 和自托管可以共享类型与部署单元，没有过早拆分服务。
2. 简历服务中的用户所有权约束整体一致，越权读取在隔离 E2E 中返回 404；普通 JWT 请求也会重新检查用户是否被禁用。
3. 富文本展示采用节点白名单、文本转义和 URL 校验，而不是直接输出编辑器 HTML。这里的设计明显优于常见的 `dangerouslySetInnerHTML` 直出方案。
4. 管理员权限从数据库中的当前用户状态读取，不完全依赖 JWT 内旧角色字段。
5. SQLite/PostgreSQL 适配器对自托管友好；游客模式、模板系统和公开页面使产品从首次访问到分享有完整路径。
6. 已有 131 个可通过的单元测试，说明核心工具函数并非完全依赖手工验证。
7. 公开简历的 metadata、JSON-LD、OG 图和 sitemap 体现出产品化意识，MCP 也已经具备较完整的工具集合。

## 4. P0：立即处理

### SEC-01：公开简历 JSON-LD 存在存储型 XSS

**证据**

- [`src/app/resume/[slug]/page.tsx`](../src/app/resume/%5Bslug%5D/page.tsx#L128-L136) 将 `JSON.stringify(jsonLd)` 直接写入 `script` 的 `dangerouslySetInnerHTML`。
- [`src/utils/seo.ts`](../src/utils/seo.ts#L282-L363) 生成的 JSON-LD 包含姓名、学校、公司、技能等用户可编辑内容。

`JSON.stringify` 不会把 `<` 转义为 JSON Unicode 序列。若字段包含 `</script><script>...</script>`，HTML 解析器会提前结束 JSON-LD 标签并执行后续脚本。现有 E2E 只测试了 `<img onerror>`，没有覆盖 `</script>` 逃逸，因此不能证明该路径安全。

**影响**

攻击者可以发布恶意简历链接，在访问者域内执行脚本；结合当前 token 存放方式，登录用户访问恶意公开简历时可能泄露会话。

**建议**

- 使用唯一的安全 JSON-LD 序列化器，至少将 `<` 替换为 `\u003c`，同时考虑 `>`、`&`、U+2028/U+2029；
- 增加包含 `</script><script>window.__xss=1</script>` 的服务端渲染回归测试；
- 上线 CSP，并避免让 CSP 成为唯一防线。

### MCP-01：`read_only` scope 未被执行，禁用用户的 MCP Key 仍可使用

**证据**

- [`src/lib/services/mcp-key.ts`](../src/lib/services/mcp-key.ts#L53-L66) 保存 scope，[同文件](../src/lib/services/mcp-key.ts#L83-L104) 验证后也返回完整记录。
- [`src/app/api/mcp/route.ts`](../src/app/api/mcp/route.ts#L32-L52) 随即丢弃 scope，只把 `user_id` 传给 MCP Server。
- [`src/lib/mcp/server.ts`](../src/lib/mcp/server.ts#L45-L80) 创建的 Server 共注册 20 个工具，其中包含更新、删除、发布和取消发布等写操作。
- MCP Key 验证只检查 hash 与 `revoked_at`，没有检查关联用户的 `disabled_at`。

**影响**

被标记为只读的 Key 实际可以修改或删除数据；账号被后台禁用后，已有 MCP Key 仍可能继续工作。这是明确的授权边界失效。

**建议**

- 将 MCP 上下文改为 `{ userId, scope, userStatus }`；
- 对每个工具声明 capability，统一拦截写工具，而不是在各 handler 中分散判断；
- MCP 鉴权查询关联用户状态；
- 增加“只读 Key 调用所有写工具均返回授权错误”和“禁用用户旧 Key 失效”的契约测试。

### AUTH-01：启动脚本绕过了生产 JWT 密钥的 fail-fast

**证据**

- [`src/lib/auth.ts`](../src/lib/auth.ts#L17-L27) 正确地要求生产环境必须设置 `JWT_SECRET`。
- [`start.sh`](../start.sh#L53-L55) 却在缺失时自动设为公开且固定的 `change-me-in-production`。
- `.env.example` 使用同一个示例值，复制后很容易遗漏替换。

**影响**

使用默认脚本部署且未覆写环境变量时，任何知道仓库的人都能伪造 JWT。应用层的“缺失即拒绝启动”实际上不会触发。

**建议**

- 删除生产默认值，未设置时直接退出；
- 对密钥长度和弱值黑名单做启动校验；
- 轮换所有可能使用过默认值的线上密钥，并使旧 token 失效；
- `start.sh` 的默认数据库与 README 所述的 SQLite 默认保持一致。

### AUTH-02：会话 token 暴露给 JavaScript，且缺少登录防爆破

**证据**

- [`src/stores/useAuthStore.ts`](../src/stores/useAuthStore.ts#L23-L69) 把 token 持久化到 `localStorage`。
- 登录、注册和 OAuth 回调页面还通过 `document.cookie` 写入 token；该 cookie 不是 HttpOnly，且配置不统一。
- 登录、TOTP、注册、OAuth 和 MCP 入口未发现速率限制、账号退避或 IP 级防护。
- 密码最小长度仅 6 位。

**影响**

任一 XSS 都能读取并外传 token；登录和 TOTP 可被持续枚举或爆破。JWT 有效期、cookie 生命周期和撤销能力也不一致。

**建议**

- 优先迁移为 `HttpOnly + Secure + SameSite` 的服务端 session/refresh cookie；
- access token 仅存内存，或直接采用可撤销的服务端 session；
- 为登录、注册、验证码、TOTP、OAuth callback 和 MCP 增加 IP/账号双维度限流与渐进退避；
- 提升密码策略，支持已泄露密码筛查；
- 增加 session/token version，使改密、禁用、权限变更可立即撤销旧会话。

### DATA-01：注册、注册码和 OAuth 创建流程缺少事务

**证据**

- 注册流程依次校验注册码、创建用户、创建 profile、标记注册码已用，各步骤是独立查询。
- 注册码的“已使用”更新没有使用 `WHERE used_at IS NULL` 的原子条件。
- SQLite/PostgreSQL schema 中 `code_hash` 只有普通索引，没有唯一约束。
- GitHub OAuth 首次用户、profile、绑定记录的创建也由多条独立语句组成。

**影响**

并发请求可能重复消费一次性注册码；任一步骤失败都可能留下半完成用户或孤立绑定。文档所称的“一次性”与数据库约束并不一致。

**建议**

- 为存储层提供正式 transaction 接口；
- 用条件更新或行锁原子领取注册码，并为 `code_hash` 建唯一约束；
- 注册和 OAuth 首次绑定全部纳入事务；
- 增加并发注册测试和故障注入测试。

### DATA-02：自动保存存在旧请求覆盖新内容的竞态

**证据**

- [`src/hooks/useAutoSave.ts`](../src/hooks/useAutoSave.ts#L38-L80) 只做 debounce，没有串行队列、取消、revision 或响应顺序校验。
- 手动保存可以与仍在途的自动保存重叠。
- 服务端 update、profile 条目读改写和 MCP patch 均没有 revision/ETag 前置条件。

**影响**

网络抖动时，较早发出的请求可能较晚到达并覆盖用户的新编辑；多标签页、浏览器与 MCP 同时修改时风险更高。

**建议**

- 为简历引入递增 `revision`；
- 更新时使用 `WHERE id = ? AND revision = ?`，冲突返回 409；
- 客户端使用单飞/串行保存队列，仅提交最新快照；
- 离开页面前 flush，并为冲突提供比较、恢复和重试；
- 该基础设施直接复用到“版本历史”功能。

### OPS-01：默认 SQLite Docker 数据目录没有明确创建与授权

**证据**

- [`Dockerfile`](../Dockerfile#L33-L48) 以 root 复制 `/app` 后直接切换到 `nextjs`。
- SQLite 默认会在工作目录创建 `.careertrack`，Dockerfile 没有创建并 `chown` 该目录，也没有设置独立数据目录。

**影响**

默认 SQLite 容器可能因目录权限失败；挂载匿名或宿主卷后也可能出现 UID 所有权问题。

**建议**

- 使用明确的 `/data/careertrack.db`；
- 构建镜像时创建 `/data` 并赋予 UID 1001；
- 文档化 volume、备份和恢复流程；
- 增加容器 healthcheck，以及 SQLite/PostgreSQL 两种 compose 冒烟测试。

## 5. P1：最近一个版本处理

### API-01：REST API 缺少统一运行时输入校验

项目已经依赖 Zod，但主要用于 MCP。REST route 多数直接消费 `request.json()`：缺少字段长度、枚举、数组形状、slug 规则、批量上限和 body 大小限制。部分错误响应还会直接带出底层错误文本。

**v1.0.3 整改状态：主体已关闭。** 目前 19 个 JSON 写接口、18 个动态 API 路由和 8 组查询参数均通过共享解析器和按领域拆分的 Zod schema 校验，覆盖 auth、profile、resume、publish、MCP Key、OAuth、注册码、分页和后台筛选/批量操作；损坏 JSON、非法 UUID/slug/枚举、重复查询参数、超大或结构异常 JSON 均有单元和真实接口 E2E。REST 与 MCP 现已共用 TipTap 节点层级、mark/样式属性、富文本预算和外链协议白名单；通用错误 envelope 已按 HTTP 语义使用稳定错误码，全部 API 响应携带 request ID，后续只需继续细化少数业务专用码。

建议建立共享 schema 层，覆盖：

- auth、profile、resume、publish、admin 和 OAuth 输入；
- `template`、`modules_order`、富文本节点、URL、slug 和分页参数；
- 最大简历大小、批量操作数量、头像/外链限制；
- 稳定错误码、统一错误 envelope、request ID，生产环境不返回数据库细节。

### DB-01：没有版本化迁移体系，双数据库 schema 已经漂移（主体已关闭）

当前依赖 `CREATE TABLE IF NOT EXISTS` 初始化，没有 migration version、ALTER 或回滚策略。已有安装无法自动获得后续字段与约束。

同时 PostgreSQL 存在 `module_titles`、`basic_info_display`、`preview_config` 独立列，而应用又把这些内容存入 `content`；SQLite 没有对应列，业务代码也没有稳定使用这些 PostgreSQL 列。

建议：

- 引入 `schema_migrations` 和顺序迁移；
- 每次迁移在事务中执行，并提供向前升级与备份说明；
- 明确配置的唯一存储位置，删除死列或补齐两端；
- CI 同时跑 SQLite 与 PostgreSQL schema/服务集成测试。

**整改状态（2026-07-30）：主体已关闭。** `schema_migrations` 已包含 001～004；
迁移 004 在不覆盖 `content` 现有键的前提下归并 PostgreSQL 三个历史 JSONB
配置列并删列，新建 Schema 不再创建冗余列。CI 已配置 PostgreSQL 15 服务，
隔离脚本覆盖自动建库、迁移、注册码事务、JSONB/revision 和 TOTP 恢复码。
当前仅剩首次远端 CI 实跑确认，不能因本机缺少 PostgreSQL 运行时提前标记通过。

### OPS-02：模块导入和生产构建会访问并初始化数据库

[`src/lib/storage/index.ts`](../src/lib/storage/index.ts#L22-L26) 在模块导入时 fire-and-forget 调用 `ensureAdmin(query)`。本次 `npm run build` 在静态生成期间实际连接了当前环境数据库，并重复输出 9 次 schema 初始化日志。

这会导致：

- 构建依赖运行时数据库；
- CI/build 可能产生外部状态变更；
- 初始化错误无法被可靠等待和处理；
- 多 worker 重复初始化。

建议把初始化迁到显式启动阶段或受保护的单例 initializer，构建时禁止数据库连接；管理员 bootstrap 使用一次性命令或受控启动步骤。

### SEO-01：公开页 404 被吞掉，sitemap 更新策略与实现不一致

[`src/app/resume/[slug]/page.tsx`](../src/app/resume/%5Bslug%5D/page.tsx#L103-L126) 在 `try` 内调用 `notFound()`，随后用宽泛 `catch` 吞掉 Next.js 的控制流异常，可能让不存在页面以客户端空状态和错误 HTTP 语义返回。

构建结果把 `/sitemap.xml` 标为静态，但其目标数据是随发布状态变化的数据库记录；代码注释与实际缓存策略不一致，而且查询没有分页/上限。

建议：

- 不要捕获 `notFound()`，或只捕获明确的数据库错误并重新抛出 Next 控制流异常；
- 对公开查询做 request memoization，避免 metadata 与 page 重复查库；
- 明确 sitemap 的 `dynamic`/`revalidate` 策略，并分页生成大站点 sitemap。

### OPS-03：standalone 文件追踪异常膨胀

本地 `.next` 约 5.4 GB，其中 `.next/standalone` 约 77 MB。构建警告指出 SQLite 动态路径 `resolve(process.env.SQLITE_DB_PATH || ...)` 使文件追踪范围扩大；standalone 中包含测试、文档、报告、日志和截图等非运行时资产。

建议：

- 避免把动态数据库路径参与模块级文件追踪；
- 配置 `outputFileTracingExcludes`，排除测试、docs、screenshots、reports、logs；
- 在干净工作树/容器上下文中构建，并增加镜像大小门禁；
- 检查 13 MB 的 `public` 字体：当前完整 Noto Sans SC TTF 与多个 WOFF/分片并存，统一字体策略和子集。

### SCALE-01：列表接口无分页，并返回过重内容（已关闭）

简历列表为生成卡片预览返回每份简历的完整 `content`、模块配置和顺序。管理员用户、简历和注册码列表也未见可靠分页。

建议：

- 使用 cursor pagination；
- 列表接口只返回 summary、更新时间、状态和预生成 thumbnail；
- 详情按需加载；
- 管理后台增加搜索条件与相应索引；
- 对 sitemap、批量操作、MCP list 同样设置上限。

落实（2026-07-30）：

- `/api/resumes`、后台用户、后台简历、指定用户简历和注册码列表统一接入 `page/page_size`，默认每页 20、最大 100；
- 为避免破坏已有 API 调用方，响应体继续使用数组，分页元数据放入 `X-Page`、`X-Page-Size`、`X-Total-Count` 和 `X-Total-Pages`；
- 个人简历列表 SQL 不再读取 `content`，响应只包含身份、公开状态、模板、更新时间和 `preview_sections`；卡片先用结构摘要缩略图，接近视口后按需读取单份详情并替换为真实 A4 缩略图；
- 后台 Ant Design 表格由浏览器内分页切换为服务端受控分页，筛选变化重置页码；
- MCP `resume_list` 限制最近更新的 100 份，完整内容继续由 `resume_get` 按需读取；
- 增加用户创建时间、简历用户/更新时间和注册码创建时间索引，排序追加 `id` 保证同时间记录顺序稳定。

当前采用 offset pagination 以兼容后台总数跳页和既有表格交互。进入百万级记录或高频并发写入场景前，应升级为 cursor pagination；这属于后续规模化增强，不再阻塞当前单实例受控部署。

### AUTH-03：认证硬化主体已关闭

- JWT 约 24 小时，但客户端 cookie 曾设置为 7 天，生命周期不一致；
- 改密和角色变化没有可靠撤销已签发 JWT；
- TOTP secret 明文存储且没有恢复码；
- OAuth 回调基于代理头拼接地址，需要明确可信代理与 canonical origin；
- 简历预览 token 存在固定 fallback secret，签名比较未使用 timing-safe compare；
- `next.config.ts` 未设置 CSP、HSTS、`X-Content-Type-Options`、Referrer-Policy、Permissions-Policy 等安全头。

这些应与 AUTH-02 一起形成统一的 session/security hardening 任务，而不是零散补丁。

**整改状态（2026-07-30）：主体已关闭。** JWT/Cookie 生命周期与服务端会话
现已统一，改密、改名、禁用账号以及启用/禁用 OTP 均可撤销旧会话；预览签名
和安全响应头已收紧。TOTP secret 使用独立主密钥派生的 AES-256-GCM 密钥加密，
AAD 绑定用户 ID，迁移 003 会加密旧库明文；恢复码只存 HMAC 摘要，同一码通过
条件更新最多消费一次，支持重新生成并使旧码全部失效。当前剩余项是结合真实
反向代理拓扑固定 OAuth canonical origin，以及为加密主密钥提供不中断的在线
轮换/keyring 机制。

### TEST-01：测试门禁当前不能代表“可发布”（整改前基线）

初始评估结果如下；现行验收结果见 1.2，本表仅保留为整改证据：

| 检查 | 结果 | 说明 |
| --- | --- | --- |
| `npm run test:unit` | 通过 | 9 个文件、131 项测试通过 |
| `npm run build` | 通过 | 编译与类型检查通过；但构建访问了数据库并出现文件追踪警告 |
| `npm run lint` | 失败 | 6 个 error、9 个 warning；6 个 error 均为 React 19 `set-state-in-effect` |
| E2E 收集 | 失败 | `guest-mode.spec.ts` 从未安装的 `@playwright/test` 导入，其余 JS 用 `playwright/test` |
| E2E 全量抽样 | 不稳定 | JS 套件共 91 项；运行到 15 通过、11 失败、1 中断、64 未运行后停止，主要受注册 UI 已改为两步但 helper 仍按旧表单操作影响 |
| 安全 E2E 定向 | 12/14 通过 | 一项确认公开 API 暴露内部 resume ID；一项因仍等待旧的客户端 public API 请求而超时 |
| `npm audit --omit=dev` | 未完成 | 受当前沙箱网络/审批限制，不能访问 npm registry |

建议：

- 先修复 lint，使 lint、unit、build 成为最小 PR 门禁；
- 统一 Playwright 包导入；
- 重写两步注册 helper，并让 E2E 与 SSR 数据路径同步；
- 测试数据库路径不得硬编码仓库 `.careertrack/careertrack.db`，每次运行使用临时独立库；
- 将安全用例拆成 API 契约测试与浏览器 XSS 测试；
- 补充并发、迁移、MCP scope、Docker、PostgreSQL 和 accessibility 测试；
- 增加 CI；本次仓库中未发现 `.github` workflow。

**现行状态：** 上述 lint、unit、build、SQLite 安全冒烟、Chromium 全量 E2E
已经恢复并形成 `.github/workflows/ci.yml`；PostgreSQL 作业也已接入。依赖审计
尚未加入门禁，因为当前环境未获授权向 registry advisory 接口提交依赖清单，
后续应在确认披露策略后独立接入。

### PRIV-01：公开 API 暴露内部简历 ID，公开字段缺少细粒度隐私模型

隔离安全 E2E 确认 `/api/public/:slug` 没有暴露 `user_id`，但仍返回内部 `resume.id`。单独的 UUID 暴露通常不是直接越权，不过没有业务需要时不应暴露内部标识。

公开 SEO 数据还可能包含头像外链、城市、学校、公司等信息。当前“是否公开”只有整份简历级别，缺少字段级可见性、`noindex`、到期时间和访问口令。

建议创建专用 PublicResume DTO 白名单，并把隐私控制纳入下一个产品版本。

### ADMIN-01：高风险后台操作缺少审计与恢复

禁用用户、删除用户/简历、注册码管理等操作没有完整审计日志、操作者、来源 IP、原因和变更前后值；删除也缺少统一软删除/恢复窗口。

建议先加 append-only audit log，再扩展批量操作；重要删除使用软删除、二次确认和可恢复期限。

## 6. P2：持续优化

### 6.1 前端与状态管理

- 公开简历 Client 已按数据加载、A4 测量/分页和滑动职责拆分；MCP 入口已按
  schema/profile/resume 领域拆分；`RichTextToolbar` 已将自带状态的字号、行高、
  颜色、链接和对齐控件与命令布局分离；
- 多处直接订阅整个 Zustand store，编辑时容易扩大重渲染范围；改用 selector 与 shallow compare；
- 默认模块配置在 config 与 type 文件中重复，建立唯一来源；
- 表单、模块标题和模板设置可以继续配置驱动，减少同类字段逻辑复制；
- 统一 mutation 错误、toast、loading 和 retry 行为。

### 6.2 数据访问与后端

- SQLite 适配器用正则翻译 PostgreSQL SQL，长期容易在复杂 SQL、RETURNING、布尔值和时间函数上产生边界差异；
- `better-sqlite3` 是同步调用，高并发时会阻塞 Node event loop；至少开启 WAL、busy timeout，并明确单实例边界；
- PostgreSQL 正常初始化已收敛为单一应用 Pool；仅标准 `3D000` 缺库路径使用
  一条短生命周期 maintenance Client，仍需首次 CI 实跑确认；
- profile 的“查不到就创建”已改为幂等冲突忽略插入；
- MCP profile 条目和嵌套基本信息 patch 已使用旧 JSON 条件更新并有限重试，
  SQLite/PostgreSQL 共用语义；REST 整表保存仍由调用方负责避免多窗口覆盖。

### 6.3 可访问性

导航和工具栏中存在可点击的 `div`/`span`，没有完整的键盘行为、语义和焦点样式。拖拽排序也需要键盘替代路径。

**v1.0.3 持续整改状态：关键链路已建立基线。** 主导航、用户菜单、编辑器模块
选择/开关/拖拽、模板选择、预览操作和富文本工具栏已使用语义按钮并提供名称；
新增真实键盘激活 E2E。颜色对比、屏幕阅读器全流程和 Axe 全页面扫描仍需独立
审计，不能用当前两项关键链路测试替代完整 WCAG 结论。

建议：

- 用 `button`、`a`、`nav` 等语义元素替换点击容器；
- 为图标按钮提供可访问名称；
- 校验 tab 顺序、焦点圈、弹窗 focus trap、颜色对比和屏幕阅读器文本；
- 在 CI 增加 Axe，覆盖登录、列表、编辑、预览、设置和公开页。

### 6.4 文档与版本

- `package.json` 为 1.0.2，README/CHANGELOG 仍停留在 1.0.0；
- README 提到 migrations 目录，但仓库中没有正式迁移体系；
- 无调用方且没有 `/profile/avatar` 后端路由的头像上传 service/hook 已删除；
- 根路径只重定向到简历列表，尚无真正的公开产品落地页。

建议把文档一致性、API dead code 和版本发布清单纳入 CI/发版流程。

## 7. 推荐执行路线

以下工期按 1 名熟悉项目的工程师估算，只用于排期量级。

### 阶段 0：安全止血，2～4 个工作日

1. 修复 JSON-LD XSS，并补回归测试；
2. 强制 MCP scope 与禁用用户状态；
3. 删除默认生产 JWT/preview secret，完成启动校验；
4. 给登录、注册、TOTP、OAuth 和 MCP 加基础限流；
5. 修正 Docker SQLite 数据目录；
6. 移除公开 DTO 的内部 ID；
7. 建立最小安全回归套件。

完成标准：上述攻击路径有自动化负例，生产配置缺失时应用拒绝启动。

### 阶段 1：数据与认证底座，1～2 周

1. 事务抽象与版本化 migration；
2. 原子注册码消费、唯一约束、OAuth 事务；
3. Zod REST schema 和统一错误协议；
4. HttpOnly session/refresh cookie、token 撤销；
5. 简历 revision、串行自动保存和 409 冲突处理；
6. audit log 基础表（按当前产品阶段暂缓，不计入近期迭代）。

完成标准：并发测试、双数据库集成测试和会话撤销测试通过。

### 阶段 2：交付与规模化，1～2 周

1. 消除 build-time DB 副作用；
2. 修复 sitemap/404/查询去重；
3. ~~列表分页、轻量 DTO、缩略图和索引；~~（2026-07-30 已完成当前规模方案）
4. 收紧 output tracing 和字体资产；
5. 清零 lint error，修复 E2E helper 与测试隔离；
6. ~~CI 加入 lint、unit、build、SQLite/PostgreSQL integration、E2E smoke；~~
   audit/SBOM 在确认依赖元数据披露策略后继续接入；
7. 加入结构化日志、request ID、错误监控和健康检查。

### 阶段 3：代码质量与体验，持续进行

1. 拆分超大组件和 MCP tool modules；公开简历、MCP 域注册器和富文本独立
   控件已按稳定职责拆分，后续只在新增业务造成明确变化压力时继续；
2. Zustand selector 优化；简历编辑器高频输入链路已完成，其他 store 按实际测量继续；
3. 可访问性基线；关键键盘链路已完成，完整 Axe/WCAG 审计仍待后续；
4. 删除重复配置、死代码和 schema 漂移；已清理失配头像上传链路；
5. 建立性能预算和关键页面 Web Vitals 观测；编辑器 E2E 防退化预算已完成，
   生产 Web Vitals 等存在稳定监控接收端后再接入。

本阶段遵循“按稳定职责提取、不以缩短单文件为目标”的原则。公开简历三个重复
JSON 解析器已收敛到共享 util，编辑器、公开页、缩略图、模板和打印的 A4 尺寸
也已改为同一常量来源。证件照工具重复的 contain 几何、白底 Canvas 绘制和
PNG/JPEG 编码已收敛为可单测 util，同时修复格式切换旧闭包和异步解码竞态；
单次使用且无独立状态的预览 JSX 保留在页面内，避免为了缩短文件而拆组件。
基本信息表单则存在一组独立、配置驱动且有自身交互规则的额外字段，因此整体
提取为组件，并将配置增删、图标切换、值判定和年龄计算收敛为纯 util；姓名、
头像和求职意向仍留在父表单。本轮同时修复隐藏字段会丢失 `avatar_left` 的问题，
并为字段操作补齐键盘入口和可访问名称。
OTP 设置则按敏感信息生命周期拆出二维码 enrollment 和一次性恢复码面板：
密码凭据在进入二维码步骤前清空，首次验证码使用独立 Form；启用和恢复码重新
生成支持键盘提交，二维码生成失败保留本地手动密钥回退。状态卡片和账号管理
操作仍留在父组件，避免把同一状态机拆散到更多层。
登录/游客编辑 hook 因 revision 与 localStorage 语义不同，暂不强行抽象为带
大量模式参数的共享 hook；二者完全一致的旧数据初始化规则和模板/预览偏好操作
则分别收敛为纯 util 与窄职责 hook。编辑器右侧 A4 预览拥有独立的缩放状态和
分页测量引用，因此从 Shell 提取为预览面板；工具栏、模块侧栏和表单编排仍留在
Shell，避免制造只转发 props 的碎片组件。预览字号、行距边界和默认值现由
编辑器、REST 校验与 MCP 共用，连续行距可在编辑器中忠实显示和修改。
在此基础上，编辑器订阅链进一步按真实渲染依赖划分：数据 Hook 只订阅稳定
action，保存回调在执行时读取最新快照；Shell 只订阅预览显隐；工具栏、模块
侧栏、表单和 A4 预览分别使用 `useShallow` selector。普通正文更新只改变表单
和预览切片，侧栏仅在模块结构、焦点或自定义标题变化时更新。表单和预览仍完整
订阅正文，因为它们确实需要实时响应输入，没有继续拆成字段级 selector。
本轮没有以总代码行数为目标继续拆分。MCP Server 因同时承载三组独立工具且
本轮需要修改 profile 并发语义，按 schema/profile/resume 注册器拆分，入口只
负责权限注入；精确工具清单测试锁定 5 个只读和 20 个读写工具。富文本工具栏
原有 5 个子控件各自维护 Select/Popover/链接状态，因此迁入独立控件模块，主
文件保留编辑命令和布局。相反，低频 Auth Store 的整 Store 订阅没有继续批量
改 selector，因为尚无测量收益。
性能方面新增独立 Playwright 预算，不在生产代码中加入临时计数器；首次本地
基线为预热后 DOMContentLoaded 48 ms、Load 219 ms、开发脚本约 12.0 MiB、
输入到预览最大 48 ms。该数据仅作为同类环境防退化对照，生产真实 Web Vitals
仍需在明确采集目的和接收端后接入。

## 8. 新功能优先级

### v1.1 简历版本历史 MVP 进展（2026-07-31）

首个 v1.1 功能实现为受控简历版本历史：已登录用户可手动创建、查看和恢复私有
快照；恢复复用 revision 条件更新与事务，revision 始终递增。自动保存不会对每次
输入永久留档，而是按 10 分钟窗口合并自动快照并仅保留最近 30 条。手动版本上限
100 条，自动清理不会删除 `manual`、`restore` 或未来的 `application` 记录。

手动创建先排空编辑器既有的单飞保存队列，再以保存响应中的 `expected_revision` 写入
快照；因此未等待防抖的可见编辑也不会被遗漏，保存失败或并发冲突不会创建版本。历史
列表使用分页元数据且只返回元数据，单版本详情才读取快照；SQLite 时间文本统一按 UTC
转换为 ISO 8601，避免浏览器将其误判为本地时间。

本期明确不支持游客版本历史、复杂 JSON/富文本差异对比、单版本删除和 MCP
版本工具；这些限制避免在权限、保留规则和恢复语义稳定前扩大公开接口。

### v1.2 求职申请跟踪 MVP 进展（2026-07-31）

已在审核通过的简历版本历史基础上新增登录用户申请记录：列表采用现有分页契约，
用户/状态/更新时间与跟进日期均有索引；服务层对所有读取和写入强制施加 `user_id`。
申请与简历版本保持引用关系而非复制正文，创建时可选择历史版本，或由事务创建/复用
当前 `application` 快照。申请本身使用 `revision` 条件更新，冲突稳定返回 409；删除
简历后申请记录保留，相关简历/版本外键置空。

本期明确没有提醒、拖拽看板、日历/邮件同步、JD 抓取、ATS/AI、
MCP、后台、公开接口或游客模式，避免将尚未稳定的求职工作流扩展到更多权限边界。

后续加固补充了应用页会话水合等待，避免刷新时客户端持久化状态尚未恢复就跳转登录。
申请日期统一为 date-only 契约，PostgreSQL 使用 `DATE` 并直接返回原始字符串；迁移仅处理本功能
开发阶段的 UTC 午夜值，避免时区解释改变日历日期。服务端汇总独立于分页返回，便于展示进行中、面试、Offer 与待跟进风险。

后续已将列表页重组为实际工作台：行动中心、阶段筛选和管理列表共享状态配置与 revision 保护。
迁移 008 新增追加式 `job_application_events`，状态变更与对应事件同事务；详情抽屉展示真实投递快照、
活动时间线、跟进和面试记录。关闭创建表单时不加载简历/版本，选择器改为按需分页和服务端搜索。

本轮审核发现最初工作台仍然以列表管理为主，且详情抽屉在写入下一步行动后可能继续拿旧 revision 写入。
现已改为行动优先的待办卡片（可直接进入跟进或面试记录），详情将跟进、面试、备注分开建模，并单独读取
最新申请资料以跟随 mutation 后的 revision。汇总和行动中心同时改用服务端应用的 date-only 日历值，不再让
数据库会话时区决定“今天”和“逾期”的归类。后续评估移除了容易被误解为完整看板的阶段视图入口，改由进展概览标签进入完整分页列表。

后续产品设计收敛为当前项目的 Ant Design 工作台风格：页面上方固定呈现优先处理和进展概览，底部再切换最近动态、
全部申请。创建、编辑和查看详情统一采用右侧“申请工作台”抽屉，避免新建弹窗与详情抽屉混用造成空间模型割裂。
`screening` 仍保留为稳定后端枚举，但中文标签改为“沟通中”，用于表达投递后已收到回应、补材料、约时间或初步沟通的阶段。

最新交互评估进一步解决了低数据量页面松散和“记录过程、再改阶段”的重复操作：桌面首屏采用
“优先处理 + 进展概览”双栏，下方承接申请列表，窄屏转为单栏；行动中心补充没有跟进日期的“待规划”申请；阶段入口收敛到进展概览标签和全部申请筛选。记录跟进或面试时可在同一次提交里同步阶段和下一步，服务端在一个事务内
更新当前摘要、递增 revision，并追加阶段与过程事件，避免出现时间线和当前状态不一致。
详情工作台继续按操作频率收敛：已填写资料收纳到抽屉标题区，主体改为“进展 / 简历 / 时间线”分区，
默认停留在进展处理；记录表单改为轻量子抽屉，避免主详情内容被临时表单挤散，取消会清空并收起；下一步提醒选项使用更贴近日常操作的“保持当前 / 指定日期 / 3 天后提醒 / 不再提醒”，并通过辅助说明明确“不再提醒”只清除当前提醒、不调整阶段；最近动态默认展示 8 条，完整入口直接切换到时间线；Tab 滚动时固定在顶部；投递简历进入独立 Tab 后在顶部提供简历与版本选择，发生变更后才显示保存/取消，并在下方展示名称、版本和动态高度的自适应缩放只读快照，滚动集中在预览框内，时间线默认展示全部记录。
编辑申请以更轻量的第二层抽屉覆盖呈现，关闭编辑后仍保留详情位置与记录上下文。

审核加固补充了求职进展的数据一致性边界：API 层所有时刻字段统一输出 UTC ISO 8601，SQLite 的
UTC 无时区文本和 PostgreSQL `Date`/`TIMESTAMPTZ` 均在服务层归一化；事件 `occurred_at` 写入前
归一为 UTC，并通过新增迁移 `009_job_application_event_utc_ordering` 规范既有 SQLite 数据和排序索引。
应用日历时区明确为默认 `Asia/Shanghai`，可通过 `APP_TIMEZONE` 调整，TZ=UTC 回归覆盖“今天”归类。
行动中心改为逾期、今日、未来七天和待规划分桶独立查询并返回 `total`、`has_more`、`limit`，避免一个
全局 LIMIT 让逾期数据挤掉今日事项；时间线改为有界分页，并按事件类型校验 schema，联动阶段或下一步时
`expected_revision` 在校验层和服务层均必填，缺失返回 400，过期仍返回 409。

优先处理入口的交互规则进一步收敛为可测试的分桶策略：待规划申请的主按钮是“安排下一步”，打开跟进记录器并默认要求选择日期；逾期和今日事项的主按钮是“处理”，避免无意识保留已经到期的旧日期；面试阶段的今日、逾期和未来事项直接进入“记录面试”；未来普通事项仍保持“记录进展 + 保持当前”。优先处理固定展示最高优先级的五条，完整记录通过下方“全部申请”分页列表查看，不再提供查看全部和收起；所有优先事项统一提供“详情”次按钮且不自动打开记录器，“待跟进”统计只定位到优先处理模块，不切换列表或展开事项。

项目名是 CareerTrack，但当前产品核心仍偏 Resume Builder。最有价值的方向是把“简历”接入完整求职过程，而不是再增加相似模板。

| 功能 | 用户价值 | 工作量 | 前置依赖 | 建议 |
| --- | --- | --- | --- | --- |
| 求职申请跟踪 | 高 | 中 | 分页、审计 | 最优先；公司、岗位、阶段、时间线、面试、Offer，并关联简历版本 |
| 简历版本历史/恢复/对比 | 高 | 中 | revision、事务 | 最先开发的新功能，既解决数据安全又提升体验 |
| JD 定向版本与 ATS 差距 | 高 | 中高 | 版本历史、隐私策略 | 基于职位描述给出关键词缺口和改写建议，禁止虚构经历，修改需用户确认 |
| 稳定服务端 PDF | 高 | 中 | 队列/缓存/字体治理 | 替代浏览器打印差异，生成可复用 artifact |
| 公开链接隐私控制 | 高 | 中 | Public DTO、session | 口令、过期时间、noindex、字段级隐藏、访问撤销 |
| 导入、导出与备份 | 中高 | 中 | schema 版本 | JSON/Markdown/Resume JSON 等结构化格式，支持全量备份恢复 |
| 反馈链接与批注 | 中 | 中高 | 审计、权限模型 | 招聘顾问/朋友无需编辑原文即可评论 |
| 求职分析 | 中 | 中 | 申请跟踪 | 阶段转化率、响应时间、渠道效果；注意默认最小化采集 |
| 国际化、英文模板、求职信 | 中 | 中高 | 配置去重、i18n | 在核心链路稳定后推进 |

建议版本组织：

- **v1.0.3**：仅安全、数据一致性、部署与测试修复；
- **v1.1**：revision/版本历史、稳定 PDF、隐私分享；
- **v1.2**：求职申请跟踪、JD 定向简历；
- **v1.3**：反馈协作、分析、导入导出增强；
- **之后**：国际化、团队能力、商业化。

暂时不建议投入：

- 微服务拆分；
- 原生移动 App；
- 复杂插件市场；
- 多租户团队计费；
- 在数据一致性和隐私底座完成前上线自动生成大量简历内容的 AI Agent。

## 9. 建议立即建立的任务清单

1. `security/jsonld-script-escape`
2. `security/mcp-scope-and-disabled-user`
3. `security/remove-default-secrets`
4. `security/auth-rate-limit-and-session-redesign`
5. `data/transaction-and-registration-code-claim`
6. `data/resume-revision-and-save-queue`
7. `db/versioned-migrations-and-driver-parity`
8. `ops/runtime-bootstrap-and-docker-sqlite`
9. `quality/restore-lint-ci-and-e2e`
10. `scale/paginated-summary-apis`

前 6 项完成以前，新功能分支应尽量只做设计和原型，避免继续扩大需要迁移或重构的表面面积。

## 10. 本次评估的上下文缺口

以下内容无法仅凭当前仓库完整判断，进入实施前需要补充：

- 线上部署拓扑、反向代理、TLS、备份、密钥管理和实际环境变量；
- 实际用户量、简历数量、内容大小、QPS、错误率、SLO 和数据库版本；
- GitHub OAuth 真实凭据与完整外部回调；
- 多浏览器、移动端和辅助技术的人工验收；
- PostgreSQL/SQLite 在生产数据量下的负载与锁竞争；
- npm registry 的实时漏洞数据；本次依赖审计因网络/审批限制未完成；
- 是否已有仓库外 CI、监控、告警、WAF/CDN 或定时备份。

这些缺口不会改变 P0 判断，但会影响阶段 1～3 的具体实现优先级和工期。

## 11. 最终建议

CareerTrack 的正确下一步是把现有功能“封口”：先让权限、会话、事务、保存、迁移、构建和交付变得可证明可靠，再借助同一套 revision/审计/权限基础开发版本历史、申请跟踪和 JD 定向简历。

如果只能选择一个新功能，选“简历版本历史”；如果只能选择一个产品方向，选“求职申请跟踪”。前者同时偿还技术债，后者才真正把 CareerTrack 从简历编辑器扩展为职业过程工具。
