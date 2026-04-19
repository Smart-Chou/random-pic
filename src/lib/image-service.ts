import {
  getEnabledImages,
  getImagesByCategory,
  getCategories,
  getImageById,
} from './image-repository';
import type { ImageWithMeta } from '@/types/image';

/**
 * Image Service - 随机选择模块
 * 负责图片的随机选择逻辑
 *
 * 使用权重随机选择，支持根据 weight 字段调整选中概率
 */

// Weighted random selection - 根据 weight 字段调整选中概率
export function selectWeighted<T extends { weight: number }>(items: T[]): T | undefined {
  if (items.length === 0) {
    return undefined;
  }

  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;

  for (const item of items) {
    random -= item.weight;
    if (random <= 0) {
      return item;
    }
  }

  return items[items.length - 1];
}

export interface RandomImageOptions {
  category?: string;
  // 'weighted' - 使用权重随机（默认），'random' - 均匀随机
  strategy?: 'random' | 'weighted';
}

export async function getRandomImage(options: RandomImageOptions = {}): Promise<ImageWithMeta | null> {
  const { category, strategy = 'weighted' } = options;

  let images: ImageWithMeta[];

  if (category) {
    images = await getImagesByCategory(category);
  } else {
    images = await getEnabledImages();
  }

  if (images.length === 0) {
    return null;
  }

  // Default: use weighted random
  return selectWeighted(images) ?? null;
}

export { getCategories, getImageById };