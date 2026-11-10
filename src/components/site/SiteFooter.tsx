"use client";

import { useEffect, useRef } from "react";

export function SiteFooter() {
  const stageRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const footer = footerRef.current;
    if (!stage || !footer) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      stage.style.setProperty("--footer-p", "1");
      return;
    }

    let frame = 0;

    const update = () => {
      frame = 0;
      const rect = stage.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // Start when footer stage is approaching from below; finish when mostly on screen.
      const start = vh * 0.98;
      const end = vh * 0.42;
      const raw = (start - rect.top) / Math.max(start - end, 1);
      const p = Math.min(1, Math.max(0, raw));
      // Smoothstep for a clearer ease-in/out feel while scrubbing.
      const eased = p * p * (3 - 2 * p);
      stage.style.setProperty("--footer-p", eased.toFixed(4));
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div ref={stageRef} className="bx-footer-stage" style={{ ["--footer-p" as string]: 0 }}>
      <footer ref={footerRef} className="bx-footer">
        <div className="bx-footer-brand">
          <strong>
            Offer<em>quay</em>
          </strong>
          <span>Job-ready tools for ambitious careers.</span>
        </div>

        <div className="bx-footer-credit">
          <p className="bx-footer-credit-label">Created by</p>
          <p className="bx-footer-name">Muhammad Junaid</p>
          <p className="bx-footer-role">CEO · Bluexech AI</p>
          <nav className="bx-footer-links" aria-label="Creator contact">
            <a href="mailto:Junaid@bluexech.com">Junaid@bluexech.com</a>
            <a href="tel:+923092547332">+92 309 2547332</a>
            <a href="https://bluexech.com/" target="_blank" rel="noopener noreferrer">
              bluexech.com
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
