import { SiteChatbot } from "@/components/site/SiteChatbot";
import { SiteHeader } from "@/components/site/SiteHeader";
import { appHref } from "@/lib/site";

export default function WwwHomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="bx-hero">
          <div className="bx-hero-glow" aria-hidden />
          <div className="bx-hero-grid" aria-hidden />
          <div className="bx-hero-inner">
            <p className="bx-brand-lockup">
              Offer<em>quay</em>
            </p>
            <h1 className="bx-hero-title">
              Get job-ready.
              <span>Stay ahead.</span>
            </h1>
            <p className="bx-hero-lead">
              One place to sharpen your career tools — starting with a serious Resume Studio. Interview prep and more are
              on the way.
            </p>
            <div className="bx-hero-cta">
              <a className="bx-btn bx-btn--primary" href={appHref("/")}>
                Open Resume Studio
              </a>
              <a className="bx-btn bx-btn--ghost" href="#products">
                See what’s coming
              </a>
            </div>
          </div>
          <div className="bx-hero-visual" aria-hidden>
            <div className="bx-hero-panel bx-hero-panel--a">
              <span>ATS score</span>
              <strong>82</strong>
            </div>
            <div className="bx-hero-panel bx-hero-panel--b">
              <span>Live edit</span>
              <em>Templates · Export · AI fix</em>
            </div>
          </div>
        </section>

        <section id="products" className="bx-section bx-products">
          <div className="bx-section-head">
            <h2>Career tools, one brand</h2>
            <p>Offerquay is built to prepare you for the job market — resume first, then interviews and coaching.</p>
          </div>
          <div className="bx-product-rail">
            <a className="bx-product is-live" href={appHref("/")}>
              <span className="bx-product-tag">Live</span>
              <h3>Resume Studio</h3>
              <p>Build, score, rewrite, and export ATS-friendly CVs with a live canvas editor.</p>
              <span className="bx-product-go">Enter app →</span>
            </a>
            <div className="bx-product is-soon">
              <span className="bx-product-tag">Soon</span>
              <h3>Interview Prep</h3>
              <p>Role-based practice, feedback loops, and confidence drills before the real call.</p>
            </div>
            <div className="bx-product is-soon">
              <span className="bx-product-tag">Soon</span>
              <h3>Career Coach</h3>
              <p>Guidance on targeting roles, storytelling, and application strategy.</p>
            </div>
          </div>
        </section>

        <section className="bx-section bx-flow">
          <div className="bx-section-head">
            <h2>How Resume Studio works</h2>
            <p>From blank page or upload to a polished export — without leaving the canvas.</p>
          </div>
          <ol className="bx-steps">
            <li>
              <strong>Start</strong>
              <span>Guided onboarding or upload an existing CV.</span>
            </li>
            <li>
              <strong>Shape</strong>
              <span>Pick a template, drag sections, edit in place.</span>
            </li>
            <li>
              <strong>Score & fix</strong>
              <span>AI findings, rewrite tools, then re-check your score.</span>
            </li>
            <li>
              <strong>Ship</strong>
              <span>Export PDF or DOCX and apply with confidence.</span>
            </li>
          </ol>
        </section>

        <section className="bx-section bx-cta-band">
          <h2>Ready when you are</h2>
          <p>Jump into the app subdomain workspace — same Offerquay account of tools, focused on execution.</p>
          <a className="bx-btn bx-btn--primary" href={appHref("/")}>
            Launch Resume Studio
          </a>
        </section>
      </main>
      <footer className="bx-footer">
        <strong>
          Offer<em>quay</em>
        </strong>
        <span>Job-ready tools for ambitious careers.</span>
      </footer>
      <SiteChatbot />
    </>
  );
}
