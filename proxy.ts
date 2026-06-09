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
  const pathname = url.pathname;

  // Get hostname (e.g. 'tenant.localhost:3000', 'localhost:3000', 'tenant.yowevent.com')
  const hostname = req.headers.get("host") || "";
  const host = hostname.split(":")[0].toLowerCase();

  // Define platform-level paths that should not be rewritten
  const platformPaths = [
    "/api",
    "/_next",
    "/login",
    "/register",
    "/admin",
    "/super-admin",
    "/pricing",
    "/events",
    "/calendar",
    "/updates",
    "/developers",
    "/user",
    "/utils",
    "/favicon.ico"
  ];

  const isPlatformPath = platformPaths.some(
    path => pathname === path || pathname.startsWith(path + "/")
  );

  if (isPlatformPath) {
    return NextResponse.next();
  }

  // Check if the host has a tenant subdomain (e.g., tenant.localhost or tenant.yowevent.com)
  let isSubdomain = false;
  let tenantSlug = "";

  if (host.endsWith(".localhost")) {
    isSubdomain = true;
    tenantSlug = host.slice(0, -".localhost".length);
  } else if (host.endsWith(".yowevent.com") && host !== "www.yowevent.com") {
    isSubdomain = true;
    tenantSlug = host.slice(0, -".yowevent.com".length);
  }

  if (isSubdomain && tenantSlug) {
    // Rewrite to /t/[slug]
    return NextResponse.rewrite(new URL(`/t/${tenantSlug}${pathname}`, req.url));
  }

  // Check if it's the main platform domain itself
  const isMainPlatform = 
    host === "localhost" || 
    host === "127.0.0.1" || 
    host === "yowevent.com" || 
    host === "www.yowevent.com";

  if (isMainPlatform) {
    return NextResponse.next();
  }

  // Otherwise, it's a custom domain, rewrite to /site/[domain]
  return NextResponse.rewrite(new URL(`/site/${hostname}${pathname}`, req.url));
}
