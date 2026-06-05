/**
 * 简历分享预览图 — 横图 (1200×630)
 *
 * 标准 OG 横图，用于网页 / 微博 / Twitter large image。
 * 横图内含 630×630 中心安全区，被微信裁成方图仍可读。
 *
 * 方图 (800×800) 由同级 square-image/route.ts 提供。
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
} from './og-helpers'
import { BrandBar, SkillTag, ROOT_STYLE } from './og-components'

export const runtime = 'nodejs'

export const contentType = 'image/png'

export const size = { width: 1200, height: 630 }

export const alt = '简历分享卡片'

export default async function OGImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [data, fontData] = await Promise.all([fetchOGResumeData(slug), loadFont()])

  const fontOptions = fontData
    ? { fonts: [{ name: 'NotoSansSC', data: fontData, style: 'normal' as const }] }
    : {}

  const infoLine = buildInfoLine(data)
  const skills = data.skills.slice(0, 5)

  return new ImageResponse(
    (
      <div style={{ ...ROOT_STYLE, background: `linear-gradient(135deg, ${BG_GRADIENT_START} 0%, ${BG_GRADIENT_END} 100%)` }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: 960,
            background: '#fff',
            borderRadius: 24,
            padding: '48px 64px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
          }}
        >
          {/* 姓名 */}
          <div
            style={{
              fontSize: 52,
              fontWeight: 700,
              color: TEXT_PRIMARY,
              marginBottom: 14,
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
                fontSize: 26,
                color: TEXT_SECONDARY,
                marginBottom: 28,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {truncate(infoLine, 50)}
            </div>
          )}

          {/* 技能标签 */}
          {skills.length > 0 && (
            <div
              style={{
                display: 'flex',
                gap: 12,
                flexWrap: 'wrap',
                marginBottom: 36,
              }}
            >
              {skills.map((skill, i) => (
                <SkillTag key={i} label={skill} fontSize={22} />
              ))}
            </div>
          )}

          {/* 分隔线 */}
          <div style={{ height: 1, background: '#f0f0f0', marginBottom: 20 }} />

          {/* 底部品牌 */}
          <BrandBar fontSize={24} smallFontSize={20} />
        </div>
      </div>
    ),
    { width: 1200, height: 630, ...fontOptions },
  )
}
