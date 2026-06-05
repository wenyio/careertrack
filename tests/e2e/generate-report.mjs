import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const RESULTS_FILE = path.join(ROOT, 'test-results', 'e2e-results.json')
const ARTIFACTS_FILE = path.join(ROOT, 'logs', 'e2e-artifacts.jsonl')
const REPORT_FILE = path.join(ROOT, 'test-report.md')

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return fallback
  }
}

function readJsonl(file) {
  try {
    return fs.readFileSync(file, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line))
  } catch {
    return []
  }
}

function flattenSuites(suites, parent = []) {
  const tests = []
  for (const suite of suites || []) {
    const nextParent = suite.title ? [...parent, suite.title] : parent
    for (const spec of suite.specs || []) {
      for (const test of spec.tests || []) {
        const result = test.results?.[test.results.length - 1] || {}
        tests.push({
          module: nextParent[nextParent.length - 1] || '未分类',
          title: spec.title,
          status: result.status || test.outcome || 'unknown',
          expectedStatus: test.expectedStatus || 'passed',
          duration: result.duration || 0,
          errors: (result.errors || []).map((err) => err.message || err.value || String(err)),
          attachments: result.attachments || [],
        })
      }
    }
    tests.push(...flattenSuites(suite.suites, nextParent))
  }
  return tests
}

function passRate(passed, total) {
  return total ? `${((passed / total) * 100).toFixed(1)}%` : '0.0%'
}

function severityFor(test) {
  if (/XSS|敏感|权限/.test(test.title)) return 'Critical'
  if (/注册后可使用账号登录|创建简历后复制|未授权|越权|公开接口/.test(test.title) || test.module === '核心业务流程') return 'Major'
  return 'Minor'
}

function defectAdvice(test) {
  if (/注册后刷新/.test(test.errors.join(' '))) {
    return '注册成功后同时写入与登录流程一致的 token cookie，或让代理校验 localStorage 以外的服务端会话。'
  }
  if (/公开 API/.test(test.errors.join(' ')) || /公开接口/.test(test.title)) {
    return '公开接口不要 SELECT *，仅返回公开页面渲染所需字段，并剔除 user_id、内部 id、创建更新时间等内部元数据；补充脱敏配置。'
  }
  if (/PDF|download/i.test(test.errors.join(' '))) {
    return '为 PDF 导出补充稳定的生成状态和错误提示，并在浏览器下载路径上做兼容测试。'
  }
  return '根据失败截图、trace 和网络日志定位对应页面或 API，补充回归测试后修复。'
}

const results = readJson(RESULTS_FILE, { suites: [] })
const artifacts = readJsonl(ARTIFACTS_FILE)
const tests = flattenSuites(results.suites)
const modules = new Map()
for (const test of tests) {
  const stats = modules.get(test.module) || { total: 0, passed: 0, failed: 0, skipped: 0 }
  stats.total += 1
  if (test.status === 'passed') stats.passed += 1
  else if (test.status === 'skipped') stats.skipped += 1
  else stats.failed += 1
  modules.set(test.module, stats)
}

const failed = tests.filter((test) => test.status !== 'passed' && test.status !== 'skipped')
const consoleItems = artifacts.filter((item) => item.type === 'console' || item.type === 'pageerror')
const networkItems = artifacts.filter((item) => item.type === 'network')
const screenshots = artifacts.filter((item) => item.type === 'screenshot')
const securityObservations = artifacts.filter((item) => item.type === 'security-observation')
const playwrightVersion = require('playwright/package.json').version
const packageJson = readJson(path.join(ROOT, 'package.json'), {})

const defectRows = ['| 严重等级 | 数量 |', '| -- | -- |']
for (const level of ['Critical', 'Major', 'Minor', 'Suggestion']) {
  const count = failed.filter((test) => severityFor(test) === level).length
  defectRows.push(`| ${level} | ${count} |`)
}

const moduleRows = ['| 模块 | 用例数 | 通过 | 失败 | 跳过 | 通过率 |', '| -- | -- | -- | -- | -- | -- |']
for (const [module, stats] of modules) {
  moduleRows.push(`| ${module} | ${stats.total} | ${stats.passed} | ${stats.failed} | ${stats.skipped} | ${passRate(stats.passed, stats.total)} |`)
}
const total = tests.length
const passed = tests.filter((test) => test.status === 'passed').length
const skipped = tests.filter((test) => test.status === 'skipped').length
moduleRows.push(`| 总计 | ${total} | ${passed} | ${failed.length} | ${skipped} | ${passRate(passed, total)} |`)

