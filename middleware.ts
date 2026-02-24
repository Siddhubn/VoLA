import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Temporarily disabled for testing
export function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [],
}