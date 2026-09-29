import { UploadDropzone } from "@/components/UploadDropzone";

export default function HomePage() {
  return (
    <main className="container" style={{ paddingTop: "4.5rem", paddingBottom: "4rem" }}>
      <header className="fade-up" style={{ maxWidth: "38rem", marginBottom: "2.25rem" }}>
        <p
          style={{
            margin: 0,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontSize: "0.8rem",
            fontWeight: 700,
            color: "var(--brand)",
          }}
        >
          CV Evaluation Platform
        </p>
        <h1
          className="display"
          style={{
            margin: "0.65rem 0 0.85rem",
            fontSize: "clamp(2.4rem, 6vw, 3.6rem)",
            lineHeight: 1.05,
            fontWeight: 650,
            color: "var(--brand-deep)",
          }}
        >
          AI-Powered CV Evaluation
        </h1>
        <p style={{ margin: 0, fontSize: "1.15rem", color: "var(--muted)", lineHeight: 1.55 }}>
          Upload your CV and get structured scores, ATS insights, and clear recommendations you can act on.
        </p>
      </header>

      <section id="upload" aria-label="Upload CV">
        <UploadDropzone />
        <p style={{ marginTop: "1rem", color: "var(--muted)", fontSize: "0.95rem" }}>
          Supported formats: PDF and DOCX
        </p>
      </section>
    </main>
  );
}
