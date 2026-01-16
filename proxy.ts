import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextRequest, NextFetchEvent } from 'next/server';

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  return clerkMiddleware()(request, event);
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};