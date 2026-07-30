import { describe, expect, it, vi } from 'vitest'
import {
  calculateContainedImageRect,
  getAvatarFileExtension,
  renderContainedSquareImage,
} from '@/utils/avatar-image'

describe('calculateContainedImageRect', () => {
  it('centers a landscape image with vertical padding', () => {
    expect(calculateContainedImageRect(2000, 1000, 1024, 1024)).toEqual({
      x: 0,
      y: 256,
      width: 1024,
      height: 512,
    })
  })

  it('centers a portrait image with horizontal padding', () => {
    const rect = calculateContainedImageRect(800, 1200, 1024, 1024)

    expect(rect.x).toBeCloseTo(170.6667, 3)
    expect(rect.y).toBe(0)
    expect(rect.width).toBeCloseTo(682.6667, 3)
    expect(rect.height).toBe(1024)
  })

  it('rejects invalid dimensions instead of drawing corrupt output', () => {
    expect(() => calculateContainedImageRect(0, 100, 1024, 1024))
      .toThrow(RangeError)
  })
})

describe('renderContainedSquareImage', () => {
  it('draws a white contained image and encodes the requested format', () => {
    const fillRect = vi.fn()
    const drawImage = vi.fn()
    const context = { fillStyle: '', fillRect, drawImage }
    const toDataURL = vi.fn(() => 'data:image/jpeg;base64,test')
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => context),
      toDataURL,
    } as unknown as HTMLCanvasElement
    const image = {
      naturalWidth: 800,
      naturalHeight: 1200,
      width: 800,
      height: 1200,
    } as HTMLImageElement

    expect(renderContainedSquareImage(canvas, image, 'image/jpeg'))
      .toBe('data:image/jpeg;base64,test')
    expect(canvas.width).toBe(1024)
    expect(canvas.height).toBe(1024)
    expect(context.fillStyle).toBe('#ffffff')
    expect(fillRect).toHaveBeenCalledWith(0, 0, 1024, 1024)
    expect(drawImage).toHaveBeenCalledOnce()
    expect(toDataURL).toHaveBeenCalledWith('image/jpeg', 0.92)
  })
})

describe('getAvatarFileExtension', () => {
  it('keeps the downloaded extension aligned with the encoded format', () => {
    expect(getAvatarFileExtension('image/png')).toBe('png')
    expect(getAvatarFileExtension('image/jpeg')).toBe('jpg')
  })
})
