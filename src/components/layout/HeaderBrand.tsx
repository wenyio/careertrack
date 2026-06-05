/**
 * Shared brand mark for application headers.
 */

'use client'

interface HeaderBrandProps {
  onClick?: () => void
  ariaLabel?: string
}

export default function HeaderBrand({
  onClick,
  ariaLabel = '返回简历列表',
}: HeaderBrandProps) {
  return (
    <>
      <button
        type="button"
        className="header-brand"
        onClick={onClick}
        aria-label={ariaLabel}
      >
        <span className="header-brand-mark" aria-hidden="true">
          职
        </span>
        <span className="header-brand-text">职迹</span>
      </button>

      <style jsx global>{`
        .header-brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          border: 0;
          padding: 0;
          background: transparent;
          color: inherit;
          cursor: pointer;
          line-height: 1;
          white-space: nowrap;
        }

        .header-brand-mark {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: linear-gradient(135deg, #1677ff 0%, #0958d9 100%);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-size: 16px;
          font-weight: 700;
          flex-shrink: 0;
        }

        .header-brand-text {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
        }
      `}</style>
    </>
  )
}
