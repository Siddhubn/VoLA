import { NextResponse } from 'next/server'

// Try MongoDB first, fallback to simple auth
async function tryMongoAuth() {
  try {
    const { removeAuthCookie } = await import('@/lib/auth')
    return { removeAuthCookie }
  } catch (error) {
    console.log('MongoDB not available, using simple auth fallback')
    const { removeAuthCookie } = await import('@/lib/simple-auth')
    return { removeAuthCookie }
  }
}

export async function POST() {
  try {
    const authModule = await tryMongoAuth()
    const { removeAuthCookie } = authModule

    // Remove auth cookie
    removeAuthCookie()

    return NextResponse.json({
      message: 'Logout successful'
    })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Internal server error. Please check the console for details.' },
      { status: 500 }
    )
  }
}