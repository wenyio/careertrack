/**
 * 证件照处理工具
 *
 * 纯前端处理，不请求后端。
 * 帮助用户将竖版证件照处理成适合上传到 Gravatar 的 1:1 方图。
 */

'use client'

import { useRef, useCallback, useState } from 'react'
import { Button, Radio, Typography, Space, App } from 'antd'
import {
  UploadOutlined,
  DownloadOutlined,
  PictureOutlined,
} from '@ant-design/icons'
import SettingsPageLayout from '@/components/layout/SettingsPageLayout'

const { Text, Paragraph } = Typography

const EXPORT_SIZE = 1024
const AVATAR_WIDTH = 88
const AVATAR_HEIGHT = 106

export default function AvatarToolPage() {
  const { message } = App.useApp()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [exportFormat, setExportFormat] = useState<'image/png' | 'image/jpeg'>('image/png')
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [originalUrl, setOriginalUrl] = useState<string>('')
  const [fileName, setFileName] = useState<string>('')

  /**
   * 将图片处理为 1:1 方图（白色背景，左右/上下补白，不裁剪）
   */
  const processImage = useCallback((file: File) => {
    setFileName(file.name.replace(/\.[^.]+$/, ''))
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        setOriginalUrl(img.src)

        // 创建 1:1 画布，白色背景
        const canvas = canvasRef.current
        if (!canvas) return
        canvas.width = EXPORT_SIZE
        canvas.height = EXPORT_SIZE
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // 白色背景
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, EXPORT_SIZE, EXPORT_SIZE)

        // 计算缩放：保持原图比例，完整放入方框内（contain）
        const scale = Math.min(EXPORT_SIZE / img.width, EXPORT_SIZE / img.height)
        const drawWidth = img.width * scale
        const drawHeight = img.height * scale
        const drawX = (EXPORT_SIZE - drawWidth) / 2
        const drawY = (EXPORT_SIZE - drawHeight) / 2

        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight)

        // 生成预览
        const mimeType = exportFormat
        const quality = mimeType === 'image/jpeg' ? 0.92 : undefined
        setPreviewUrl(canvas.toDataURL(mimeType, quality))
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }, [exportFormat])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      message.error('请选择图片文件')
      return
    }
    processImage(file)
  }

  const handleReprocess = useCallback(() => {
    if (!originalUrl) return
    const img = new Image()
    img.onload = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width = EXPORT_SIZE
      canvas.height = EXPORT_SIZE
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, EXPORT_SIZE, EXPORT_SIZE)

      const scale = Math.min(EXPORT_SIZE / img.width, EXPORT_SIZE / img.height)
      const drawWidth = img.width * scale
      const drawHeight = img.height * scale
      const drawX = (EXPORT_SIZE - drawWidth) / 2
      const drawY = (EXPORT_SIZE - drawHeight) / 2
      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight)

      const quality = exportFormat === 'image/jpeg' ? 0.92 : undefined
      setPreviewUrl(canvas.toDataURL(exportFormat, quality))
    }
    img.src = originalUrl
  }, [originalUrl, exportFormat])

  const handleDownload = () => {
    if (!previewUrl) {
      message.warning('请先选择图片')
      return
    }
    const ext = exportFormat === 'image/png' ? 'png' : 'jpg'
    const link = document.createElement('a')
    link.download = `${fileName || 'avatar'}_1x1.${ext}`
    link.href = previewUrl
    link.click()
    message.success('已下载')
  }

  return (
    <SettingsPageLayout
      title="证件照处理工具"
      subtitle="将竖版证件照处理为 1:1 方图，适合上传到 Gravatar"
      size="lg"
    >
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        {/* 说明 */}
        <Paragraph type="secondary" style={{ marginBottom: 0 }}>
          此工具仅在浏览器本地处理图片，不会上传到任何服务器。
          处理后的 1:1 方图可直接上传到 Gravatar 作为头像。
        </Paragraph>

        {/* 上传按钮 */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <Space>
            <Button
              icon={<UploadOutlined />}
              onClick={() => fileInputRef.current?.click()}
            >
              选择图片
            </Button>
            {previewUrl && (
              <Button
                icon={<DownloadOutlined />}
                type="primary"
                onClick={handleDownload}
              >
                下载 1:1 方图
              </Button>
            )}
          </Space>
        </div>

        {/* 导出格式 */}
        <div>
          <Text strong style={{ marginRight: 12 }}>导出格式</Text>
          <Radio.Group
            value={exportFormat}
            onChange={(e) => {
              setExportFormat(e.target.value)
              if (originalUrl) {
                // 用 setTimeout 等 state 更新后再重新处理
                setTimeout(() => handleReprocess(), 0)
              }
            }}
          >
            <Radio.Button value="image/png">PNG</Radio.Button>
            <Radio.Button value="image/jpeg">JPEG</Radio.Button>
          </Radio.Group>
          <Text type="secondary" style={{ marginLeft: 12 }}>
            导出尺寸 {EXPORT_SIZE}×{EXPORT_SIZE}
          </Text>
        </div>

        {/* 预览区域 */}
        {previewUrl ? (
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
            {/* 1:1 方图预览 */}
            <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                <PictureOutlined /> 1:1 方图预览
              </Text>
              <div
                style={{
                  width: 200,
                  height: 200,
                  border: '1px solid #d9d9d9',
                  borderRadius: 8,
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#fafafa',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="1:1 方图预览"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>
            </div>

            {/* 简历证件照框预览 */}
            <div>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                <PictureOutlined /> 简历证件照预览
              </Text>
              <div
                style={{
                  width: AVATAR_WIDTH * 2,
                  height: AVATAR_HEIGHT * 2,
                  border: '1px solid #d9d9d9',
                  borderRadius: 8,
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#fafafa',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="简历证件照预览"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center center',
                  }}
                />
              </div>
              <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                {AVATAR_WIDTH}×{AVATAR_HEIGHT} 证件照比例
              </Text>
            </div>
          </div>
        ) : (
          <div
            style={{
              width: '100%',
              minHeight: 240,
              border: '1px dashed #d9d9d9',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#bbb',
            }}
          >
            <Space orientation="vertical" align="center">
              <PictureOutlined style={{ fontSize: 32 }} />
              <Text type="secondary">选择图片后在此预览</Text>
            </Space>
          </div>
        )}

        {/* 使用说明 */}
        <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>使用说明</Text>
          <ol style={{ paddingLeft: 20, margin: 0, color: '#595959', fontSize: 14, lineHeight: 2 }}>
            <li>点击「选择图片」上传你的证件照（支持 JPG、PNG 等常见格式）</li>
            <li>工具会自动将图片居中放入 1:1 白色方框中，不会裁剪人像</li>
            <li>选择导出格式（推荐 PNG），点击「下载 1:1 方图」</li>
            <li>将下载的方图上传到 <a href="https://gravatar.com/profile/avatars" target="_blank" rel="noopener noreferrer">Gravatar 头像页面</a></li>
            <li>在 CareerTrack 中填写对应邮箱，简历预览即可自动显示头像</li>
          </ol>
        </div>
      </Space>

      {/* 隐藏的 Canvas */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </SettingsPageLayout>
  )
}
