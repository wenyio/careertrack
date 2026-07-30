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
import {
  AVATAR_EXPORT_SIZE,
  getAvatarFileExtension,
  renderContainedSquareImage,
  type AvatarExportFormat,
} from '@/utils/avatar-image'

const { Text, Paragraph } = Typography

const AVATAR_WIDTH = 88
const AVATAR_HEIGHT = 106

export default function AvatarToolPage() {
  const { message } = App.useApp()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const exportFormatRef = useRef<AvatarExportFormat>('image/png')
  const renderRequestRef = useRef(0)

  const [exportFormat, setExportFormat] =
    useState<AvatarExportFormat>('image/png')
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [originalUrl, setOriginalUrl] = useState<string>('')
  const [fileName, setFileName] = useState<string>('')

  /**
   * Decode and render one source using the explicitly requested format.
   *
   * Passing the format avoids reading stale React state when the user changes
   * PNG/JPEG while an image callback is still pending.
   */
  const renderImageSource = useCallback((
    source: string,
    format: AvatarExportFormat,
  ) => {
    const requestId = ++renderRequestRef.current
    const image = new Image()
    image.onload = () => {
      // Rapid format changes may finish decoding out of order; only the most
      // recent request is allowed to update the preview.
      if (requestId !== renderRequestRef.current) return
      const canvas = canvasRef.current
      if (!canvas) return

      try {
        setPreviewUrl(renderContainedSquareImage(canvas, image, format))
      } catch {
        message.error('图片处理失败，请更换图片后重试')
      }
    }
    image.onerror = () => {
      if (requestId !== renderRequestRef.current) return
      message.error('图片读取失败，请选择有效的图片文件')
    }
    image.src = source
  }, [message])

  /** Read a local image without uploading it, then render the latest format. */
  const processImage = useCallback((file: File) => {
    setFileName(file.name.replace(/\.[^.]+$/, ''))
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') return
      setOriginalUrl(reader.result)
      renderImageSource(reader.result, exportFormatRef.current)
    }
    reader.onerror = () => {
      message.error('图片读取失败，请重试')
    }
    reader.readAsDataURL(file)
  }, [message, renderImageSource])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      message.error('请选择图片文件')
      return
    }
    processImage(file)
  }

  const handleExportFormatChange = useCallback((
    nextFormat: AvatarExportFormat,
  ) => {
    exportFormatRef.current = nextFormat
    setExportFormat(nextFormat)
    if (originalUrl) renderImageSource(originalUrl, nextFormat)
  }, [originalUrl, renderImageSource])

  const handleDownload = () => {
    if (!previewUrl) {
      message.warning('请先选择图片')
      return
    }
    const extension = getAvatarFileExtension(exportFormat)
    const link = document.createElement('a')
    link.download = `${fileName || 'avatar'}_1x1.${extension}`
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
            onChange={(event) => handleExportFormatChange(event.target.value)}
          >
            <Radio.Button value="image/png">PNG</Radio.Button>
            <Radio.Button value="image/jpeg">JPEG</Radio.Button>
          </Radio.Group>
          <Text type="secondary" style={{ marginLeft: 12 }}>
            导出尺寸 {AVATAR_EXPORT_SIZE}×{AVATAR_EXPORT_SIZE}
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
