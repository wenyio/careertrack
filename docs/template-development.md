# 简历模板开发指南

> 本文档描述简历模板系统的架构、公共能力、以及如何开发新模板。

## 目录

1. [架构概览](#1-架构概览)
2. [目录结构](#2-目录结构)
3. [快速开始：新增模板](#3-快速开始新增模板)
4. [TemplateDefinition 完整契约](#4-templatedefinition-完整契约)
5. [三级定制模型](#5-三级定制模型)
6. [公共组件](#6-公共组件)
7. [样式系统](#7-样式系统)
8. [模块渲染器](#8-模块渲染器)
9. [StandardBasicInfoHeader 详解](#9-standardbasicinfoheader-详解)
10. [最佳实践](#10-最佳实践)

---

## 1. 架构概览

模板系统采用 **声明式定义 + 分层渲染** 的架构：

```
┌─────────────────────────────────────────────────────────────┐
│  TemplateDefinition (defs/*.tsx)                            │
│  ┌──────────┐ ┌────────────┐ ┌──────────────┐ ┌──────────┐ │
│  │  config   │ │  renderer  │ │ SkeletonPrev │ │ resolve  │ │
│  │ (元数据)  │ │ (渲染钩子) │ │  (缩略图)    │ │ Overr.   │ │
│  └──────────┘ └────────────┘ └──────────────┘ └──────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  BaseResumePreview (base-resume-renderer.tsx)               │
│  1. 解析模板定义                                              │
│  2. 计算样式 (getBaseStyles → applyStyleOverrides)           │
│  3. 构建 ViewModel (resolveResumeView)                       │
│  4. 渲染分发：                                                │
│     ├─ renderer.Renderer? → 完全委托                          │
│     ├─ renderer.layoutSlots? → 多栏布局                       │
│     └─ 默认 → 单栏线性渲染                                    │
└──────────────────────────────────────────────────────────────┘
```

**核心设计原则：**

- 模板只需导出一个 `TemplateDefinition` 对象，注册到 `registry.ts` 即可生效
- `BaseResumePreview` 是所有渲染入口（编辑器预览、公开简历、缩略图、打印）的统一组件
- 通过 `renderer` 的可选字段实现渐进式定制，从纯样式覆盖到完全自定义渲染

---

## 2. 目录结构

```
src/components/resume/templates/
├── index.ts                    # 公共 API 导出
├── types.ts                    # 类型定义
├── registry.ts                 # 模板注册表
├── base-styles.ts              # 样式生成与覆盖
├── base-resume-renderer.tsx    # 统一渲染骨架
├── common/                     # 公共组件与工具
│   ├── index.ts                # 公共 API 导出
│   ├── StandardBasicInfoHeader.tsx   # 公共 BasicInfoHeader
│   ├── BasicInfoHeader.tsx           # DefaultBasicInfoHeader (向后兼容)
│   ├── StandardModuleRenderer.tsx    # 通用模块渲染器
│   ├── SectionTitle.tsx              # 章节标题组件
│   ├── DescriptionHtml.tsx           # 富文本描述渲染
│   ├── icon-mappers.tsx              # 图标映射函数
│   ├── basic-info-header-styles.ts   # Header 样式 helper
│   └── resolve-overrides.ts          # 共享 resolveOverrides 常量
└── defs/                       # 模板定义
    ├── classic.tsx             # 经典模板
    ├── minimal.tsx             # 极简模板
    ├── modern.tsx              # 现代模板
    └── black-white.tsx         # 黑白整齐模板
```

---

## 3. 快速开始：新增模板

### 步骤 1：创建模板定义文件

在 `defs/` 下新建 `my-template.tsx`：

```tsx
/**
 * 我的模板定义
 */

import type { TemplateDefinition } from '../types'
import { StandardBasicInfoHeader, DEFAULT_INTENTION_RESOLVE_OVERRIDES } from '../common'

// ── BasicInfoHeader（可选，使用公共组件包装） ──

function MyBasicInfoHeader(props) {
  return (
    <StandardBasicInfoHeader
      {...props}
      variant="centered"        // 或 "left" / "sidebar"
      showBottomBorder
      iconColor={props.primaryColor}
      textColor="#333"
      intentionColor="#666"
    />
  )
}

// ── 骨架预览 ──

function MySkeletonPreview() {
  return (
    <div style={{ flex: 1, backgroundColor: '#f5f5f5', padding: 6 }}>
      <div style={{ height: 4, backgroundColor: '#ddd', borderRadius: 2, marginBottom: 3, width: '80%' }} />
      <div style={{ height: 3, backgroundColor: '#ddd', borderRadius: 2, width: '60%' }} />
    </div>
  )
}

// ── 模板定义导出 ──

export const myTemplate: TemplateDefinition = {
  config: {
    id: 'my-template',              // 唯一标识，需加入 ResumeTemplateId 联合类型
    name: '我的模板',
    description: '模板描述',
    primaryColor: '#2563eb',        // 主色（标题、图标等）
    secondaryColor: '#1e40af',      // 副色
    textColor: '#1f2937',           // 正文色
    defaultPreviewConfig: { lineHeight: 1.5 },
  },
  renderer: {
    BasicInfoHeader: MyBasicInfoHeader,
    styleOverrides: {
      section: { marginBottom: 0 },
    },
  },
  SkeletonPreview: MySkeletonPreview,
  resolveOverrides: DEFAULT_INTENTION_RESOLVE_OVERRIDES,
}
```

### 步骤 2：注册模板

在 `registry.ts` 中导入并加入 `TEMPLATES` 映射：

```ts
import { myTemplate } from './defs/my-template'

const TEMPLATES: Record<ResumeTemplateId, TemplateDefinition> = {
  // ... 已有模板
  'my-template': myTemplate,
}
```

在 `types/resume.ts` 中扩展模板 ID 联合类型：

```ts
export type ResumeTemplateId = 'classic' | 'modern' | 'minimal' | 'black-white' | 'my-template'
```

### 步骤 3：验证

```bash
npm run build
```

完成。新模板会自动出现在模板选择器中。

---

## 4. TemplateDefinition 完整契约

```ts
interface TemplateDefinition {
  /** 模板配置（元数据） */
  config: ResumeTemplateConfig
  /** 渲染器定义 */
  renderer: TemplateRenderer
  /** 骨架预览组件（缩略图） */
  SkeletonPreview: ComponentType
  /** 可选：ViewModel 解析覆盖 */
  resolveOverrides?: {
    contactFields?: string[]
    intentionFields?: string[]
    showIntentionsWithoutPosition?: boolean
  }
}
```

### 4.1 config — 模板元数据

```ts
interface ResumeTemplateConfig {
  id: ResumeTemplateId          // 唯一标识
  name: string                  // 显示名称
  description: string           // 描述
  primaryColor: string          // 主色
  secondaryColor: string        // 副色
  textColor: string             // 正文色
  defaultPreviewConfig?: Partial<ResumePreviewConfig>
}
```

### 4.2 renderer — 渲染器定义

```ts
interface TemplateRenderer {
  /** 完全自定义 Renderer（最高优先级，接管全部渲染） */
  Renderer?: ComponentType<TemplateRendererProps>

  /** 样式覆盖（静态对象或动态函数） */
  styleOverrides?: TemplateStyleOverrides
    | ((config: { primaryColor, textColor, fontSize, lineHeight, s }) => TemplateStyleOverrides)

  /** 多栏布局声明 */
  layoutSlots?: LayoutSlots

  /** 单模块自定义渲染器 */
  moduleRenderers?: Partial<Record<ResumeModuleType, ComponentType<ModuleRendererProps>>>

  /** 自定义 BasicInfoHeader */
  BasicInfoHeader?: ComponentType<BasicInfoHeaderProps>

  /** 图标映射覆盖 */
  iconOverrides?: TemplateIconOverrides
}
```

**所有字段均可选**，形成渐进式定制模型（见 [第 5 节](#5-三级定制模型)）。

### 4.3 resolveOverrides — ViewModel 解析覆盖

控制求职意向等字段如何从原始数据解析为展示数据。四模板共享的默认值：

```ts
// common/resolve-overrides.ts
export const DEFAULT_INTENTION_RESOLVE_OVERRIDES = {
  intentionFields: ['current_status', 'position_label', 'expected_city', 'expected_salary'],
  showIntentionsWithoutPosition: true,
}
```

---

## 5. 三级定制模型

### Level 1：样式覆盖

最轻量的定制方式。只提供 `styleOverrides`，默认渲染逻辑和布局不变。

```ts
renderer: {
  styleOverrides: {
    section: { marginBottom: 0 },
    sectionTitle: { textTransform: 'uppercase', letterSpacing: 3 },
  },
}
```

动态样式覆盖（使用函数形式，可访问 `s` 缩放 helper）：

```ts
renderer: {
  styleOverrides: ({ primaryColor, s }) => ({
    sectionTitle: { fontSize: s(1.3), color: primaryColor },
    sidebarName: { fontSize: s(1.8) },
  }),
}
```

**适用于：** 只需要调整颜色、字号、间距、边框的模板。

### Level 2：结构化定制

在样式覆盖的基础上，替换特定渲染环节：

| 字段 | 用途 |
|------|------|
| `BasicInfoHeader` | 替换基础信息头部渲染 |
| `moduleRenderers` | 替换特定模块的渲染逻辑 |
| `layoutSlots` | 声明多栏布局（sidebar + main） |
| `iconOverrides` | 替换图标映射 |

```ts
renderer: {
  BasicInfoHeader: MyHeader,
  moduleRenderers: {
    skills: MySkillsRenderer,
    portfolio: MyPortfolioRenderer,
  },
  styleOverrides: { ... },
}
```

**适用于：** 需要自定义头部、特定模块布局、或多栏结构的模板（如 classic、minimal、black-white）。

### Level 3：完全自定义 Renderer

提供 `Renderer` 组件，`BaseResumePreview` 将计算好的 `styles`、`viewModel`、`config` 等全部交给它，模板完全接管渲染。

```ts
renderer: {
  Renderer: MyCustomRenderer,  // 接管全部渲染
  styleOverrides: ({ primaryColor, s }) => ({ ... }),
}
```

Renderer 接收的 props（`TemplateRendererProps`）：

```ts
interface TemplateRendererProps {
  content: ResumeContent          // 原始简历数据
  modulesConfig: ModulesConfig    // 模块开关
  modulesOrder: ResumeModuleType[] // 模块顺序
  template: ResumeTemplateId
  profile?: Profile
  styles: ResolvedStyles          // 已计算的样式对象
  viewModel: ResumeViewModel      // 已解析的展示数据
  config: ResumeTemplateConfig    // 模板配置
  resolvedFontSize: number
  resolvedLineHeight: number
  renderSection: SectionRenderer  // section 包装回调
  renderSubItem: SubItemRenderer  // 子项包装回调
}
```

**适用于：** 布局与默认逻辑差异极大的模板（如 modern 的 sidebar + main 双栏 + 多页高度对齐）。

---

## 6. 公共组件

### 6.1 StandardBasicInfoHeader

公共基础信息头部组件，支持三种布局变体。详见 [第 9 节](#9-standardbasicinfoheader-详解)。

### 6.2 renderStandardModule

通用模块渲染入口，按模块类型分发到对应的渲染器：

```ts
import { renderStandardModule } from '../common'

// 在自定义 Renderer 中使用
renderStandardModule({ module: 'education', content, styles, renderSubItem, s })
```

内置渲染器覆盖的模块：`summary`、`skills`、`awards`、`portfolio`、`projects`、`education`、`work_experience`、`research`、`other_experience`。

### 6.3 StandardArrayEntries

通用数组模块渲染器，处理 `education`、`work_experience`、`research`、`other_experience`、`projects`：

```ts
import { StandardArrayEntries } from '../common'

<StandardArrayEntries module="education" content={content} styles={styles} renderSubItem={renderSubItem} />
```

### 6.4 独立模块渲染器

```ts
import {
  renderSkillsModule,      // skills（块级条目 + 描述）
  renderAwardsModule,      // awards（名称 + 日期 + 描述）
  renderPortfolioModule,   // portfolio（名称 + 链接 + 描述）
  renderProjectsModule,    // projects（委托给 StandardArrayEntries）
  renderSummaryModule,     // summary（富文本描述）
} from '../common'
```

### 6.5 DescriptionHtml

富文本描述渲染组件，支持 TipTap JSON 和纯文本：

```ts
import { DescriptionHtml } from '../common'

<DescriptionHtml value={item.description} style={styles.description} />
```

### 6.6 SectionTitle

章节标题组件：

```ts
import { SectionTitle } from '../common'

<SectionTitle styles={styles}>工作经历</SectionTitle>
```

### 6.7 图标映射

```ts
import { getContactIcon, getExtraFieldIcon, getIntentionIcon } from '../common'

getContactIcon('phone')         // → <PhoneOutlined />
getExtraFieldIcon('age', '25')  // → <UserOutlined />
getIntentionIcon('aim')         // → <AimOutlined />
```

### 6.8 共享常量

```ts
import { DEFAULT_INTENTION_RESOLVE_OVERRIDES } from '../common'

// 四模板共享的求职意向解析配置
{
  intentionFields: ['current_status', 'position_label', 'expected_city', 'expected_salary'],
  showIntentionsWithoutPosition: true,
}
```

---

## 7. 样式系统

### 7.1 基础样式生成

`getBaseStyles(config, fontSize?, lineHeight?)` 生成 14 个样式键：

| 键 | 用途 | 默认值概要 |
|----|------|-----------|
| `page` | 页面容器 | A4 尺寸 (794×1123px), padding 36px |
| `contactItem` | 联系信息条目 | `fontSize: s(0.9)` |
| `section` | 模块容器 | `marginBottom: 16` |
| `sectionTitle` | 章节标题 | `fontSize: s(1.3)`, `borderBottom: 2px solid` |
| `entry` | 条目容器 | `marginBottom: 12` |
| `entryHeader` | 条目头部 | `display: flex`, `justifyContent: space-between` |
| `entryTitle` | 条目标题 | `fontSize: s(1.07)`, `fontWeight: bold` |
| `entryDate` | 条目日期 | `color: secondaryColor`, `marginLeft: auto` |
| `entrySubtitle` | 条目副标题 | `color: secondaryColor`, `marginBottom: 4` |
| `description` | 描述文本 | `fontSize: s(0.93)`, `lineHeight: 1.6` |
| `skillTag` | 技能标签 | `fontSize: s(0.86)`, `borderRadius: 4` |
| `sidebar` | 侧栏容器 | 由模板 styleOverrides 定义 |
| `sidebarName` | 侧栏姓名 | 由模板 styleOverrides 定义 |
| `main` | 主区域容器 | 由模板 styleOverrides 定义 |

`s(scale)` helper 计算相对字号：`Math.round(fontSize * scale * 10) / 10`。

### 7.2 样式覆盖

`applyStyleOverrides(base, overrides?, config?)` 合并模板覆盖：

- **静态对象**：直接合并，`{ section: { marginBottom: 0 } }`
- **动态函数**：接收 `{ primaryColor, textColor, fontSize, lineHeight, s }`，返回覆盖对象

合并规则：按 key 浅合并（`{ ...base[key], ...override[key] }`）。

### 7.3 样式覆盖键一览

```ts
interface TemplateStyleOverrides {
  page?: CSSProperties
  contactItem?: CSSProperties
  section?: CSSProperties
  sectionTitle?: CSSProperties
  entry?: CSSProperties
  entryHeader?: CSSProperties
  entryTitle?: CSSProperties
  entryDate?: CSSProperties
  entrySubtitle?: CSSProperties
  description?: CSSProperties
  skillTag?: CSSProperties
  sidebar?: CSSProperties
  sidebarName?: CSSProperties
  main?: CSSProperties
}
```

---

## 8. 模块渲染器

### 8.1 自定义模块渲染器

通过 `renderer.moduleRenderers` 替换特定模块的渲染：

```ts
function MySkillsRenderer({ content, styles, renderSubItem, s }: ModuleRendererProps) {
  const skills = content.skills || []
  return (
    <>
      <SectionTitle styles={styles}>专业技能</SectionTitle>
      {skills.map((skill, i) => renderSubItem('skills', i, skills.length, (
        <div style={styles.entry}>
          <div style={styles.entryTitle}>{skill.name}</div>
          {skill.description && (
            <DescriptionHtml value={skill.description} style={styles.description} />
          )}
        </div>
      )))}
    </>
  )
}

// 注册
renderer: {
  moduleRenderers: {
    skills: MySkillsRenderer,
  },
}
```

### 8.2 ModuleRendererProps

```ts
interface ModuleRendererProps {
  module: ResumeModuleType
  content: ResumeContent
  styles: ResolvedStyles
  renderSubItem: SubItemRenderer
  resolvedFontSize: number
  s: (scale: number) => number
}
```

### 8.3 renderSubItem 回调

`renderSubItem(module, index, total, children)` 用于包装子项。默认实现返回 `<div key={module-index}>{children}</div>`。编辑器可能注入带点击事件的包装器。

### 8.4 renderSection 回调

`renderSection(module, children)` 用于包装整个模块区域。默认实现返回带 `data-module` 属性的 `<section>`。

---

## 9. StandardBasicInfoHeader 详解

公共 BasicInfoHeader 组件，统一处理联系信息、额外信息、求职意向、图标、头像/姓名布局。

### 9.1 布局变体

| variant | 姓名 | 头像 | 对齐 | 典型用途 |
|---------|------|------|------|---------|
| `centered` | 渲染 | 右侧/左侧 | 居中 | classic, minimal |
| `left` | 渲染 | 右侧/左侧 | 左对齐 | black-white |
| `sidebar` | 不渲染 | 不渲染 | 居中 | modern 侧栏 |

### 9.2 完整 Props

```tsx
<StandardBasicInfoHeader
  // 必填
  basicInfo={content.basic_info}
  template={template}
  primaryColor={config.primaryColor}
  styles={styles}
  contactItems={viewModel.basicInfo.contacts}
  intentionItems={viewModel.basicInfo.intentions}

  // 布局
  variant="centered"                    // "centered" | "left" | "sidebar"
  showName={true}                       // 是否渲染姓名
  showAvatar={true}                     // 是否渲染头像
  avatarLeft={false}                    // 头像靠左（默认靠右）

  // 字号
  nameFontSize="2.2em"
  contactFontSize="14px"
  intentionFontSize="14px"

  // 颜色
  iconColor={primaryColor}              // 图标颜色
  iconFontSize="0.85em"                 // 图标字号
  iconMarginRight={5}                   // 图标右边距
  textColor="#555"                      // 文字颜色
  intentionColor="#666"                 // 求职意向颜色

  // 意图模式
  intentionMode="spaced"                // "joined" | "spaced" | "items" | "single"

  // 样式覆盖
  showBottomBorder={false}              // 底部分割线
  avatarStyle={{ width: 88, height: 106 }}
  containerStyle={{}}
  itemStyle={{}}

  // 其他
  extraDisplayItems={viewModel.basicInfo.extras}
  fieldIcons={content.basic_info_display?.field_icons}
  showEmptyContactRow={false}
/>
```

### 9.3 intentionMode 说明

| 模式 | 效果 | 典型用途 |
|------|------|---------|
| `joined` | 所有意图在一行，用空格分隔 | 经典模板紧凑模式 |
| `spaced` | 居中 flex 换行，每项等间距 | 经典/极简默认 |
| `items` | 左对齐 flex 换行 | 黑白整齐 |
| `single` | 只显示第一项 | 黑白整齐备选 |

### 9.4 使用示例

**经典居中（带底部分割线）：**

```tsx
function ClassicBasicInfoHeader(props: BasicInfoHeaderProps) {
  return (
    <StandardBasicInfoHeader
      {...props}
      variant="centered"
      showBottomBorder
      iconColor={props.primaryColor}
      textColor="#555"
      intentionColor="#666"
      nameFontSize={props.centerNameFontSize || '2.2em'}
    />
  )
}
```

**侧边栏白字（不渲染姓名和头像）：**

```tsx
<StandardBasicInfoHeader
  variant="sidebar"
  showName={false}
  showAvatar={false}
  basicInfo={basicInfo}
  iconColor="rgba(255, 255, 255, 0.8)"
  textColor="rgba(255, 255, 255, 0.9)"
  contactFontSize={s(0.9)}
  intentionFontSize={s(0.9)}
  // ... 其他必填 props
/>
```

---

## 10. 最佳实践

### 10.1 模板定义

- **优先使用公共组件**：`StandardBasicInfoHeader`、`renderStandardModule`、`StandardArrayEntries` 等已覆盖绝大多数场景
- **渐进式定制**：从 `styleOverrides` 开始，只在必要时升级到 `moduleRenderers` 或完全自定义 `Renderer`
- **复用 `DEFAULT_INTENTION_RESOLVE_OVERRIDES`**：不要重复定义相同的 `resolveOverrides`

### 10.2 样式

- **使用 `s(scale)` helper**：确保字号随用户配置缩放，不要硬编码 px 值
- **动态 styleOverrides 函数**：当需要访问 `s` 或颜色变量时，使用函数形式
- **浅合并语义**：`styleOverrides` 按 key 浅合并，子属性会被完全覆盖（不是深度合并）

### 10.3 模块渲染器

- **调用 `renderSubItem`**：确保子项被正确包装，编辑器的点击交互依赖它
- **调用 `renderSection`**：确保模块区域被正确包装
- **空值检查**：`content.skills || []` 防止空数据崩溃

### 10.4 自定义 Renderer

- **接收并使用 `styles`**：不要自己调用 `getBaseStyles`，`BaseResumePreview` 已经计算好了
- **接收并使用 `renderSection` / `renderSubItem`**：保持与编辑器的兼容性
- **处理模块开关**：检查 `modulesConfig[module]` 再渲染
- **多页高度对齐**：参考 modern 模板的 `useLayoutEffect` + A4_HEIGHT 模式

### 10.5 注册与类型

- **更新 `ResumeTemplateId`**：在 `types/resume.ts` 中添加新的 ID
- **更新 `registry.ts`**：导入并注册新模板
- **运行 `npm run build`**：确保 TypeScript 编译通过

### 10.6 数据流

```
编辑器 → ResumeContent → BaseResumePreview
                            ├→ getBaseStyles + applyStyleOverrides → styles
                            ├→ resolveResumeView → viewModel
                            └→ 模板 Renderer / Default 渲染
                                 ├→ BasicInfoHeader (basicInfo, contactItems, intentionItems, ...)
                                 └→ renderStandardModule / custom moduleRenderers
```

`viewModel` 由 `resolveResumeView()` 生成，包含：
- `viewModel.basicInfo.contacts` — 联系信息展示项
- `viewModel.basicInfo.extras` — 额外信息展示项
- `viewModel.basicInfo.intentions` — 求职意向展示项

模板不应自行解析这些数据，直接使用 viewModel 即可。
