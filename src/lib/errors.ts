export type ErrorCode =
  | 'INVALID_QUERY'
  | 'CATEGORY_NOT_FOUND'
  | 'NO_AVAILABLE_IMAGES'
  | 'EMPTY_DATA'
  | 'INVALID_DATA'
  | 'FORBIDDEN'
  | 'INTERNAL_ERROR'

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string
  ) {
    super(message)
    this.name = 'AppError'
  }

  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
      },
    }
  }
}

export function invalidQuery(message: string): AppError {
  return new AppError('INVALID_QUERY', message)
}

export function categoryNotFound(category: string): AppError {
  return new AppError('CATEGORY_NOT_FOUND', `Category not found: ${category}`)
}

export function noAvailableImages(): AppError {
  return new AppError('NO_AVAILABLE_IMAGES', 'No available images in this category')
}

export function emptyData(): AppError {
  return new AppError('EMPTY_DATA', 'Image data is empty')
}

export function invalidData(cause: string): AppError {
  return new AppError('INVALID_DATA', `Invalid data: ${cause}`)
}

export function forbidden(reason: string): AppError {
  return new AppError('FORBIDDEN', reason)
}
