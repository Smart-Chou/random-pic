import type { Env } from '../index'
import type { Image } from './random'

export async function getCategories(request: Request, env: Env): Promise<Response> {
  const baseUrl = env.IMAGE_BASE_URL || ''
  try {
    const response = await fetch(baseUrl + '/images.json')
    if (!response.ok) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: 'images.json not found' } }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const data = await response.json() as Image[]
    const categories = new Set<string>()

    for (const img of data) {
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
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: { code: 'ERROR', message: 'Failed to fetch categories' } }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}