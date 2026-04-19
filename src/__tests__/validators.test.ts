import {describe, it, expect} from 'vitest'
import {validateImage, validateImagesData} from '@/lib/validators'

describe('validators', () => {
  describe('validateImage', () => {
    it('should validate a valid image', () => {
      const image = {
        id: '1',
        url: 'https://example.com/image.jpg',
        category: 'landscape',
        enabled: true,
      }

      const result = validateImage(image)
      expect(result.id).toBe('1')
      expect(result.url).toBe('https://example.com/image.jpg')
      expect(result.weight).toBe(1) // default
      expect(result.tags).toEqual([])
    })

    it('should apply defaults for optional fields', () => {
      const image = {
        id: '1',
        url: 'https://example.com/image.jpg',
        category: 'landscape',
        enabled: true,
        weight: 10,
        tags: ['tag1'],
      }

      const result = validateImage(image)
      expect(result.weight).toBe(10)
      expect(result.tags).toEqual(['tag1'])
    })

    it('should throw for missing required fields', () => {
      expect(() => validateImage({})).toThrow()
    })

    it('should throw for empty url', () => {
      expect(() =>
        validateImage({
          id: '1',
          url: '',
          category: 'landscape',
          enabled: true,
        })
      ).toThrow()
    })
  })

  describe('validateImagesData', () => {
    it('should validate an array of images', () => {
      const images = [
        {
          id: '1',
          url: 'https://example.com/1.jpg',
          category: 'landscape',
          enabled: true,
        },
        {
          id: '2',
          url: 'https://example.com/2.jpg',
          category: 'landscape',
          enabled: false,
        },
      ]

      const result = validateImagesData(images)
      expect(result).toHaveLength(2)
    })

    it('should throw for invalid data', () => {
      expect(() => validateImagesData([{id: '1'}])).toThrow()
    })
  })
})
