import {getRandomImage} from './api/random'
import {getImageByPath} from './api/img'
import {getCategories} from './api/categories'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    // CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, Referer',
        },
      })
    }

    try {
      // API routes
      if (path === '/api/random' || path.startsWith('/api/random')) {
        return getRandomImage(request, env)
      }
      if (path === '/api/pic' || path.startsWith('/api/pic')) {
        return getImageByPath(request, env)
      }
      if (path === '/api/categories' || path.startsWith('/api/categories')) {
        return getCategories(request, env)
      }
      if (path === '/api/health' || path.startsWith('/api/health')) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {status: 'ok', timestamp: new Date().toISOString()},
          }),
          {headers: {'Content-Type': 'application/json'}}
        )
      }

      // nico.gif - 404 fallback image
      if (path === '/nico.gif') {
        const nicoResponse = await env.ASSETS.fetch(new Request('/nico.gif'))
        if (nicoResponse.ok) {
          return new Response(nicoResponse.body, {
            status: 404,
            headers: { 'Content-Type': 'image/gif' },
          })
        }
        return new Response('Not found', { status: 404 })
      }

      // Serve static assets (index.html, favicon, etc.)
      return env.ASSETS.fetch(request)
    } catch (err) {
      console.error(err)
      return new Response(
        JSON.stringify({
          success: false,
          error: {code: 'INTERNAL_ERROR', message: String(err)},
        }),
        {status: 500, headers: {'Content-Type': 'application/json'}}
      )
    }
  },
} satisfies ExportedHandler<Env>

export interface Env {
  R2: R2Bucket
  ASSETS: Fetcher
  // From Cloudflare Settings > Environment Variables
  REFERER_WHITELIST?: string
  IMAGE_BASE_URL?: string
}