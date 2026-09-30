import Link from "next/link";
import type { ReactNode } from "react";

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
          <Link href="/" className="builder-brand">
            <span className="builder-mark" aria-hidden />
            <span>
              <strong>Bluexech Resume</strong>
              {subtitle ? <span className="builder-sub">{subtitle}</span> : null}
            </span>
          </Link>
          <div className="builder-actions">{actions}</div>
        </div>
      </header>
      <div className="builder-body">{children}</div>
    </div>
  );
}
