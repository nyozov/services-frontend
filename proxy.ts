import { clerkMiddleware } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest, NextFetchEvent } from 'next/server'

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  return clerkMiddleware(async (auth, req) => {
    const { userId } = await auth()

    const { pathname } = req.nextUrl

    const authRoutes = ['/sign-in', '/sign-up', '/forgot-password']

    const isAuthRoute = authRoutes.some((route) =>
      pathname.startsWith(route)
    )

    // Redirect signed-in users away from auth pages
    if (userId && isAuthRoute) {
      const url = req.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    return NextResponse.next()
  })(request, event)
}
