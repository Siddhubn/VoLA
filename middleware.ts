import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/profile',
  '/courses',
  '/settings'
]

// Routes that should redirect to dashboard if user is already authenticated
const authRoutes = [
  '/auth/login',
  '/auth/register'
]

// Try MongoDB first, fallback to simple auth
async function tryGetAuthToken(request: NextRequest) {
  try {
    const { getAuthTokenFromRequest, verifyToken } = await import('@/lib/auth')
    const token = getAuthTokenFromRequest(request)
    return token ? verifyToken(token) : null
  } catch (error) {
    console.log('MongoDB auth not available, using simple auth fallback')
    try {
      const { verifyToken } = await import('@/lib/simple-auth')
      const token = request.cookies.get('auth-token')?.value
      return token ? verifyToken(token) : null
    } catch (fallbackError) {
      console.error('Both auth systems failed:', fallbackError)
      return null
    }
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  try {
    const user = await tryGetAuthToken(request)

    // Check if the current route is protected
    const isProtectedRoute = protectedRoutes.some(route => 
      pathname.startsWith(route)
    )

    // Check if the current route is an auth route
    const isAuthRoute = authRoutes.some(route => 
      pathname.startsWith(route)
    )

    // If user is not authenticated and trying to access protected route
    if (isProtectedRoute && !user) {
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // If user is authenticated and trying to access auth routes
    if (isAuthRoute && user) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return NextResponse.next()
  } catch (error) {
    console.error('Middleware error:', error)
    // If there's an error, allow the request to continue
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}