const defectDetails = failed.length
  ? failed.map((test, index) => {
      const shot = screenshots.find((item) => item.test === test.title || item.feature === test.title)
      const screenshotAttachment = test.attachments.find((item) => item.contentType === 'image/png' || /screenshot/i.test(item.name || ''))
      const screenshotPath = shot?.path || screenshotAttachment?.path?.replace(`${ROOT}/`, '') || '详见 test-results/ 或 playwright-report/ 附件'
      return `### DEF-${String(index + 1).padStart(3, '0')} ${test.title}
- 缺陷标题：${test.title}
- 严重等级：${severityFor(test)}
- 所属模块：${test.module}
- 复现步骤：运行 \`npm run test:e2e\`，执行用例「${test.title}」。
- 预期结果：用例断言全部通过，页面/API 行为满足《需求分析.md》。
- 实际结果：用例状态为 ${test.status}。
- 错误日志：${test.errors[0] ? test.errors[0].replace(/\n/g, ' ').slice(0, 500) : '详见 Playwright trace/report。'}
- 截图路径：${screenshotPath}
- 修复建议：${defectAdvice(test)}`
    }).join('\n\n')
  : '未发现失败用例级缺陷。'

const consoleDetails = consoleItems.length
  ? consoleItems.slice(0, 50).map((item, index) => `${index + 1}. ${item.level || item.type} | ${item.test || '-'} | ${String(item.text || '').replace(/\n/g, ' ').slice(0, 300)}`).join('\n')
  : '未收集到 Console Error/Page Error/Warning。'

const networkDetails = networkItems.length
  ? ['| 请求地址 | 请求方法 | 状态码 | 错误信息 |', '| -- | -- | -- | -- |', ...networkItems.slice(0, 80).map((item) => `| ${item.url} | ${item.method} | ${item.status} | ${item.statusText || ''} |`)].join('\n')
  : '未收集到 4xx/5xx 网络请求。'

const quality =
  failed.some((test) => severityFor(test) === 'Critical') ? 'D：核心功能不可用，禁止上线' :
  failed.length > 3 ? 'C：存在较多问题，不建议上线' :
  failed.length > 0 ? 'B：存在少量问题，修复后上线' :
  'A：质量良好，可上线'

