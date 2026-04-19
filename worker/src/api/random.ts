import type {Env} from '../index'

interface Image {
  id: string
  url: string
  category: string
  enabled: boolean
  weight: number
  tags: string[]
}

interface EnvExtended extends Env {
  IMAGES: KVNamespace
  R2: R2Bucket
}

// In-memory cache
let cachedImages: Image[] | null = null
let cacheTime = 0
const CACHE_TTL = 5 * 60 * 1000

async function loadImages(env: EnvExtended): Promise<Image[]> {
  const now = Date.now()
  if (cachedImages && now - cacheTime < CACHE_TTL) {
    return cachedImages
  }

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

export async function getRandomImage(request: Request, env: EnvExtended): Promise<Response> {
  const url = new URL(request.url)
  const category = url.searchParams.get('category') ?? undefined
  const format = url.searchParams.get('format')

  // Get images from KV
  const allImages = await loadImages(env)
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
          url: image.url,
          category: image.category,
          tags: image.tags,
        },
      }),
      {headers: {'Content-Type': 'application/json'}}
    )
  }

  // Proxy mode: fetch from R2 and stream to client
  // image.url is like "/images/landscape/webp/xxx.webp"
  const objectKey = image.url.slice(1) // Remove leading "/"
  const r2Object = await env.R2.get(objectKey)

  if (!r2Object) {
    return new Response('Image not found', {status: 404})
  }

  const headers = new Headers()
  headers.set('Content-Type', r2Object.httpMetadata.contentType || 'image/webp')
  headers.set('Cache-Control', 'public, max-age=86400')

  return new Response(r2Object.body, {
    status: 200,
    headers,
  })
}
