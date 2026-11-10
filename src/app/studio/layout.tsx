import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { mainHref, studioPath } from "@/lib/site";
import "./studio.css";

export const metadata: Metadata = {
  title: "Offerquay Resume Studio",
  description: "Build, score, and export ATS-friendly resumes.",
};

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const host = (await headers()).get("host");
  const home = studioPath("/", host);
  const build = studioPath("/build", host);
  const evaluate = studioPath("/evaluate", host);

  return (
    <div className="studio-shell">
      <header className="studio-topbar">
        <div className="studio-topbar-inner">
          <Link href={home} className="studio-brand">
            <span className="studio-brand-name">
              Offer<em>quay</em>
            </span>
            <span className="studio-brand-product">Studio</span>
          </Link>
          <nav className="studio-nav" aria-label="Studio">
            <Link href={build}>Build</Link>
            <Link href={evaluate}>Score</Link>
            <a href={mainHref("/")} className="studio-nav-home">
              Main site
            </a>
          </nav>
        </div>
      </header>
      <div className="studio-body">{children}</div>
      <footer className="studio-footer">
        <p>
          Created by <strong>Muhammad Junaid</strong>
          <span aria-hidden> · </span>
          <a href="mailto:muhamadjunaid27@gmail.com">muhamadjunaid27@gmail.com</a>
          <span aria-hidden> · </span>
          <a href="tel:+923092547332">+92 309 2547332</a>
        </p>
        <p>
          <a href="https://bluexech.com/" target="_blank" rel="noopener noreferrer">
            BluexechAI
          </a>
        </p>
      </footer>
    </div>
  );
}
