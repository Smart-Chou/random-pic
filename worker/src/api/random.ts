import type { Env } from '../index'
import { images } from '../data/images'

export { images }

export interface Image {
  id: number
  name: string
  hash: string
  url: string
  category: string
  enabled: boolean
  weight: number
  tags: string[]
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
    JSON.stringify({ success: false, error: { code, message } }),
    { status: 400, headers: { 'Content-Type': 'application/json' } }
  )
}

export async function getRandomImage(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const searchParams = url.searchParams
  const category = searchParams.get('category') ?? undefined
  const format = searchParams.get('format')

  const enabledImages = images.filter((img) => img.enabled)

  if (category) {
    const categories = new Set(enabledImages.map((img) => img.category))
    if (!categories.has(category)) {
      return errorResponse('CATEGORY_NOT_FOUND', `Category '${category}' not found`)
    }
  }

  let filtered = enabledImages
  if (category) {
    filtered = enabledImages.filter((img) => img.category === category)
  }

  if (filtered.length === 0) {
    return errorResponse('NO_IMAGES', 'No images available')
  }

  const image = selectWeighted(filtered)
  if (!image) {
    return errorResponse('NO_IMAGE', 'Failed to select image')
  }

  if (format === 'json') {
    return new Response(
      JSON.stringify({
        success: true,
        data: { id: image.id, url: `/api/pic${image.url}`, category: image.category, tags: image.tags },
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  }

  let imageUrl = image.url
  if (!imageUrl.startsWith('http')) {
    const baseUrl = env.IMAGE_BASE_URL || ''
    imageUrl = baseUrl ? `${baseUrl}${imageUrl}` : imageUrl
  }

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

  const contentType = r2Object.httpMetadata?.contentType || `image/${formats[0]}`
  const headers = new Headers()
  headers.set('Content-Type', contentType)
  headers.set('Cache-Control', 'public, max-age=86400')
  headers.set('Vary', 'Accept')
  return new Response(r2Object.body, { status: 200, headers })
}