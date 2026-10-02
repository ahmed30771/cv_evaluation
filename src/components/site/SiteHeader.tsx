"use client";

import { useEffect, useState } from "react";
import { appHref, mainHref } from "@/lib/site";

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`bx-nav ${scrolled ? "is-scrolled" : ""}`}>
      <a className="bx-nav-brand" href={mainHref("/")}>
        Offer<em>quay</em>
      </a>
      <nav className="bx-nav-links" aria-label="Primary">
        <a href="#products">Products</a>
        <a href={appHref("/evaluate")}>Score a CV</a>
        <a className="bx-nav-cta" href={appHref("/")}>
          Open app
        </a>
      </nav>
    </header>
  );
}
