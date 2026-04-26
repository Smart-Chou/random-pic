import type { Env } from '../index'
import { images } from './random'

export async function getCategories(_request: Request, _env: Env): Promise<Response> {
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
    { headers: { 'Content-Type': 'application/json' } }
  )
}