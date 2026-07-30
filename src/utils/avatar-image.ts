/**
 * Browser-side avatar image rendering utilities.
 *
 * The image is fully contained in a square canvas and padded with white space;
 * no source pixels are cropped or uploaded.
 */

export type AvatarExportFormat = 'image/png' | 'image/jpeg'

export const AVATAR_EXPORT_SIZE = 1024
const JPEG_EXPORT_QUALITY = 0.92

export interface ContainedImageRect {
  x: number
  y: number
  width: number
  height: number
}

/** Calculate a centered `object-fit: contain` rectangle. */
export function calculateContainedImageRect(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
): ContainedImageRect {
  const dimensions = [sourceWidth, sourceHeight, targetWidth, targetHeight]
  if (dimensions.some((value) => !Number.isFinite(value) || value <= 0)) {
    throw new RangeError('Image and canvas dimensions must be positive')
  }

  const scale = Math.min(
    targetWidth / sourceWidth,
    targetHeight / sourceHeight,
  )
  const width = sourceWidth * scale
  const height = sourceHeight * scale

  return {
    x: (targetWidth - width) / 2,
    y: (targetHeight - height) / 2,
    width,
    height,
  }
}

/**
 * Render an image into a white square canvas and return its encoded data URL.
 */
export function renderContainedSquareImage(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  format: AvatarExportFormat,
  size = AVATAR_EXPORT_SIZE,
): string {
  const sourceWidth = image.naturalWidth || image.width
  const sourceHeight = image.naturalHeight || image.height
  const rect = calculateContainedImageRect(
    sourceWidth,
    sourceHeight,
    size,
    size,
  )

  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Canvas 2D context is unavailable')
  }

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, size, size)
  context.drawImage(
    image,
    rect.x,
    rect.y,
    rect.width,
    rect.height,
  )

  return format === 'image/jpeg'
    ? canvas.toDataURL(format, JPEG_EXPORT_QUALITY)
    : canvas.toDataURL(format)
}

export function getAvatarFileExtension(
  format: AvatarExportFormat,
): 'png' | 'jpg' {
  return format === 'image/jpeg' ? 'jpg' : 'png'
}
