import type { Env } from '../index'

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

interface ImagesData {
  images: Image[]
}

// In-memory cache
let cachedImages: Image[] | null = null
let cacheTime = 0
const CACHE_TTL = 5 * 60 * 1000

async function loadImagesFromFile(env: Env): Promise<Image[]> {
  const now = Date.now()
  if (cachedImages && now - cacheTime < CACHE_TTL) {
    return cachedImages
  }

  try {
    const response = await env.ASSETS.fetch(new Request('/images.json'))
    if (!response.ok) {
      return cachedImages || []
    }
    const data: ImagesData = await response.json()
    cachedImages = data.images
    cacheTime = now
    return data.images
  } catch {
    return cachedImages || []
  }
}

// Referer whitelist from env
function getRefererWhitelist(env: Env): string[] {
  const whitelist = (env.REFERER_WHITELIST || '')
  if (!whitelist) return []
  return whitelist.split(',').filter(Boolean).map((d) => d.trim())
}

function isRefererAllowed(referer: string | null, whitelist: string[]): boolean {
  if (!referer || whitelist.length === 0) return true
  return whitelist.some((domain) => referer.includes(domain) || domain === '*')
}

function getCategoriesFromImages(images: Image[]): string[] {
  const categories = new Set(images.filter(img => img.enabled).map(img => img.category))
  return Array.from(categories).sort()
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

function errorResponse(code: string, message: string): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: { code, message },
    }),
    { status: 400, headers: { 'Content-Type': 'application/json' } }
  )
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
    return errorResponse('FORBIDDEN', 'Referer not allowed')
  }

  // Get images from file
  const allImages = await loadImagesFromFile(env)
  const enabledImages = allImages.filter((img) => img.enabled)

  // Validate category if provided
  if (category) {
    const availableCategories = getCategoriesFromImages(allImages)
    if (!availableCategories.includes(category)) {
      return errorResponse('CATEGORY_NOT_FOUND', `Category '${category}' not found`)
    }
  }

  let images = enabledImages
  if (category) {
    images = enabledImages.filter((img) => img.category === category)
  }

  if (images.length === 0) {
    return errorResponse('NO_IMAGES', 'No images available')
  }

  const image = selectWeighted(images)
  if (!image) {
    return errorResponse('NO_IMAGE', 'Failed to select image')
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
      { headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Build image URL
  let imageUrl = image.url
  if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
    const baseUrl = env.IMAGE_BASE_URL || ''
    imageUrl = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}${imageUrl}`
  }

  // Format negotiation: AVIF → WebP → JPG
  let r2Object = null
  const accept = request.headers.get('Accept') || ''
  const formats = accept.includes('image/avif')
    ? ['avif', 'webp', 'jpg']
    : accept.includes('image/webp')
    ? ['webp', 'jpg']
    : ['jpg', 'webp']

  for (const ext of formats) {
    const objectKey = image.url.slice(1) + '.' + ext
    r2Object = await env.R2.get(objectKey)
    if (r2Object) break
  }

  if (!r2Object) {
    try {
      const response = await fetch(imageUrl)
      if (!response.ok) {
        return new Response('Image not found', { status: 404 })
      }

      const headers = new Headers()
      const contentType = response.headers.get('content-type')
      if (contentType) headers.set('Content-Type', contentType)
      headers.set('Cache-Control', 'public, max-age=86400')

      return new Response(response.body, { status: 200, headers })
    } catch {
      return new Response('Image not found', { status: 404 })
    }
  }

  const contentType = r2Object.httpMetadata.contentType || `image/${formats[0]}`
  const headers = new Headers()
  headers.set('Content-Type', contentType)
  headers.set('Cache-Control', 'public, max-age=86400')
  headers.set('Vary', 'Accept')

  return new Response(r2Object.body, { status: 200, headers })
}