# Gravatar 头像方案

## 什么是 Gravatar

[Gravatar](https://gravatar.com)（**G**lobally **R**ecognized **Avatar**）是一项全球通用的头像服务。用户只需注册一次、上传头像，之后在任何支持 Gravatar 的网站填写邮箱，系统就会自动显示对应的头像。

Gravatar 被广泛集成于 WordPress、GitHub、Stack Overflow 等平台。

## CareerTrack 为什么使用 Gravatar

CareerTrack 采用 Gravatar 作为头像来源，基于以下考虑：

1. **无需本地存储**：不需要在服务器上保存头像文件，降低存储和带宽成本
2. **无需实现上传功能**：省去头像上传、裁剪、存储等复杂逻辑
3. **跨平台一致**：用户在其他网站设置的 Gravatar 头像会自动同步到 CareerTrack
4. **隐私友好**：系统不存储用户头像文件，仅通过邮箱哈希获取

## 为什么要把证件照处理成 1:1 方图

Gravatar 要求上传的头像为 **1:1 正方形**，但简历中的证件照通常是 **竖版矩形**（如 3:4 或 2:3）。

为了让证件照在 Gravatar 上正确显示，并在 CareerTrack 简历中以证件照比例（88×106）展示，需要：

1. 将竖版证件照放入 1:1 白色方框中（左右补白，不裁剪人像）
2. 将处理后的方图上传到 Gravatar
3. CareerTrack 在渲染时按证件照比例裁剪显示

## 如何使用证件照工具

CareerTrack 内置了一个纯前端的证件照处理工具：

1. 登录 CareerTrack，访问 `/settings/avatar-tool`
2. 点击「选择图片」上传你的证件照
3. 工具会自动将图片居中放入 1:1 白色方框
4. 选择导出格式（推荐 PNG），点击「下载 1:1 方图」
5. 工具会同时显示简历中的证件照预览效果

> **注意**：该工具完全在浏览器本地处理，不会上传图片到任何服务器。

## 如何上传头像到 Gravatar

1. 访问 [https://gravatar.com](https://gravatar.com) 并注册/登录
2. 前往 [头像管理页面](https://gravatar.com/profile/avatars)
3. 上传你在 CareerTrack 证件照工具中生成的 1:1 方图
4. 设置该头像为当前使用的头像
5. 回到 CareerTrack，在简历基本信息中填写与 Gravatar 相同的邮箱
6. 简历预览将自动显示 Gravatar 头像

## 工作原理

CareerTrack 的头像显示逻辑如下：

1. 如果简历基本信息中 **已设置 `avatar` 字段**（直接 URL），优先使用
2. 如果 `avatar` 为空但 **`email` 存在**，系统会对邮箱执行 `trim + lowercase`，使用 SHA-256 生成哈希，拼接为 Gravatar URL
3. 如果两者都为空，则不显示头像

URL 格式：

```
https://www.gravatar.com/avatar/{sha256_hash}?s=256&d=mp&r=g
```

- `s=256`：请求 256px 尺寸
- `d=mp`：未设置头像时使用默认的 Mystery Person 图标
- `r=g`：适合所有年龄段的内容分级

## 头像展示尺寸

CareerTrack 中头像统一以 **证件照比例** 展示：

- **HTML 预览**：`width: 88px, height: 106px, object-fit: cover, object-position: center center`
- **PDF 输出**：`width: 88, height: 106`

无论原始头像是 1:1 方图还是其他比例，都会按上述尺寸裁剪显示，保持证件照效果。

## 隐私提醒

- Gravatar 头像和关联的公开资料 **对外可见**，任何人通过邮箱哈希都可以查看
- 如果你希望头像仅在简历中展示，可以考虑在简历中直接填写 `avatar` URL（指向私有图片）
- CareerTrack 不会将你的邮箱明文暴露在页面或 URL 中，仅传输 SHA-256 哈希值

## 常见问题

**Q: 修改 Gravatar 头像后，CareerTrack 没有立即更新？**
A: Gravatar 头像有缓存机制，更新后可能需要几分钟到几小时才能生效。

**Q: 可以不使用 Gravatar 吗？**
A: 可以。在简历基本信息的 `avatar` 字段中直接填写任意图片 URL，系统会优先使用该 URL。

**Q: 证件照工具支持哪些图片格式？**
A: 支持所有浏览器可识别的图片格式，包括 JPG、PNG、GIF、WebP 等。
