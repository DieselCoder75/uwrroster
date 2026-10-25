// Team photos are kept in Firestore, because Cloud Storage needs the paid plan. A Firestore document holds at
// most 1 MiB, so photos are shrunk and compressed in the browser before upload: a large version for wide
// screens and a small one for phones, both in the same document.

export const LARGE_WIDTH = 1920
export const SMALL_WIDTH = 960
export const LARGE_MAX_BYTES = 560_000
export const SMALL_MAX_BYTES = 180_000
/** Photos narrower than this look soft on a wide screen. */
export const RECOMMENDED_WIDTH = 1600
/** Bigger files are almost certainly not photos meant for the web. */
export const MAX_FILE_BYTES = 30 * 1024 * 1024

export type PreparedHero = {
  large: Uint8Array
  small: Uint8Array
  type: string
  width: number
  height: number
}

/** Size in pixels of `width`×`height` scaled down to at most `maxWidth` wide. */
export function fitWidth(width: number, height: number, maxWidth: number): { width: number; height: number } {
  const scale = Math.min(1, maxWidth / width)
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

/** Advice on a photo by its size: too small, or the wrong way round. */
export function photoWarnings(width: number, height: number): ('small' | 'portrait')[] {
  const out: ('small' | 'portrait')[] = []
  if (width < RECOMMENDED_WIDTH) out.push('small')
  if (height >= width) out.push('portrait')
  return out
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode'))), type, quality))
}

async function encode(image: ImageBitmap, maxWidth: number, maxBytes: number): Promise<{ blob: Blob; width: number; height: number }> {
  let { width, height } = fitWidth(image.width, image.height, maxWidth)
  for (;;) {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d')!.drawImage(image, 0, 0, width, height)
    for (const quality of [0.82, 0.74, 0.66, 0.58, 0.5]) {
      let blob = await toBlob(canvas, 'image/webp', quality)
      // Browsers that can't write WebP hand back PNG; JPEG is far smaller for photos.
      if (blob.type !== 'image/webp') blob = await toBlob(canvas, 'image/jpeg', quality)
      if (blob.size <= maxBytes) return { blob, width, height }
    }
    // Still too big at low quality: try smaller.
    width = Math.round(width * 0.8)
    height = Math.round(height * 0.8)
  }
}

export async function prepareHero(file: File): Promise<PreparedHero> {
  const image = await createImageBitmap(file)
  try {
    const large = await encode(image, LARGE_WIDTH, LARGE_MAX_BYTES)
    const small = await encode(image, SMALL_WIDTH, SMALL_MAX_BYTES)
    return {
      large: new Uint8Array(await large.blob.arrayBuffer()),
      small: new Uint8Array(await small.blob.arrayBuffer()),
      type: large.blob.type,
      width: image.width,
      height: image.height,
    }
  } finally {
    image.close()
  }
}
