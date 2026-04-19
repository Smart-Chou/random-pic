import type {Env} from '../index'
import type {Image} from './random'

interface EnvExtended extends Env {
  IMAGES: KVNamespace
}

export async function getCategories(request: Request, env: EnvExtended): Promise<Response> {
  const list = await env.IMAGES.list()
  const categories = new Set<string>()

  for (const key of list.keys) {
    const value = await env.IMAGES.get(key.name, 'json')
    if (value) {
      const img = value as Image
      if (img.enabled) {
        categories.add(img.category)
      }
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
