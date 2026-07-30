# 持续集成

仓库通过 `.github/workflows/ci.yml` 在 push、pull request 和手动触发时执行质量
门禁。工作流仅授予 `contents: read`，同一分支的新运行会取消旧运行。

## 门禁组成

| 作业 | 检查 |
|------|------|
| `quality` | ESLint、全部 Vitest 单元测试、Next.js 生产构建 |
| `postgres` | PostgreSQL 15 服务、自动建库、迁移、事务、JSONB、revision、TOTP/恢复码和旧列归并 |
| `browser` | 8 项安全冒烟、Chromium 全量 E2E；失败时保存日志、截图、trace、视频和 HTML 报告 7 天 |

三个作业相互独立并行执行，既能尽快暴露失败，也避免浏览器回归阻塞静态检查
结果。依赖安装显式使用 `--no-audit`，防止安装步骤隐式上传依赖清单并受外部
advisory 服务可用性影响；依赖安全审计应在明确确认数据披露策略后作为独立门禁
接入。

## PostgreSQL 隔离策略

`npm run test:postgres` 不直接写入 `POSTGRES_TEST_URL` 指向的数据库。脚本要求
其数据库名包含独立的 `ci` 或 `test` 段，并执行以下流程：

1. 派生带 `_careertrack_test_` 标记的随机子数据库名；
2. 让应用通过标准 PostgreSQL 初始化路径自动创建子数据库；
3. 通过真实 HTTP API 验证注册码事务、简历 JSONB/revision、TOTP 和恢复码；
4. 模拟旧 PostgreSQL 简历配置列，重启应用并验证迁移 004；
5. 终止子数据库连接并只删除本次生成的数据库。

账号需要具备 `CREATE DATABASE` 和删除该临时数据库的权限。脚本拒绝以名称不像
测试库的 URL 运行，不能将生产 `DATABASE_URL` 直接传入。

本地已有隔离 PostgreSQL 时可运行：

```bash
POSTGRES_TEST_URL=postgresql://postgres:password@127.0.0.1:5432/careertrack_test \
  npm run test:postgres
```

## 本地提交前检查

```bash
npm run lint
npm run test:unit
npm run build
npm run test:security-smoke
npx playwright test --workers=1
```

没有 PostgreSQL 运行时的开发机可以跳过 `test:postgres`，但合并前必须以 CI
中的 PostgreSQL 作业结果为准。
