"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { mainHref, studioPath } from "@/lib/site";

export function BuilderChrome({
  children,
  actions,
  subtitle,
}: {
  children: ReactNode;
  actions?: ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="builder-shell">
      <header className="builder-topbar">
        <div className="builder-topbar-inner">
          <Link href={studioPath("/")} className="builder-brand">
            <span className="builder-brand-name">
              Offer<em>quay</em>
            </span>
            <span className="builder-sub">{subtitle || "Studio"}</span>
          </Link>
          <div className="builder-actions">
            <a href={mainHref("/")} className="btn btn-ghost btn-compact">
              Main site
            </a>
            {actions}
          </div>
        </div>
      </header>
      <div className="builder-body">{children}</div>
    </div>
  );
}
