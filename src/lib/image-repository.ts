import {readFile} from 'fs/promises'
import {join} from 'path'
import {validateImagesData} from './validators'
import type {ImageWithMeta} from '@/types/image'

const DATA_FILE_PATH = 'data/images.json'

/**
 * Image Repository - Data Access Module
 * Reads image data from local file
 */

interface CacheEntry {
  data: ImageWithMeta[]
  timestamp: number
}

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes cache
let cachedImages: CacheEntry | null = null

export async function loadImages(): Promise<ImageWithMeta[]> {
  const now = Date.now()
  if (cachedImages && now - cachedImages.timestamp < CACHE_TTL) {
    return cachedImages.data
  }

  const filePath = join(process.cwd(), DATA_FILE_PATH)
  const content = await readFile(filePath, 'utf-8')
  const rawData = JSON.parse(content)

  const validated = validateImagesData(rawData)

  // Apply defaults
  const data = validated.map((img) => ({
    ...img,
    weight: img.weight ?? 1,
    tags: img.tags ?? [],
  }))

  cachedImages = {data, timestamp: now}
  return data
}

export async function getEnabledImages(): Promise<ImageWithMeta[]> {
  const images = await loadImages()
  return images.filter((img) => img.enabled)
}

export async function getImagesByCategory(category: string): Promise<ImageWithMeta[]> {
  const enabledImages = await getEnabledImages()
  return enabledImages.filter((img) => img.category === category)
}

export async function getCategories(): Promise<string[]> {
  const images = await getEnabledImages()
  const categories = new Set(images.map((img) => img.category))
  return Array.from(categories).sort()
}

export function clearCache(): void {
  cachedImages = null
}
