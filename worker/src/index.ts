import {getRandomImage} from './api/random'
import {getImageById} from './api/img'
import {getCategories} from './api/categories'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    // CORS headers
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      })
    }

    try {
      // API routes
      if (path === '/api/random' || path.startsWith('/api/random')) {
        return getRandomImage(request, env)
      }
      if (path === '/api/img' || path.startsWith('/api/img')) {
        return getImageById(request, env)
      }
      if (path === '/api/categories' || path.startsWith('/api/categories')) {
        return getCategories(request, env)
      }
      if (path === '/api/health' || path.startsWith('/api/health')) {
        return new Response(JSON.stringify({success: true, data: {status: 'ok'}}), {
          headers: {'Content-Type': 'application/json'},
        })
      }

      // Serve static assets
      return env.ASSETS.fetch(request)
    } catch (err) {
      console.error(err)
      return new Response(
        JSON.stringify({
          success: false,
          error: {code: 'INTERNAL_ERROR', message: err.message},
        }),
        {status: 500, headers: {'Content-Type': 'application/json'}}
      )
    }
  },
} satisfies ExportedHandler<Env>

export interface Env {
  R2: R2Bucket
  IMAGES: KVNamespace
  ASSETS: Fetcher
}
