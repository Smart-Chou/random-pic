import { describe, it, expect } from 'vitest';
import {
  selectWeighted,
} from '@/lib/image-service';

describe('image-service', () => {
  describe('selectWeighted', () => {
    it('should return undefined for empty array', () => {
      expect(selectWeighted([])).toBeUndefined();
    });

    it('should return items based on weight', () => {
      const items = [
        { id: '1', weight: 0 },
        { id: '2', weight: 100 },
      ];
      const results: string[] = [];
      for (let i = 0; i < 100; i++) {
        const result = selectWeighted(items);
        if (result) results.push(result.id);
      }
      expect(results.every((r) => r === '2')).toBe(true);
    });

    it('should distribute items according to weight', () => {
      const items = [
        { id: 'a', weight: 1 },
        { id: 'b', weight: 1 },
        { id: 'c', weight: 1 },
      ];
      const results = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const result = selectWeighted(items);
        if (result) results.add(result.id);
      }
      expect(results.size).toBe(3);
    });
  });
});