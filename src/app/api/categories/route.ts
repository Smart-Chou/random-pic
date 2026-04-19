import {NextResponse} from 'next/server'
import {getCategories} from '@/lib/image-service'

export async function GET() {
  try {
    const categories = await getCategories()

    return NextResponse.json({
      success: true,
      data: {
        categories,
        total: categories.length,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Internal server error',
        },
      },
      {status: 500}
    )
  }
}