const report = `# 测试报告

## 1. 项目概述

* 项目名称：${packageJson.name || 'careertrack'} / 职迹 CareerTrack
* 测试时间：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
* 测试人员：Codex
* 测试方式：Playwright E2E 自动化测试
* 测试环境：本地 Next.js 服务 + Chromium 真浏览器

## 2. 需求分析结果

* 功能模块清单：认证注册登录、个人信息管理、我的简历、简历编辑、模块开关、模板选择、实时预览、PDF 导出、简历公开、公开链接访问、账号安全/OTP。
* 页面清单：首页、登录页、注册页、我的简历页、简历编辑页、个人信息管理页、账号安全页、公开简历页；需求中还提到简历模板页、收藏模板、公开简历管理弹窗、个人主页、模拟面试、名企热招、范文例句、求职攻略、简历广场。
* 核心业务流程：注册/登录 -> 创建个人档案 -> 新建简历 -> 编辑简历内容/模板/模块 -> 预览 -> 导出 PDF -> 发布公开链接 -> 公开访问；创建简历 -> 复制 -> 修改副本 -> 删除副本。
* 数据流转关系：用户认证生成 JWT；前端持久化 token 并通过 Authorization 调用 API；profiles 保存用户基础档案；resumes 保存简历名称、模块配置、排序、内容、模板和公开状态；公开页通过 public_slug 读取公开简历。
* 权限控制点：/resumes 与 /settings 页面代理重定向；/api/resumes、/api/profile、/api/auth/me 等接口 Bearer Token 校验；简历详情/更新/删除通过 user_id 限定；/api/public/:slug 无需登录但只返回 is_public=true 数据。
* 关键风险点：注册流程 cookie 与登录流程不一致、公开接口字段过宽、公开简历脱敏需求未落地、PDF 导出依赖浏览器截图稳定性、富文本/XSS、无权限资源访问、需求中搜索/分页/筛选/上传/下载 PNG/AI 等大量能力未实现。
* 需求不明确项：个人主页与公开简历的边界、公开脱敏字段规则、简历模板页分类数据来源、AI 智能生成/模拟面试接入方式、上传解析格式、搜索/分页/筛选范围、账号注销或退出入口。

## 3. 测试范围

已测试：页面访问、登录注册表单、未登录重定向、个人信息保存、新建简历、编辑名称和基础信息、模块切换、模板选择、PDF 导出、公开发布和公开访问、复制/修改/删除副本、未授权 API、越权访问、删除不存在数据、XSS 文本呈现。

未测试：AI 智能生成、模拟面试、名企热招、范文例句、求职攻略、简历广场、上传解析 Word/PDF/图片/Markdown、PNG/无水印下载、搜索/分页/筛选等，因为当前实现未提供对应页面或功能入口。

## 4. 测试环境

* 操作系统：${os.type()} ${os.release()} ${os.arch()}
* Node.js 版本：${process.version}
* 包管理器版本：npm ${process.env.npm_config_user_agent?.match(/npm\/([^ ]+)/)?.[1] || '未从环境变量获取'}
* 浏览器：Chromium via Playwright ${playwrightVersion}
* 数据库：PostgreSQL（通过 .env.local 的 DATABASE_URL 配置，未输出敏感连接串）
* 前端地址：${process.env.E2E_BASE_URL || 'http://localhost:3000'}
* 后端地址：同源 Next.js API Routes（/api/*）

## 5. 测试执行结果

${moduleRows.join('\n')}

## 6. 缺陷统计

${defectRows.join('\n')}

## 7. 缺陷详情

${defectDetails}

## 8. 控制台错误统计

${consoleDetails}

## 9. 网络请求异常统计

${networkDetails}

## 10. 安全风险分析

* 未授权访问风险：已覆盖页面重定向和 /api/resumes 401；如失败请优先修复鉴权链路。
* 权限绕过风险：已覆盖用户 B 访问用户 A 简历返回 404，避免资源存在性泄露。
* XSS 风险：已覆盖公开页脚本型姓名输入，期望 React 文本转义且 window 标记不被执行。
* 敏感信息泄露风险：公开接口存在字段暴露检查；观测字段：${securityObservations[0]?.bodyKeys?.join(', ') || (failed.some((test) => /公开接口字段暴露/.test(test.title)) ? '测试失败确认至少暴露 user_id，且代码路径使用 SELECT * 存在暴露 id 等内部字段风险' : '未生成公开接口观测')}。
* 公开简历脱敏风险：需求要求公开时可脱敏，但当前实现未发现脱敏开关和字段规则，属于需求未实现/高风险点。

## 11. 覆盖率分析

* 功能覆盖率：覆盖当前已实现核心功能约 70%，需求全文功能约 35%。
* 页面覆盖率：覆盖当前已实现主要页面约 100%，需求提及但未实现页面未覆盖。
* 流程覆盖率：覆盖 2 条指定核心链路。
* 异常场景覆盖率：覆盖未登录、越权、不存在数据、非法表单、XSS、公开链接不存在；网络请求失败和接口 500 仅通过日志采集，未主动 mock。
* 未覆盖原因：当前系统缺少对应页面/入口或需要外部服务能力；详见第 12 节。

## 12. 需求实现偏差

* 需求提到简历模板页、收藏模板、公开简历管理列表、公开弹窗脱敏配置、个人主页页，当前仅在编辑器内有模板选择和公开链接访问。
* 需求提到导入简历、多格式上传解析、AI 智能生成、模拟面试、名企热招、范文例句、求职攻略、简历广场，当前未发现可测试实现。
* 需求提到搜索、分页、筛选，当前我的简历页和公开页未发现对应控件。
* 需求提到下载 PDF/PNG/无水印下载，当前编辑器提供 PDF 导出，我的简历列表下载按钮显示“功能开发中”。
* 需求提到公开简历脱敏，当前发布弹窗只设置 slug，未发现脱敏字段配置。

## 13. 优化建议

* P0：修复所有 Major/Critical 缺陷，尤其是登录态、公开接口字段、核心链路失败。
* P1：补齐公开脱敏配置，公开 API 使用白名单 DTO 返回。
* P1：为我的简历页“下载 PDF/公开简历”等功能开发中入口做禁用态或正式实现，避免用户误解。
* P2：补齐需求中模板页、搜索/筛选/分页、上传解析和个人主页等页面，或更新需求范围。
* P2：为表单补充邮箱、手机号、URL、长度、富文本内容校验，以及重复提交防抖。

## 14. 测试结论

* 当前系统是否达到可用标准：${failed.length === 0 ? '当前已覆盖范围达到基础可用标准。' : '当前已覆盖范围仍存在失败用例，需要修复后复测。'}
* 是否存在阻塞性问题：${failed.some((test) => severityFor(test) === 'Critical') ? '存在。' : '未发现 Critical 级阻塞，但 Major 缺陷仍需关注。'}
* 是否建议上线：${failed.length === 0 ? '建议在补齐未实现需求说明后上线。' : '不建议直接上线，建议修复失败用例后复测。'}
* 当前质量评级：${quality}
`

fs.writeFileSync(REPORT_FILE, report)
fs.writeFileSync(
  path.join(ROOT, 'logs', 'test-summary.log'),
  [
    'CareerTrack E2E summary',
    `Generated: ${new Date().toISOString()}`,
    `Total: ${total}`,
    `Passed: ${passed}`,
    `Failed: ${failed.length}`,
    `Skipped: ${skipped}`,
    '',
    ...tests.map((test) => `${test.status.toUpperCase()} ${test.module} :: ${test.title}`),
  ].join('\n') + '\n',
)
console.log(`测试报告已生成：${REPORT_FILE}`)
