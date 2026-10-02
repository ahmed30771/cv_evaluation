import { NextResponse, type NextRequest } from "next/server";
import { getHostFromHeaders, isAppHost } from "@/lib/site";

const STUDIO_PATHS = [/^\/build(?:\/|$)/, /^\/evaluate(?:\/|$)/, /^\/evaluations(?:\/|$)/];

function isBareStudioPath(pathname: string) {
  return STUDIO_PATHS.some((re) => re.test(pathname));
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  // Internal route groups — never double-wrap
  if (pathname.startsWith("/studio") || pathname.startsWith("/www")) {
    return NextResponse.next();
  }

  const host = getHostFromHeaders(req.headers.get("host"));
  const appHost = isAppHost(host);
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");

  // App subdomain → rewrite into /studio/*
  if (appHost) {
    const url = req.nextUrl.clone();
    url.pathname = pathname === "/" ? "/studio" : `/studio${pathname}`;
    return NextResponse.rewrite(url);
  }

  // Main domain: bare product paths → app URL (subdomain or /studio path)
  if (isBareStudioPath(pathname)) {
    if (appUrl.endsWith("/studio")) {
      return NextResponse.redirect(new URL(`/studio${pathname}`, req.url));
    }
    if (appUrl) {
      return NextResponse.redirect(new URL(`${appUrl}${pathname}`));
    }
    return NextResponse.redirect(new URL(`/studio${pathname}`, req.url));
  }

  // Marketing site
  const url = req.nextUrl.clone();
  url.pathname = pathname === "/" ? "/www" : `/www${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
};
