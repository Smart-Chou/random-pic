export interface Image {
  id: string
  url: string
  category: string
  enabled: boolean
  weight?: number
  tags?: string[]
}

export interface ImageWithMeta extends Image {
  weight: number
  tags: string[]
}
