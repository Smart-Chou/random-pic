import type {Env} from '../index'

interface Image {
  id: number
  name: string
  hash: string
  url: string
  category: string
  enabled: boolean
  weight: number
  tags: string[]
}

// In-memory cache
let cachedImages: Image[] | null = null
let cacheTime = 0
const CACHE_TTL = 5 * 60 * 1000

// Referer whitelist from env
function getRefererWhitelist(env: Env): string[] {
  return (env.REFERER_WHITELIST || '').split(',').filter(Boolean).map((d) => d.trim())
}

function isRefererAllowed(referer: string | null, whitelist: string[]): boolean {
  if (!referer || whitelist.length === 0) return true
  return whitelist.some((domain) => referer.includes(domain) || domain === '*')
}

async function getImageCount(env: Env): Promise<Image[]> {
  const now = Date.now()
  if (cachedImages && now - cacheTime < CACHE_TTL) {
    return cachedImages
  }

  // Read from local file (embedded in worker)
  // Images are embedded at build time via wrangler
  // For now, try to get from KV first, fallback to none
  cachedImages = []
  cacheTime = now
  return cachedImages
}

async function loadImagesFromKV(env: Env): Promise<Image[]> {
  const now = Date.now()
  if (cachedImages && now - cacheTime < CACHE_TTL) {
    return cachedImages
  }

  try {
    const list = await env.IMAGES.list()
    const images: Image[] = []

    for (const key of list.keys) {
      const value = await env.IMAGES.get(key.name, 'json')
      if (value) {
        images.push(value as Image)
      }
    }

    cachedImages = images
    cacheTime = now
    return images
  } catch {
    return []
  }
}

function selectWeighted(items: Image[]): Image | undefined {
  if (items.length === 0) return undefined

  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0)
  let random = Math.random() * totalWeight

  for (const item of items) {
    random -= item.weight
    if (random <= 0) return item
  }

  return items[items.length - 1]
}

export async function getRandomImage(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const searchParams = url.searchParams

  // Get parameters
  const category = searchParams.get('category') ?? undefined
  const format = searchParams.get('format')
  const isBgRequest = searchParams.get('bg') === 'true'

  // Referer validation (skip if bg=true)
  const referer = request.headers.get('referer') || request.headers.get('origin')
  const whitelist = getRefererWhitelist(env)

  if (!isBgRequest && !isRefererAllowed(referer, whitelist)) {
    return new Response(
      JSON.stringify({
        success: false,
        error: {code: 'FORBIDDEN', message: 'Referer not allowed'},
      }),
      {status: 403, headers: {'Content-Type': 'application/json'}}
    )
  }

  // Get images from KV
  const allImages = await loadImagesFromKV(env)
  const enabledImages = allImages.filter((img) => img.enabled)

  let images = enabledImages
  if (category) {
    images = enabledImages.filter((img) => img.category === category)
  }

  if (images.length === 0) {
    return new Response(
      JSON.stringify({
        success: false,
        error: {code: 'NO_IMAGES', message: 'No images available'},
      }),
      {status: 404, headers: {'Content-Type': 'application/json'}}
    )
  }

  const image = selectWeighted(images)
  if (!image) {
    return new Response(
      JSON.stringify({
        success: false,
        error: {code: 'NO_IMAGE', message: 'Failed to select image'},
      }),
      {status: 500, headers: {'Content-Type': 'application/json'}}
    )
  }

  // Return JSON if requested
  if (format === 'json') {
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: image.id,
          url: `/api/pic${image.url}`,
          category: image.category,
          tags: image.tags,
        },
      }),
      {headers: {'Content-Type': 'application/json'}}
    )
  }

  // Build image URL
  let imageUrl = image.url
  if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
    const baseUrl = env.IMAGE_BASE_URL || ''
    imageUrl = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}${imageUrl}`
  }

  // Proxy: fetch from R2 and stream
  let r2Object = null

  // Format negotiation: AVIF → WebP → JPG
  const accept = request.headers.get('Accept') || ''
  const formats = accept.includes('image/avif')
    ? ['avif', 'webp', 'jpg']
    : accept.includes('image/webp')
    ? ['webp', 'jpg']
    : ['jpg', 'webp']

  // Try to get each format from R2
  for (const ext of formats) {
    const objectKey = image.url.slice(1) + '.' + ext
    r2Object = await env.R2.get(objectKey)
    if (r2Object) break
  }

  if (!r2Object) {
    // Fallback: try direct URL fetch
    try {
      const response = await fetch(imageUrl)
      if (!response.ok) {
        return new Response('Image not found', {status: 404})
      }

      const headers = new Headers()
      const contentType = response.headers.get('content-type')
      if (contentType) headers.set('Content-Type', contentType)
      headers.set('Cache-Control', 'public, max-age=86400')

      return new Response(response.body, {status: 200, headers})
    } catch {
      return new Response('Image not found', {status: 404})
    }
  }

  const contentType = r2Object.httpMetadata.contentType || `image/${formats[0]}`
  const headers = new Headers()
  headers.set('Content-Type', contentType)
  headers.set('Cache-Control', 'public, max-age=86400')
  headers.set('Vary', 'Accept')

  return new Response(r2Object.body, {status: 200, headers})
}