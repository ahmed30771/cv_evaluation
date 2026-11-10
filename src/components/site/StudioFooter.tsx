"use client";

import { useEffect, useRef } from "react";

export function StudioFooter() {
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

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
      const start = vh * 0.98;
      const end = vh * 0.45;
      const raw = (start - rect.top) / Math.max(start - end, 1);
      const p = Math.min(1, Math.max(0, raw));
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
    <div ref={stageRef} className="studio-footer-stage" style={{ ["--footer-p" as string]: 0 }}>
      <footer className="studio-footer">
        <p className="studio-footer-label">Created by</p>
        <p className="studio-footer-name">Muhammad Junaid</p>
        <p className="studio-footer-role">CEO · Bluexech AI</p>
        <nav className="studio-footer-links" aria-label="Creator contact">
          <a href="mailto:Junaid@bluexech.com">Junaid@bluexech.com</a>
          <a href="tel:+923092547332">+92 309 2547332</a>
          <a href="https://bluexech.com/" target="_blank" rel="noopener noreferrer">
            bluexech.com
          </a>
        </nav>
      </footer>
    </div>
  );
}
