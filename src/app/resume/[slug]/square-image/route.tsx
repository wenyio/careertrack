/**
 * 简历分享预览图 — 方图 (800×800)
 *
 * 用于微信聊天 / 朋友圈缩略图等国内分享场景。
 * 横图由同级 opengraph-image.tsx 提供。
 *
 * 使用 Route Handler 而非文件约定，因为 Next.js App Router
 * 的 opengraph-image 约定不支持同一路径下多张不同尺寸的图片。
 */

import { ImageResponse } from 'next/og'
import {
  fetchOGResumeData,
  loadFont,
  truncate,
  buildInfoLine,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BG_GRADIENT_START,
  BG_GRADIENT_END,
} from '../og-helpers'
import { BrandBar, SkillTag, ROOT_STYLE } from '../og-components'

export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const [data, fontData] = await Promise.all([fetchOGResumeData(slug), loadFont()])

  const fontOptions = fontData
    ? { fonts: [{ name: 'NotoSansSC', data: fontData, style: 'normal' as const }] }
    : {}

  const infoLine = buildInfoLine(data)
  const skills = data.skills.slice(0, 3)

  const image = new ImageResponse(
    (
      <div style={{ ...ROOT_STYLE, background: `linear-gradient(135deg, ${BG_GRADIENT_START} 0%, ${BG_GRADIENT_END} 100%)` }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: 700,
            background: '#fff',
            borderRadius: 24,
            padding: '44px 52px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
          }}
        >
          {/* 姓名 */}
          <div
            style={{
              fontSize: 48,
              fontWeight: 700,
              color: TEXT_PRIMARY,
              marginBottom: 12,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {truncate(data.name, 12)}
          </div>

          {/* 信息行 */}
          {infoLine && (
            <div
              style={{
                fontSize: 24,
                color: TEXT_SECONDARY,
                marginBottom: 24,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {truncate(infoLine, 40)}
            </div>
          )}

          {/* 技能标签 */}
          {skills.length > 0 && (
            <div
              style={{
                display: 'flex',
                gap: 10,
                flexWrap: 'wrap',
                marginBottom: 32,
              }}
            >
              {skills.map((skill, i) => (
                <SkillTag key={i} label={skill} fontSize={20} />
              ))}
            </div>
          )}

          {/* 分隔线 */}
          <div style={{ height: 1, background: '#f0f0f0', marginBottom: 18 }} />

          {/* 底部品牌 */}
          <BrandBar fontSize={22} smallFontSize={18} />
        </div>
      </div>
    ),
    { width: 800, height: 800, ...fontOptions },
  )

  return new Response(image.body, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
