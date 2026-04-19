import {z} from 'zod'

export const imageSchema = z.object({
  id: z.string().min(1),
  url: z.string().min(1),
  category: z.string().min(1),
  enabled: z.boolean(),
  weight: z.number().min(0).max(100).default(1),
  tags: z.array(z.string()).default([]),
})

export const imagesDataSchema = z.array(imageSchema)

export type ImageInput = z.infer<typeof imageSchema>
export type ImagesDataInput = z.infer<typeof imagesDataSchema>

export function validateImage(data: unknown): ImageInput {
  return imageSchema.parse(data)
}

export function validateImagesData(data: unknown): ImagesDataInput {
  return imagesDataSchema.parse(data)
}
