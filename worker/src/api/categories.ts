import type { Env } from '../index'
import type { Image } from './random'

export async function getCategories(request: Request, env: Env): Promise<Response> {
  // Fetch images from file via ASSETS
  const response = await env.ASSETS.fetch(new Request('/images.json'))
  if (!response.ok) {
    return new Response(
      JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: 'images.json not found' } }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const data = await response.json()
  const images: Image[] = data.images || []
  const categories = new Set<string>()

  for (const img of images) {
    if (img.enabled) {
      categories.add(img.category)
    }
  }

  const sortedCategories = Array.from(categories).sort()

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        categories: sortedCategories,
        total: sortedCategories.length,
      },
    }),
    {headers: {'Content-Type': 'application/json'}}
  )
}