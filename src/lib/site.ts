/**
 * Single Vercel project, two modes:
 * - Path mode (default): marketing `/` + studio `/studio` on the same host
 * - Dual host: main domain + `app.*` subdomain (set NEXT_PUBLIC_* + APP_HOST)
 *
 * Never bake localhost into production links. On Vercel, leave NEXT_PUBLIC_APP_URL
 * unset for path mode, or set real production URLs.
 */

function stripTrailingSlash(url: string) {
  return url.replace(/\/$/, "");
}

function isLocalhostUrl(url: string) {
  return /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?/i.test(url);
}

function isProductionRuntime() {
  return process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
}

/** Env URL only if it is usable on this runtime (ignore localhost on Vercel/prod). */
function readPublicUrl(value: string | undefined): string {
  const v = stripTrailingSlash((value || "").trim());
  if (!v) return "";
  if (isLocalhostUrl(v) && isProductionRuntime()) return "";
  if (typeof window !== "undefined" && isLocalhostUrl(v) && !isLocalhostUrl(window.location.origin)) {
    return "";
  }
  return v;
}

function vercelDeploymentOrigin(): string {
  const raw = (process.env.VERCEL_URL || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (!raw) return "";
  return `https://${raw}`;
}

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

/** True when studio lives under `/studio` on the same host (not a separate app subdomain). */
export function isStudioPathMode(origin = getAppOrigin()): boolean {
  return !origin || origin.endsWith("/studio") || isLocalhostUrl(origin);
}

/** Public origin for the CV product (subdomain or …/studio path). */
export function getAppOrigin(): string {
  const fromEnv = readPublicUrl(process.env.NEXT_PUBLIC_APP_URL);

  if (typeof window !== "undefined") {
    if (fromEnv) return fromEnv;
    if (window.location.hostname.startsWith("app.")) return window.location.origin;
    return `${window.location.origin}/studio`;
  }

  if (fromEnv) return fromEnv;
  const deploy = vercelDeploymentOrigin();
  if (deploy) return `${deploy}/studio`;
  return "http://localhost:3000/studio";
}

/** Public origin for the marketing site. */
export function getMainOrigin(): string {
  const fromEnv = readPublicUrl(process.env.NEXT_PUBLIC_MAIN_URL);

  if (typeof window !== "undefined") {
    if (fromEnv) return fromEnv;
    if (window.location.hostname.startsWith("app.")) {
      return `${window.location.protocol}//${window.location.hostname.replace(/^app\./, "")}${
        window.location.port ? `:${window.location.port}` : ""
      }`;
    }
    return window.location.origin;
  }

  if (fromEnv) return fromEnv;
  const deploy = vercelDeploymentOrigin();
  if (deploy) return deploy;
  return "http://localhost:3000";
}

/** Path inside the studio app (host-aware: bare on app.* , prefixed on /studio). */
export function studioPath(path = "/", hostHint?: string | null): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (hostHint && isAppHost(hostHint)) {
    return p === "" ? "/" : p;
  }

  const appUrl = readPublicUrl(process.env.NEXT_PUBLIC_APP_URL);
  const usePrefix =
    (typeof window !== "undefined" && window.location.pathname.startsWith("/studio")) ||
    appUrl.endsWith("/studio") ||
    (!appUrl && !isAppHost(hostHint || "")) ||
    (!hostHint && !isProductionRuntime());

  if (usePrefix && !(hostHint && isAppHost(hostHint))) {
    if (p === "/" || p === "") return "/studio";
    return `/studio${p}`;
  }
  return p === "" ? "/" : p;
}

/** Link into the studio app — relative in path mode so any Vercel domain works. */
export function appHref(path = "/"): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  const origin = getAppOrigin();

  if (isStudioPathMode(origin)) {
    if (p === "/" || p === "") return "/studio";
    return `/studio${p}`;
  }

  return `${origin}${p === "/" ? "" : p}`;
}

/** Link into the marketing site — relative when same host / path mode. */
export function mainHref(path = "/"): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  const origin = getMainOrigin();
  const appOrigin = getAppOrigin();

  if (isStudioPathMode(appOrigin) || isLocalhostUrl(origin)) {
    return p === "/" ? "/" : p;
  }

  return `${origin}${p === "/" ? "" : p}`;
}
