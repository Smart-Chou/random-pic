import {NextRequest, NextResponse} from 'next/server'

const REFERER_WHITELIST = (process.env.REFERER_WHITELIST || '').split(',').filter(Boolean)

export function middleware(request: NextRequest) {
  const {pathname} = request.nextUrl

  // Block direct access to /images/* (hide original URLs)
  if (pathname.startsWith('/images/')) {
    return new NextResponse('Forbidden', {status: 403})
  }

  // CORS for API routes
  if (pathname.startsWith('/api/')) {
    const response = NextResponse.next()
    const origin = request.headers.get('origin')
    if (origin) {
      response.headers.set('Access-Control-Allow-Origin', origin)
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      response.headers.set('Access-Control-Max-Age', '86400')
    }
    if (request.method === 'OPTIONS') {
      return response
    }
    return response
  }

  // Image protection with referer
  if (pathname.startsWith('/uploads/')) {
    const referer = request.headers.get('referer') || ''

    if (REFERER_WHITELIST.length > 0) {
      const isWhitelisted = REFERER_WHITELIST.some((domain) => referer.includes(domain))
      if (isWhitelisted) {
        return NextResponse.next()
      }
      return new NextResponse('Forbidden - Hotlinking not allowed', {status: 403})
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/:path*',
}
