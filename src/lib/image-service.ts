import {
  getEnabledImages,
  getImagesByCategory,
  getCategories,
  getImageById,
} from './image-repository'
import type {ImageWithMeta} from '@/types/image'

/**
 * Image Service - Random Selection Module
 * Handles random image selection logic with weight support
 */

export function selectWeighted<T extends {weight: number}>(
  items: T[],
  seed?: number
): T | undefined {
  if (items.length === 0) {
    return undefined
  }

  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0)
  // Use provided seed or generate random base, then add time component to ensure uniqueness
  const random = (seed ?? Math.random()) * totalWeight + Date.now() % 1000

  let randomCopy = random

  for (const item of items) {
    randomCopy -= item.weight
    if (randomCopy <= 0) {
      return item
    }
  }

  return items[items.length - 1]
}

export interface RandomImageOptions {
  category?: string
  // 'weighted' - use weight-based random (default), 'random' - uniform random
  strategy?: 'random' | 'weighted'
}

export async function getRandomImage(
  options: RandomImageOptions = {}
): Promise<ImageWithMeta | null> {
  const {category} = options

  let images: ImageWithMeta[]

  if (category) {
    images = await getImagesByCategory(category)
  } else {
    images = await getEnabledImages()
  }

  if (images.length === 0) {
    return null
  }

  // Default: use weighted random
  return selectWeighted(images) ?? null
}

export {getCategories, getImageById}
