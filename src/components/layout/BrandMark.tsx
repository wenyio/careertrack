import type { CSSProperties } from 'react'

interface BrandMarkProps {
  size?: number
  fontSize?: number
  radius?: number
  className?: string
  style?: CSSProperties
}

export default function BrandMark({
  size = 32,
  fontSize = Math.round(size * 0.56),
  radius = Math.round(size * 0.25),
  className,
  style,
}: BrandMarkProps) {
  return (
    <span
      className={className}
      aria-hidden="true"
      style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: radius,
        background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        color: '#fff',
        fontSize,
        fontWeight: 800,
        lineHeight: 1,
        flexShrink: 0,
        ...style,
      }}
    >
      职
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          right: size * 0.208333,
          bottom: size * 0.1,
          width: size * 0.416667,
          height: Math.max(2, size * 0.083333),
          borderRadius: 999,
          background: 'rgba(255, 255, 255, 0.84)',
        }}
      />
    </span>
  )
}
