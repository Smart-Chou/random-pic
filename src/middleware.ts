import {NextRequest, NextResponse} from 'next/server'

export function middleware(request: NextRequest) {
  const {pathname} = request.nextUrl

  // Block direct access to /images/* (hide original URLs)
  if (pathname.startsWith('/images/')) {
    return new NextResponse('Forbidden', {status: 403})
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/:path*',
}
