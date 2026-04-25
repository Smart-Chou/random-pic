import {NextRequest, NextResponse} from 'next/server'

// R2 storage domain
const R2_BASE_URL = process.env.IMAGE_BASE_URL || ''

export async function GET(request: NextRequest) {
  const {pathname} = request.nextUrl

  // Parse the image path from /api/pic/meitu/xxx.webp -> /meitu/xxx.webp
  const imagePath = pathname.replace(/^\/api\/pic/, '')

  if (!imagePath || imagePath === '/') {
    return new NextResponse('Not found', {status: 404})
  }

  // Build the R2 URL (where images are actually stored)
  const r2Url = `https://${R2_BASE_URL}${imagePath}`

  // Proxy mode: fetch from R2 and stream to user (hides R2 URL)
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)

    const response = await fetch(r2Url, {signal: controller.signal})
    clearTimeout(timeoutId)

    if (!response.ok) {
      return new NextResponse('Image not found', {status: 404})
    }

    const imageBuffer = await response.arrayBuffer()

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': response.headers.get('content-type') || 'image/webp',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (error) {
    console.error('Proxy fetch error:', error)
    return new NextResponse('Failed to fetch image', {status: 500})
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
