import Link from "next/link";
import { headers } from "next/headers";
import { studioPath } from "@/lib/site";

export default async function StudioHomePage() {
  const host = (await headers()).get("host");
  return (
    <main className="studio-home">
      <div className="studio-home-hero sq-rise">
        <p className="studio-home-kicker">Resume Studio</p>
        <h1>Ship a resume that lands the offer.</h1>
        <p>
          Build from scratch or score an existing CV, then edit on a live canvas and export when you are ready.
        </p>
      </div>

      <div className="studio-home-grid">
        <Link href={studioPath("/build", host)} className="studio-home-card sq-rise">
          <span className="studio-home-card-index" aria-hidden>
            01
          </span>
          <strong>Build a resume</strong>
          <span>Templates, live editing, AI rewrite, PDF and DOCX export.</span>
          <span className="studio-home-card-cta">Open builder</span>
        </Link>
        <Link href={studioPath("/evaluate", host)} className="studio-home-card studio-home-card--secondary sq-rise-delay">
          <span className="studio-home-card-index" aria-hidden>
            02
          </span>
          <strong>Score a CV</strong>
          <span>ATS and content scores with findings you can fix in the builder.</span>
          <span className="studio-home-card-cta">Upload &amp; score</span>
        </Link>
      </div>

      <p className="studio-home-note">One workspace. Scores stay stable when you rewrite — then you polish and download.</p>
    </main>
  );
}
