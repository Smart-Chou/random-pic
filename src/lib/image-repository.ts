import { readFile } from 'fs/promises';
import { join } from 'path';
import { validateImagesData } from './validators';
import { config } from './config';
import type { ImageWithMeta } from '@/types/image';

/**
 * Image Repository - 数据读取模块
 * 负责从数据文件中读取图片数据
 *
 * 预留未来扩展：未来可替换为 Prisma + PostgreSQL
 */

interface CacheEntry {
  data: ImageWithMeta[];
  timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 分钟缓存
let cachedImages: CacheEntry | null = null;

export async function loadImages(): Promise<ImageWithMeta[]> {
  const now = Date.now();
  if (cachedImages && now - cachedImages.timestamp < CACHE_TTL) {
    return cachedImages.data;
  }

  const filePath = join(process.cwd(), config.dataFilePath);
  const content = await readFile(filePath, 'utf-8');
  const rawData = JSON.parse(content);

  const validated = validateImagesData(rawData);

  // Apply defaults
  const data = validated.map((img) => ({
    ...img,
    weight: img.weight ?? 1,
    tags: img.tags ?? [],
  }));

  cachedImages = { data, timestamp: now };
  return data;
}

export async function getEnabledImages(): Promise<ImageWithMeta[]> {
  const images = await loadImages();
  return images.filter((img) => img.enabled);
}

export async function getImagesByCategory(category: string): Promise<ImageWithMeta[]> {
  const enabledImages = await getEnabledImages();
  return enabledImages.filter((img) => img.category === category);
}

export async function getCategories(): Promise<string[]> {
  const images = await getEnabledImages();
  const categories = new Set(images.map((img) => img.category));
  return Array.from(categories).sort();
}

export async function getImageById(id: string): Promise<ImageWithMeta | null> {
  const images = await loadImages();
  return images.find((img) => img.id === id) ?? null;
}

export function clearCache(): void {
  cachedImages = null;
}