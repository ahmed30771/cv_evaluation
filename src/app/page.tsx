import Link from "next/link";
import { BuilderChrome } from "@/components/BuilderChrome";

export default function HomePage() {
  return (
    <BuilderChrome
      actions={
        <>
          <Link href="/#evaluate" className="btn btn-ghost" style={{ padding: "0.45rem 0.9rem", fontSize: "0.92rem" }}>
            Score a CV
          </Link>
          <Link href="/build" className="btn btn-primary" style={{ padding: "0.45rem 0.9rem", fontSize: "0.92rem" }}>
            Build resume
          </Link>
        </>
      }
    >
      <main className="container" style={{ paddingTop: "3.5rem", paddingBottom: "4rem" }}>
        <section className="fade-up home-hero">
          <p className="home-eyebrow">Bluexech Resume</p>
          <h1 className="display home-title">Build a stand-out resume. Pass ATS when it matters.</h1>
          <p className="home-lead">
            Guided builder with polished templates, live preview, and DOCX/PDF export — plus optional AI scoring if you
            already have a CV.
          </p>
          <div className="home-cta-row">
            <Link href="/build" className="btn btn-primary">
              Start building
            </Link>
            <a href="#evaluate" className="btn btn-ghost">
              Score an existing CV
            </a>
          </div>
        </section>

        <section className="home-features fade-up-delay" aria-label="What you get">
          <article className="panel home-feature">
            <h2 className="display" style={{ margin: "0 0 0.4rem", fontSize: "1.15rem" }}>
              Templates
            </h2>
            <p style={{ margin: 0, color: "var(--muted)" }}>
              Classic and Compact for ATS. Sidebar and Split when you want a stronger visual layout.
            </p>
          </article>
          <article className="panel home-feature">
            <h2 className="display" style={{ margin: "0 0 0.4rem", fontSize: "1.15rem" }}>
              Live editor
            </h2>
            <p style={{ margin: 0, color: "var(--muted)" }}>
              Edit sections on the left and see the resume update instantly on the right.
            </p>
          </article>
          <article className="panel home-feature">
            <h2 className="display" style={{ margin: "0 0 0.4rem", fontSize: "1.15rem" }}>
              Export
            </h2>
            <p style={{ margin: 0, color: "var(--muted)" }}>Download PDF or DOCX when you are ready to apply.</p>
          </article>
        </section>

        <section id="evaluate" className="panel fade-up" style={{ marginTop: "2.5rem" }}>
          <h2 className="display" style={{ margin: "0 0 0.5rem", fontSize: "1.35rem" }}>
            Already have a CV?
          </h2>
          <p style={{ margin: "0 0 1rem", color: "var(--muted)" }}>
            Upload for AI scores and findings, then jump into the builder to fix and export.
          </p>
          <Link href="/evaluate" className="btn btn-primary">
            Evaluate CV
          </Link>
        </section>
      </main>
    </BuilderChrome>
  );
}
