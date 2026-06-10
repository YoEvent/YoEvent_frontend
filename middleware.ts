import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};

export default function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const pathname = url.pathname;

  const hostname = req.headers.get("host") || "";
  const host = hostname.split(":")[0].toLowerCase();

  // Platform-level paths — always served directly, never rewritten to a tenant
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
    "/eventaas",
    "/user",
    "/utils",
    "/favicon.ico",
  ];

  const isPlatformPath = platformPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  if (isPlatformPath) {
    return NextResponse.next();
  }

  // Tenant subdomain: tenant.localhost or tenant.yowevent.com
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
    return NextResponse.rewrite(new URL(`/t/${tenantSlug}${pathname}`, req.url));
  }

  const isMainPlatform =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "yowevent.com" ||
    host === "www.yowevent.com";

  if (isMainPlatform) {
    return NextResponse.next();
  }

  // Custom domain → /site/[domain]
  return NextResponse.rewrite(new URL(`/site/${hostname}${pathname}`, req.url));
}
