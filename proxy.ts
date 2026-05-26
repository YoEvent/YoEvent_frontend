import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};

export default function middleware(req: NextRequest) {
  const url = req.nextUrl;

  // Get hostname (e.g. 'events.acmecorp.com', 'localhost:3000')
  const hostname = req.headers.get("host") || "";

  // Define the main platform domains (including local dev environments)
  const isMainPlatform = 
    hostname.includes("localhost") || 
    hostname.includes("127.0.0.1") || 
    hostname === "yoevent.com" || 
    hostname === "www.yoevent.com";

  // If it's a known main platform domain, don't rewrite, just pass through
  if (isMainPlatform) {
    return NextResponse.next();
  }

  // It's a custom domain! Rewrite to our dynamic tenant portfolio page
  // Example: events.acmecorp.com/about -> /site/events.acmecorp.com/about
  return NextResponse.rewrite(new URL(`/site/${hostname}${url.pathname}`, req.url));
}
