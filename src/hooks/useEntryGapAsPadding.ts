import { useLayoutEffect, type RefObject } from 'react'

/**
 * 将子级 entry div 的 margin-bottom 转为容器自身的 padding-bottom。
 *
 * 简历条目之间的间距由 entry.marginBottom 控制，该 margin 会通过父级 subitem
 * 发生 collapse，导致 getComputedStyle 返回的 subitem 高度不含此间距。
 * 对打印的 copyComputedStyles 冻结高度不利——打印时文本渲染的细微差异可能导致
 * 溢出内容侵入 margin 间隙。
 *
 * 将此间距转为 padding-bottom 后，间距「长在」容器盒子内部，
 * 计算高度自然包含它，屏幕与打印一致。
 */
export function useEntryGapAsPadding(
  wrapperRef: RefObject<HTMLElement | null>,
  entrySelector: string,
  skip = false,
) {
  useLayoutEffect(() => {
    if (skip) return
    const wrapper = wrapperRef.current
    if (!wrapper) return
    const entry = wrapper.querySelector<HTMLElement>(entrySelector)
    if (!entry) return
    const mb = parseFloat(getComputedStyle(entry).marginBottom) || 0
    if (mb <= 0) return
    wrapper.style.paddingBottom = `${mb}px`
    entry.style.marginBottom = '0px'
  })
}
