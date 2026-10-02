/**
 * Single Vercel project, two hosts:
 * - Main domain → marketing site (/www via middleware)
 * - app.* subdomain → CV studio (/studio via middleware)
 * Local path mode: NEXT_PUBLIC_APP_URL=http://localhost:3000/studio
 */

export function getHostFromHeaders(hostHeader: string | null): string {
  return (hostHeader || "").split(",")[0].trim().toLowerCase().split(":")[0];
}

export function isAppHost(host: string): boolean {
  const h = getHostFromHeaders(host);
  if (!h) return false;
  if (h.startsWith("app.")) return true;
  const configured = (process.env.APP_HOST || process.env.NEXT_PUBLIC_APP_HOST || "").toLowerCase();
  if (configured && h === configured.split(":")[0]) return true;
  return false;
}

/** Public origin for the CV product (subdomain or /studio path). */
export function getAppOrigin(): string {
  if (typeof window !== "undefined") {
    const fromEnv = process.env.NEXT_PUBLIC_APP_URL;
    if (fromEnv) return fromEnv.replace(/\/$/, "");
    if (window.location.hostname.startsWith("app.")) return window.location.origin;
    return `${window.location.origin}/studio`;
  }
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000/studio").replace(/\/$/, "");
}

/** Public origin for the marketing site. */
export function getMainOrigin(): string {
  if (typeof window !== "undefined") {
    const fromEnv = process.env.NEXT_PUBLIC_MAIN_URL;
    if (fromEnv) return fromEnv.replace(/\/$/, "");
    if (window.location.hostname.startsWith("app.")) {
      return `${window.location.protocol}//${window.location.hostname.replace(/^app\./, "")}${
        window.location.port ? `:${window.location.port}` : ""
      }`;
    }
    return window.location.origin;
  }
  return (process.env.NEXT_PUBLIC_MAIN_URL || "http://localhost:3000").replace(/\/$/, "");
}

/** Path inside the studio app (host-aware: bare on app.* , prefixed on /studio). */
export function studioPath(path = "/", hostHint?: string | null): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (hostHint && isAppHost(hostHint)) {
    return p === "" ? "/" : p;
  }
  const usePrefix =
    (typeof window !== "undefined" && window.location.pathname.startsWith("/studio")) ||
    (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "").endsWith("/studio") ||
    (!hostHint && process.env.NODE_ENV !== "production");

  // Default local/dev to /studio prefix unless clearly on an app host.
  if (usePrefix && !(hostHint && isAppHost(hostHint))) {
    if (p === "/" || p === "") return "/studio";
    return `/studio${p}`;
  }
  return p === "" ? "/" : p;
}

/** Build a URL into the studio app. */
export function appHref(path = "/"): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  const origin = getAppOrigin();
  if (origin.endsWith("/studio")) {
    if (p === "/" || p === "") return origin;
    return `${origin}${p}`;
  }
  return `${origin}${p === "/" ? "" : p}`;
}

export function mainHref(path = "/"): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  const origin = getMainOrigin();
  return `${origin}${p === "/" ? "" : p}`;
}
