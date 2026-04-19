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

  // Proxy mode: fetch from R2
  const objectKey = image.url.slice(1)
  const r2Object = await env.R2.get(objectKey)

  if (!r2Object) {
    return new Response('Image not found', {status: 404})
  }

  const headers = new Headers()
  headers.set('Content-Type', r2Object.httpMetadata.contentType || 'image/webp')
  headers.set('Cache-Control', 'public, max-age=31536000')

  return new Response(r2Object.body, {
    status: 200,
    headers,
  })
}
