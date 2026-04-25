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

export async function getImageByPath(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const pathname = url.pathname

  // Parse: /api/pic/meitu/landscape/xxx or /api/pic/meitu/landscape/xxx.webp
  const imagePath = pathname.replace(/^\/api\/pic/, '')

  if (!imagePath || imagePath === '/') {
    return new Response('Not found', { status: 404 })
  }

  // Get base path (without extension)
  const basePath = imagePath.replace(/^\//, '').replace(/\.(jpg|webp|avif|png|jpeg)$/i, '')

  // Format negotiation: AVIF → WebP → JPG
  const accept = request.headers.get('Accept') || ''
  const formats = accept.includes('image/avif')
    ? ['avif', 'webp', 'jpg', 'png', 'jpeg']
    : accept.includes('image/webp')
    ? ['webp', 'jpg', 'png', 'jpeg']
    : ['jpg', 'png', 'jpeg', 'webp']

  let r2Object = null
  for (const ext of formats) {
    r2Object = await env.R2.get(`${basePath}.${ext}`)
    if (r2Object) break
  }

  if (!r2Object) {
    return new Response('Image not found', { status: 404 })
  }

  const contentType = r2Object.httpMetadata.contentType || 'image/jpeg'
  const headers = new Headers()
  headers.set('Content-Type', contentType)
  headers.set('Cache-Control', 'public, max-age=86400')
  headers.set('Vary', 'Accept')

  return new Response(r2Object.body, { status: 200, headers })
}