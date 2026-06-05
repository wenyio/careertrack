# 疑难症 / 已知问题

记录长期未解决的技术难题，供后续攻关参考。

---

## 1. Modern 模板侧边栏分页异常

**现象**：右栏（主内容）只剩一页时，左栏（侧边栏）仍占满三页。刷新页面后恢复正常，但编辑过程中实时增删内容时问题复现。

**根因分析**：
- 侧边栏原使用 `alignSelf: 'stretch'` 强制拉伸到父容器高度
- 父容器高度由两栏中较高者决定（通常是侧边栏自身）
- 分页系统（`PublicPaginatedResume`）测量的是拉伸后的总高度，导致页数由侧边栏决定
- 已尝试修复：移除 `alignSelf`，改用 `ResizeObserver` 以主内容高度为准计算页高
- **问题仍在**：`ResizeObserver` 回调触发时 DOM 可能尚未完成布局更新，导致测量值滞后

**涉及文件**：
- `src/components/resume/templates/defs/modern.tsx` — `ModernRenderer` + `styleOverrides`
- `src/app/resume/[slug]/PublicResumeClient.tsx` — `PublicPaginatedResume` 分页逻辑
- `src/components/resume/editor/PageBreakHints.tsx` — 编辑器分页提示线

**可能的解决方向**：
- 在 `ResizeObserver` 回调中加入 `requestAnimationFrame` 延迟一帧再测量
- 改为监听 `MutationObserver`（内容变化）+ `ResizeObserver`（尺寸变化）双触发
- 分页逻辑改为独立测量两栏高度，取主内容高度作为页高，侧边栏按页裁剪
- 考虑将侧边栏设为 `position: sticky` 或独立于分页系统之外，每页重复渲染

---

## 2. PDF 导出样式还原度不足

**现象**：使用 `html2canvas` 或 `react-pdf` 导出 PDF 时，样式与浏览器预览存在差异，无法 100% 还原。

**根因分析**：
- `html2canvas` 是 CSS 模拟器，不是真正的浏览器渲染引擎，许多 CSS 属性不支持或渲染不一致（如 `backdrop-filter`、复杂渐变、`@media print` 规则等）
- `react-pdf` 使用自己的排版引擎，不支持标准 CSS，需要完全重写样式（使用其专用的 `StyleSheet` API）
- 两种方案各有取舍：`html2canvas` 视觉接近但有偏差，`react-pdf` 精确但需要大量适配工作

**涉及文件**：
- `src/utils/print.ts` — 当前打印/导出逻辑
- `src/components/resume/editor/ResumeHtmlPreview.tsx` — HTML 预览组件

**可能的解决方向**：
- 改用 Puppeteer / Playwright 在服务端生成 PDF（最接近浏览器渲染，但需要服务端依赖）
- 使用 `@react-pdf/renderer` 为每个模板编写专用的 PDF 版本（工作量大但效果最好）
- 混合方案：`html2canvas` 截图 + 后处理修正已知偏差
- 调研 `pdf-lib` 或 `jspdf` 等其他方案

---

## 登记规范

每条记录包含：
- **现象**：用户可见的问题表现
- **根因分析**：技术层面的原因
- **涉及文件**：相关代码路径
- **可能的解决方向**：待尝试的方案
