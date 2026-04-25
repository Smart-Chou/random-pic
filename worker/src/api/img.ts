import type {Env} from '../index'
import type {Image} from './random'

interface EnvExtended extends Env {
  IMAGES: KVNamespace
  R2: R2Bucket
}

export async function getImageById(request: Request, env: EnvExtended): Promise<Response> {
  const url = new URL(request.url)
  const imageId = url.searchParams.get('id')

  if (!imageId) {
    return new Response(
      JSON.stringify({
        success: false,
        error: {code: 'MISSING_ID', message: 'Image ID is required'},
      }),
      {status: 400, headers: {'Content-Type': 'application/json'}}
    )
  }

  const image = (await env.IMAGES.get(imageId, 'json')) as Image | null

  if (!image) {
    return new Response('Image not found', {status: 404})
  }

  // Format negotiation
  const accept = request.headers.get('Accept') || ''
  const formats = accept.includes('image/avif')
    ? ['avif', 'webp', 'jpg']
    : accept.includes('image/webp')
    ? ['webp', 'jpg']
    : ['jpg', 'webp']

  const objectKey = image.url.slice(1)
  let imageObject = null
  for (const ext of formats) {
    imageObject = await env.R2.get(`${objectKey}.${ext}`)
    if (imageObject) break
  }

  if (!imageObject) {
    return new Response('Image not found', {status: 404})
  }

  const contentType = imageObject.httpMetadata.contentType || `image/${formats[0]}`
  const headers = new Headers()
  headers.set('Content-Type', contentType)
  headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  headers.set('Vary', 'Accept')

  return new Response(imageObject.body, {
    status: 200,
    headers,
  })
}