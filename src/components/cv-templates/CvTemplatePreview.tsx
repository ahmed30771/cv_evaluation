import type { CSSProperties, ReactNode } from "react";
import type { StructuredCv, TemplateId } from "@/lib/cv-types";
import { getTheme, type TemplateTheme } from "@/lib/templates";

function contactBits(cv: StructuredCv): string {
  return [cv.personal.email, cv.personal.phone, cv.personal.location, ...cv.personal.links]
    .filter(Boolean)
    .join(" · ");
}

function contactParts(cv: StructuredCv): string[] {
  return [cv.personal.email, cv.personal.phone, cv.personal.location, ...cv.personal.links].filter(Boolean);
}

/** Prevent long emails/URLs from blowing out narrow columns */
const wrapText: CSSProperties = {
  overflowWrap: "anywhere",
  wordBreak: "break-word",
  maxWidth: "100%",
  minWidth: 0,
};

function ContactStack({
  parts,
  style,
}: {
  parts: string[];
  style?: CSSProperties;
}) {
  return (
    <div style={{ ...wrapText, ...style }}>
      {parts.map((x, i) => (
        <div key={i} style={{ marginBottom: 5, ...wrapText }}>
          {x}
        </div>
      ))}
    </div>
  );
}

function Section({
  title,
  children,
  accent,
  style,
}: {
  title: string;
  children: ReactNode;
  accent?: string;
  style?: CSSProperties;
}) {
  return (
    <section style={{ marginTop: "0.9rem", ...style }}>
      <h3
        style={{
          margin: "0 0 0.4rem",
          fontSize: "0.7rem",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          borderBottom: `2px solid ${accent || "#d0d7de"}`,
          paddingBottom: 3,
          color: accent || "#1a1a1a",
          fontWeight: 750,
        }}
      >
        {title}
      </h3>
      {children}
    </section>
  );
}

function SkillChips({ skills, accent, soft }: { skills: string[]; accent: string; soft: string }) {
  if (!skills.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {skills.map((s, i) => (
        <span
          key={i}
          style={{
            background: soft,
            color: accent,
            borderRadius: 999,
            padding: "0.18rem 0.6rem",
            fontSize: "0.74rem",
            fontWeight: 650,
            border: `1px solid ${accent}22`,
          }}
        >
          {s}
        </span>
      ))}
    </div>
  );
}

function JobBlock({
  job,
  accent,
}: {
  job: StructuredCv["experience"][number];
  accent?: string;
  dateRight?: boolean;
}) {
  return (
    <div style={{ marginBottom: "0.7rem", ...wrapText }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "0.75rem",
          flexWrap: "wrap",
          alignItems: "baseline",
        }}
      >
        <div style={{ fontWeight: 700, color: accent || "#111", ...wrapText, flex: "1 1 12rem" }}>
          {[job.title, job.company].filter(Boolean).join(" — ")}
        </div>
        <div style={{ color: "#64748b", fontSize: "0.76rem", ...wrapText, flex: "0 1 auto" }}>
          {[job.start, job.end].filter(Boolean).join(" – ")}
          {job.location ? ` · ${job.location}` : ""}
        </div>
      </div>
      <ul style={{ margin: "0.3rem 0 0", paddingLeft: "1.1rem" }}>
        {job.bullets.filter(Boolean).map((b, j) => (
          <li key={j} style={{ marginBottom: 2, ...wrapText }}>
            {b}
          </li>
        ))}
      </ul>
    </div>
  );
}

function shell(style: CSSProperties, children: ReactNode) {
  return (
    <article
      style={{
        background: "#fff",
        color: "#1a1a1a",
        minHeight: 520,
        boxShadow: "0 12px 40px rgba(15, 23, 42, 0.1)",
        lineHeight: 1.45,
        overflow: "hidden",
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        ...style,
      }}
    >
      {children}
    </article>
  );
}

/** 1 — Classic ATS */
function ClassicBody({ cv, theme, compact }: { cv: StructuredCv; theme: TemplateTheme; compact?: boolean }) {
  const pad = compact ? "0.95rem 1.05rem" : "1.4rem 1.55rem";
  return shell({ padding: pad, fontSize: compact ? "0.8rem" : "0.9rem" }, (
    <>
      <header style={{ textAlign: "center", marginBottom: compact ? "0.55rem" : "0.9rem" }}>
        <div
          style={{
            fontSize: compact ? "1.2rem" : "1.65rem",
            fontWeight: 750,
            letterSpacing: "-0.02em",
            color: theme.accent,
          }}
        >
          {cv.personal.fullName || "Your Name"}
        </div>
        <div
          style={{
            height: 2,
            width: compact ? 48 : 72,
            background: theme.accent,
            margin: "0.45rem auto 0.5rem",
            borderRadius: 2,
          }}
        />
        <div style={{ color: "#64748b", fontSize: compact ? "0.72rem" : "0.8rem", ...wrapText }}>{contactBits(cv)}</div>
      </header>
      {!!cv.summary && (
        <Section title="Professional Summary" accent={theme.accent}>
          <p style={{ margin: 0 }}>{cv.summary}</p>
        </Section>
      )}
      {!!cv.skills.length && (
        <Section title="Skills" accent={theme.accent}>
          <p style={{ margin: 0 }}>{cv.skills.join(" · ")}</p>
        </Section>
      )}
      {!!cv.experience.length && (
        <Section title="Experience" accent={theme.accent}>
          {cv.experience.map((job, i) => (
            <JobBlock key={i} job={job} dateRight />
          ))}
        </Section>
      )}
      {!!cv.education.length && (
        <Section title="Education" accent={theme.accent}>
          {cv.education.map((ed, i) => (
            <div key={i} style={{ marginBottom: "0.35rem" }}>
              <div style={{ fontWeight: 700 }}>{[ed.degree, ed.school].filter(Boolean).join(" — ")}</div>
              <div style={{ color: "#64748b", fontSize: "0.78rem" }}>{[ed.year, ed.details].filter(Boolean).join(" · ")}</div>
            </div>
          ))}
        </Section>
      )}
      {!!cv.projects.length && (
        <Section title="Projects" accent={theme.accent}>
          {cv.projects.map((p, i) => (
            <div key={i} style={{ marginBottom: "0.35rem" }}>
              <div style={{ fontWeight: 700 }}>{p.name}</div>
              {!!p.description && <p style={{ margin: "0.15rem 0 0" }}>{p.description}</p>}
            </div>
          ))}
        </Section>
      )}
      {!!cv.certifications.length && (
        <Section title="Certifications" accent={theme.accent}>
          <p style={{ margin: 0 }}>{cv.certifications.join(" · ")}</p>
        </Section>
      )}
    </>
  ));
}

/** 2 — Executive: name left / contact right */
function ExecutiveBody({ cv, theme }: { cv: StructuredCv; theme: TemplateTheme }) {
  return shell({ padding: "1.35rem 1.5rem", fontSize: "0.88rem" }, (
    <>
      <header
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr)",
          gap: "1rem",
          paddingBottom: "0.85rem",
          borderBottom: `3px solid ${theme.accent}`,
          marginBottom: "0.35rem",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: "1.7rem", fontWeight: 800, letterSpacing: "-0.03em", color: theme.accent, lineHeight: 1.1, ...wrapText }}>
            {cv.personal.fullName || "Your Name"}
          </div>
          {!!cv.summary && (
            <p style={{ margin: "0.55rem 0 0", color: "#475569", fontSize: "0.84rem", ...wrapText }}>{cv.summary}</p>
          )}
        </div>
        <div style={{ textAlign: "right", fontSize: "0.8rem", color: "#475569", alignSelf: "end", minWidth: 0 }}>
          <ContactStack parts={contactParts(cv)} style={{ textAlign: "right" }} />
        </div>
      </header>
      {!!cv.skills.length && (
        <Section title="Core skills" accent={theme.accent}>
          <SkillChips skills={cv.skills} accent={theme.accent} soft={theme.accentSoft} />
        </Section>
      )}
      {!!cv.experience.length && (
        <Section title="Experience" accent={theme.accent}>
          {cv.experience.map((job, i) => (
            <div
              key={i}
              style={{
                marginBottom: "0.75rem",
                padding: "0.65rem 0.75rem",
                background: theme.accentSoft,
                borderRadius: 10,
                borderLeft: `4px solid ${theme.accent}`,
              }}
            >
              <JobBlock job={job} accent={theme.accent} dateRight />
            </div>
          ))}
        </Section>
      )}
      {!!cv.education.length && (
        <Section title="Education" accent={theme.accent}>
          {cv.education.map((ed, i) => (
            <div key={i} style={{ marginBottom: "0.3rem", fontWeight: 600 }}>
              {[ed.degree, ed.school, ed.year].filter(Boolean).join(" · ")}
            </div>
          ))}
        </Section>
      )}
      {!!cv.projects.length && (
        <Section title="Projects" accent={theme.accent}>
          {cv.projects.map((p, i) => (
            <div key={i} style={{ marginBottom: "0.35rem" }}>
              <strong>{p.name}</strong>
              {!!p.description && <span style={{ color: "#64748b" }}> — {p.description}</span>}
            </div>
          ))}
        </Section>
      )}
      {!!cv.certifications.length && (
        <Section title="Certifications" accent={theme.accent}>
          <p style={{ margin: 0 }}>{cv.certifications.join(" · ")}</p>
        </Section>
      )}
    </>
  ));
}

/** 3 — Timeline */
function TimelineBody({ cv, theme }: { cv: StructuredCv; theme: TemplateTheme }) {
  return shell({ padding: "1.35rem 1.45rem", fontSize: "0.88rem" }, (
    <>
      <header style={{ marginBottom: "1rem" }}>
        <div style={{ fontSize: "1.55rem", fontWeight: 800, color: "#0f172a", ...wrapText }}>{cv.personal.fullName || "Your Name"}</div>
        <div style={{ color: "#64748b", fontSize: "0.8rem", marginTop: 4, ...wrapText }}>{contactBits(cv)}</div>
        {!!cv.summary && <p style={{ margin: "0.65rem 0 0", color: "#334155", ...wrapText }}>{cv.summary}</p>}
      </header>
      {!!cv.skills.length && (
        <Section title="Skills" accent={theme.accent}>
          <SkillChips skills={cv.skills} accent={theme.accent} soft={theme.accentSoft} />
        </Section>
      )}
      {!!cv.experience.length && (
        <Section title="Career timeline" accent={theme.accent}>
          <div style={{ position: "relative", paddingLeft: "1.15rem", borderLeft: `2px solid ${theme.accentSoft}` }}>
            {cv.experience.map((job, i) => (
              <div key={i} style={{ position: "relative", marginBottom: "0.95rem" }}>
                <span
                  style={{
                    position: "absolute",
                    left: "-1.42rem",
                    top: 4,
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    background: theme.accent,
                    boxShadow: `0 0 0 3px ${theme.accentSoft}`,
                  }}
                />
                <JobBlock job={job} accent={theme.accent} dateRight />
              </div>
            ))}
          </div>
        </Section>
      )}
      {!!cv.education.length && (
        <Section title="Education" accent={theme.accent}>
          {cv.education.map((ed, i) => (
            <div key={i} style={{ marginBottom: "0.3rem" }}>
              <strong>{ed.degree}</strong> · {ed.school} {ed.year ? `(${ed.year})` : ""}
            </div>
          ))}
        </Section>
      )}
      {!!cv.projects.length && (
        <Section title="Projects" accent={theme.accent}>
          {cv.projects.map((p, i) => (
            <div key={i} style={{ marginBottom: "0.35rem" }}>
              <strong>{p.name}</strong>
              {!!p.description && <p style={{ margin: "0.15rem 0 0" }}>{p.description}</p>}
            </div>
          ))}
        </Section>
      )}
      {!!cv.certifications.length && (
        <Section title="Certifications" accent={theme.accent}>
          <p style={{ margin: 0 }}>{cv.certifications.join(" · ")}</p>
        </Section>
      )}
    </>
  ));
}

/** 4 — Sidebar / Forest */
function SidebarBody({ cv, theme }: { cv: StructuredCv; theme: TemplateTheme }) {
  return shell(
    {
      display: "grid",
      gridTemplateColumns: "minmax(0, 34%) minmax(0, 1fr)",
      fontSize: "0.86rem",
    },
    <>
      <aside
        style={{
          background: theme.railBg,
          color: theme.railText,
          padding: "1.25rem 0.9rem",
          minWidth: 0,
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            fontWeight: 800,
            fontSize: "1.05rem",
            lineHeight: 1.25,
            marginBottom: "0.75rem",
            ...wrapText,
          }}
        >
          {cv.personal.fullName || "Your Name"}
        </div>
        <ContactStack
          parts={contactParts(cv)}
          style={{ fontSize: "0.72rem", opacity: 0.92, marginBottom: "1rem" }}
        />
        {!!cv.skills.length && (
          <>
            <div
              style={{
                fontSize: "0.68rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                fontWeight: 700,
                marginBottom: 6,
                opacity: 0.85,
              }}
            >
              Skills
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: "1rem", minWidth: 0 }}>
              {cv.skills.map((s, i) => (
                <div
                  key={i}
                  style={{
                    background: "rgba(255,255,255,0.12)",
                    padding: "0.25rem 0.45rem",
                    borderRadius: 6,
                    fontSize: "0.72rem",
                    ...wrapText,
                  }}
                >
                  {s}
                </div>
              ))}
            </div>
          </>
        )}
        {!!cv.certifications.length && (
          <>
            <div
              style={{
                fontSize: "0.68rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                fontWeight: 700,
                marginBottom: 6,
                opacity: 0.85,
              }}
            >
              Certifications
            </div>
            <p style={{ margin: 0, fontSize: "0.72rem", opacity: 0.95, ...wrapText }}>
              {cv.certifications.join(", ")}
            </p>
          </>
        )}
      </aside>
      <div style={{ padding: "1.2rem 1.15rem", minWidth: 0, overflow: "hidden" }}>
        {!!cv.summary && (
          <Section title="Profile" accent={theme.accent}>
            <p style={{ margin: 0, ...wrapText }}>{cv.summary}</p>
          </Section>
        )}
        {!!cv.experience.length && (
          <Section title="Experience" accent={theme.accent}>
            {cv.experience.map((job, i) => (
              <JobBlock key={i} job={job} dateRight />
            ))}
          </Section>
        )}
        {!!cv.education.length && (
          <Section title="Education" accent={theme.accent}>
            {cv.education.map((ed, i) => (
              <div key={i} style={{ marginBottom: "0.35rem", ...wrapText }}>
                <div style={{ fontWeight: 700 }}>{[ed.degree, ed.school].filter(Boolean).join(" — ")}</div>
                {!!ed.year && <div style={{ color: "#64748b", fontSize: "0.78rem" }}>{ed.year}</div>}
              </div>
            ))}
          </Section>
        )}
        {!!cv.projects.length && (
          <Section title="Projects" accent={theme.accent}>
            {cv.projects.map((p, i) => (
              <div key={i} style={{ marginBottom: "0.35rem", ...wrapText }}>
                <div style={{ fontWeight: 700 }}>{p.name}</div>
                {!!p.description && <p style={{ margin: "0.15rem 0 0" }}>{p.description}</p>}
              </div>
            ))}
          </Section>
        )}
      </div>
    </>,
  );
}

/** 5 — Frame */
function FrameBody({ cv, theme }: { cv: StructuredCv; theme: TemplateTheme }) {
  return shell(
    {
      padding: "0.85rem",
      background: theme.accentSoft,
    },
    <div
      style={{
        background: "#fff",
        border: `2px solid ${theme.accent}`,
        outline: `6px solid #fff`,
        outlineOffset: 0,
        boxShadow: `inset 0 0 0 1px ${theme.accent}33`,
        padding: "1.2rem 1.3rem",
        minHeight: 480,
        fontSize: "0.88rem",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 28,
          height: 28,
          borderTop: `4px solid ${theme.accent}`,
          borderLeft: `4px solid ${theme.accent}`,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          right: 0,
          width: 28,
          height: 28,
          borderBottom: `4px solid ${theme.accent}`,
          borderRight: `4px solid ${theme.accent}`,
        }}
      />
      <header style={{ textAlign: "center", marginBottom: "0.85rem" }}>
        <div style={{ fontSize: "1.55rem", fontWeight: 800, color: theme.accent }}>{cv.personal.fullName || "Your Name"}</div>
        <div style={{ color: "#64748b", fontSize: "0.8rem", marginTop: 4, ...wrapText }}>{contactBits(cv)}</div>
      </header>
      {!!cv.summary && (
        <Section title="Summary" accent={theme.accent}>
          <p style={{ margin: 0 }}>{cv.summary}</p>
        </Section>
      )}
      {!!cv.skills.length && (
        <Section title="Skills" accent={theme.accent}>
          <SkillChips skills={cv.skills} accent={theme.accent} soft={theme.accentSoft} />
        </Section>
      )}
      {!!cv.experience.length && (
        <Section title="Experience" accent={theme.accent}>
          {cv.experience.map((job, i) => (
            <JobBlock key={i} job={job} dateRight />
          ))}
        </Section>
      )}
      {!!cv.education.length && (
        <Section title="Education" accent={theme.accent}>
          {cv.education.map((ed, i) => (
            <div key={i} style={{ marginBottom: "0.3rem", fontWeight: 600 }}>
              {[ed.degree, ed.school, ed.year].filter(Boolean).join(" · ")}
            </div>
          ))}
        </Section>
      )}
      {!!cv.projects.length && (
        <Section title="Projects" accent={theme.accent}>
          {cv.projects.map((p, i) => (
            <div key={i} style={{ marginBottom: "0.3rem" }}>
              <strong>{p.name}</strong>
              {!!p.description && <span> — {p.description}</span>}
            </div>
          ))}
        </Section>
      )}
      {!!cv.certifications.length && (
        <Section title="Certifications" accent={theme.accent}>
          <p style={{ margin: 0 }}>{cv.certifications.join(" · ")}</p>
        </Section>
      )}
    </div>,
  );
}

/** 6 — Magazine asymmetric */
function MagazineBody({ cv, theme }: { cv: StructuredCv; theme: TemplateTheme }) {
  return shell(
    { display: "grid", gridTemplateColumns: "minmax(0, 28%) minmax(0, 1fr)", fontSize: "0.86rem" },
    <>
      <aside
        style={{
          background: `linear-gradient(165deg, ${theme.accent} 0%, ${theme.accent}dd 70%, #0f172a 140%)`,
          color: "#fff",
          padding: "1.4rem 0.85rem",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        <div style={{ ...wrapText }}>
          <div
            style={{
              writingMode: "vertical-rl",
              transform: "rotate(180deg)",
              fontSize: "1.35rem",
              fontWeight: 850,
              letterSpacing: "0.04em",
              lineHeight: 1.05,
              maxHeight: 280,
              ...wrapText,
            }}
          >
            {cv.personal.fullName || "Your Name"}
          </div>
        </div>
        <ContactStack
          parts={contactParts(cv)}
          style={{ fontSize: "0.7rem", opacity: 0.9, marginTop: "1.5rem" }}
        />
      </aside>
      <div style={{ padding: "1.2rem 1.15rem", minWidth: 0, overflow: "hidden" }}>
        {!!cv.summary && (
          <p style={{ margin: "0 0 0.85rem", fontSize: "0.95rem", color: "#334155", fontWeight: 500, ...wrapText }}>
            {cv.summary}
          </p>
        )}
        {!!cv.skills.length && (
          <Section title="Skills" accent={theme.accent}>
            <SkillChips skills={cv.skills} accent={theme.accent} soft={theme.accentSoft} />
          </Section>
        )}
        {!!cv.experience.length && (
          <Section title="Experience" accent={theme.accent}>
            {cv.experience.map((job, i) => (
              <JobBlock key={i} job={job} dateRight />
            ))}
          </Section>
        )}
        {!!cv.education.length && (
          <Section title="Education" accent={theme.accent}>
            {cv.education.map((ed, i) => (
              <div key={i} style={{ marginBottom: "0.3rem", ...wrapText }}>
                <strong>{ed.degree}</strong> · {ed.school} {ed.year ? `· ${ed.year}` : ""}
              </div>
            ))}
          </Section>
        )}
        {!!cv.projects.length && (
          <Section title="Projects" accent={theme.accent}>
            {cv.projects.map((p, i) => (
              <div key={i} style={{ marginBottom: "0.35rem", ...wrapText }}>
                <strong>{p.name}</strong>
                {!!p.description && <p style={{ margin: "0.1rem 0 0" }}>{p.description}</p>}
              </div>
            ))}
          </Section>
        )}
        {!!cv.certifications.length && (
          <Section title="Certifications" accent={theme.accent}>
            <p style={{ margin: 0, ...wrapText }}>{cv.certifications.join(" · ")}</p>
          </Section>
        )}
      </div>
    </>,
  );
}

/** 7 — Banner (Ocean / Sunset) */
function BannerBody({ cv, theme }: { cv: StructuredCv; theme: TemplateTheme }) {
  return shell({}, (
    <>
      <header
        style={{
          background: `linear-gradient(115deg, ${theme.accent} 0%, ${theme.accent}bb 55%, ${theme.accentSoft} 160%)`,
          color: theme.headerText,
          padding: "1.4rem 1.45rem 1.2rem",
        }}
      >
        <div style={{ fontSize: "1.55rem", fontWeight: 800 }}>{cv.personal.fullName || "Your Name"}</div>
        <div style={{ opacity: 0.92, fontSize: "0.8rem", marginTop: 6, ...wrapText }}>{contactBits(cv)}</div>
      </header>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 36%) minmax(0, 1fr)",
          gap: "0.85rem",
          padding: "1rem",
          background: theme.accentSoft,
          fontSize: "0.85rem",
        }}
      >
        <div style={{ background: "#fff", borderRadius: 12, padding: "0.9rem", boxShadow: "0 2px 10px rgba(0,0,0,0.04)", minWidth: 0, overflow: "hidden" }}>
          {!!cv.summary && (
            <Section title="Summary" accent={theme.accent} style={{ marginTop: 0 }}>
              <p style={{ margin: 0 }}>{cv.summary}</p>
            </Section>
          )}
          {!!cv.experience.length && (
            <Section title="Experience" accent={theme.accent}>
              {cv.experience.map((job, i) => (
                <JobBlock key={i} job={job} dateRight />
              ))}
            </Section>
          )}
          {!!cv.projects.length && (
            <Section title="Projects" accent={theme.accent}>
              {cv.projects.map((p, i) => (
                <div key={i} style={{ marginBottom: "0.35rem" }}>
                  <div style={{ fontWeight: 700 }}>{p.name}</div>
                  {!!p.description && <p style={{ margin: "0.1rem 0 0" }}>{p.description}</p>}
                </div>
              ))}
            </Section>
          )}
        </div>
      </div>
    </>
  ));
}

/** 8 — Indigo cards */
function CardsBody({ cv, theme }: { cv: StructuredCv; theme: TemplateTheme }) {
  const card = (title: string, body: ReactNode) => (
    <div
      style={{
        background: "#fff",
        borderRadius: 14,
        padding: "0.85rem 0.95rem",
        boxShadow: "0 4px 16px rgba(67, 56, 202, 0.08)",
        border: `1px solid ${theme.accentSoft}`,
        marginBottom: "0.65rem",
      }}
    >
      <div
        style={{
          fontSize: "0.68rem",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          fontWeight: 750,
          color: theme.accent,
          marginBottom: "0.4rem",
        }}
      >
        {title}
      </div>
      {body}
    </div>
  );

  return shell(
    { padding: "1.1rem", background: `linear-gradient(180deg, ${theme.accentSoft} 0%, #fff 40%)`, fontSize: "0.86rem" },
    <>
      <header style={{ textAlign: "center", marginBottom: "0.85rem" }}>
        <div style={{ fontSize: "1.55rem", fontWeight: 850, color: theme.accent, ...wrapText }}>
          {cv.personal.fullName || "Your Name"}
        </div>
        <div style={{ color: "#64748b", fontSize: "0.8rem", marginTop: 4, ...wrapText }}>{contactBits(cv)}</div>
      </header>
      {!!cv.summary && card("About", <p style={{ margin: 0, ...wrapText }}>{cv.summary}</p>)}
      {!!cv.skills.length &&
        card("Skills", <SkillChips skills={cv.skills} accent={theme.accent} soft={theme.accentSoft} />)}
      {!!cv.experience.length &&
        card(
          "Experience",
          <>
            {cv.experience.map((job, i) => (
              <JobBlock key={i} job={job} dateRight />
            ))}
          </>,
        )}
      {!!cv.education.length &&
        card(
          "Education",
          <>
            {cv.education.map((ed, i) => (
              <div key={i} style={{ marginBottom: "0.3rem", ...wrapText }}>
                <strong>{ed.degree}</strong> · {ed.school} {ed.year ? `· ${ed.year}` : ""}
              </div>
            ))}
          </>,
        )}
      {!!cv.projects.length &&
        card(
          "Projects",
          <>
            {cv.projects.map((p, i) => (
              <div key={i} style={{ marginBottom: "0.3rem", ...wrapText }}>
                <strong>{p.name}</strong>
                {!!p.description && <p style={{ margin: "0.1rem 0 0" }}>{p.description}</p>}
              </div>
            ))}
          </>,
        )}
      {!!cv.certifications.length &&
        card("Certifications", <p style={{ margin: 0, ...wrapText }}>{cv.certifications.join(" · ")}</p>)}
    </>,
  );
}

/** 9 — Aurora gradient */
function AuroraBody({ cv, theme }: { cv: StructuredCv; theme: TemplateTheme }) {
  return shell({}, (
    <>
      <header
        style={{
          padding: "1.5rem 1.4rem 1.25rem",
          background: `linear-gradient(125deg, #a5f3fc 0%, #c4b5fd 45%, #fbcfe8 100%)`,
          color: theme.headerText,
        }}
      >
        <div style={{ fontSize: "1.6rem", fontWeight: 850 }}>{cv.personal.fullName || "Your Name"}</div>
        <div style={{ fontSize: "0.8rem", marginTop: 6, opacity: 0.85, ...wrapText }}>{contactBits(cv)}</div>
      </header>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.35fr)", gap: "1rem", padding: "1.15rem 1.25rem", fontSize: "0.86rem" }}>
        <div style={{ minWidth: 0 }}>
          {!!cv.summary && (
            <Section title="About" accent={theme.accent} style={{ marginTop: 0 }}>
              <p style={{ margin: 0, ...wrapText }}>{cv.summary}</p>
            </Section>
          )}
          {!!cv.skills.length && (
            <Section title="Skills" accent={theme.accent}>
              <SkillChips skills={cv.skills} accent={theme.accent} soft={theme.accentSoft} />
            </Section>
          )}
          {!!cv.education.length && (
            <Section title="Education" accent={theme.accent}>
              {cv.education.map((ed, i) => (
                <div key={i} style={{ marginBottom: "0.3rem", ...wrapText }}>
                  <strong>{ed.degree}</strong>
                  <div style={{ color: "#64748b", fontSize: "0.78rem" }}>
                    {ed.school}
                    {ed.year ? ` · ${ed.year}` : ""}
                  </div>
                </div>
              ))}
            </Section>
          )}
          {!!cv.certifications.length && (
            <Section title="Certifications" accent={theme.accent}>
              <p style={{ margin: 0, ...wrapText }}>{cv.certifications.join(" · ")}</p>
            </Section>
          )}
        </div>
        <div style={{ minWidth: 0 }}>
          {!!cv.experience.length && (
            <Section title="Experience" accent={theme.accent} style={{ marginTop: 0 }}>
              {cv.experience.map((job, i) => (
                <JobBlock key={i} job={job} dateRight />
              ))}
            </Section>
          )}
          {!!cv.projects.length && (
            <Section title="Projects" accent={theme.accent}>
              {cv.projects.map((p, i) => (
                <div key={i} style={{ marginBottom: "0.35rem", ...wrapText }}>
                  <div style={{ fontWeight: 700 }}>{p.name}</div>
                  {!!p.description && <p style={{ margin: "0.1rem 0 0" }}>{p.description}</p>}
                </div>
              ))}
            </Section>
          )}
        </div>
      </div>
    </>
  ));
}

export function CvTemplatePreview({ cv, templateId }: { cv: StructuredCv; templateId: TemplateId }) {
  const theme = getTheme(templateId);
  switch (theme.kind) {
    case "compact":
      return <ClassicBody cv={cv} theme={theme} compact />;
    case "executive":
      return <ExecutiveBody cv={cv} theme={theme} />;
    case "timeline":
      return <TimelineBody cv={cv} theme={theme} />;
    case "sidebar":
      return <SidebarBody cv={cv} theme={theme} />;
    case "frame":
      return <FrameBody cv={cv} theme={theme} />;
    case "magazine":
      return <MagazineBody cv={cv} theme={theme} />;
    case "banner":
      return <BannerBody cv={cv} theme={theme} />;
    case "cards":
      return <CardsBody cv={cv} theme={theme} />;
    case "aurora":
      return <AuroraBody cv={cv} theme={theme} />;
    default:
      return <ClassicBody cv={cv} theme={theme} />;
  }
}

export function TemplateThumb({
  cv,
  templateId,
  active,
  disabled,
  onClick,
  label,
  badge,
}: {
  cv: StructuredCv;
  templateId: TemplateId;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  label: string;
  badge?: string;
}) {
  const theme = getTheme(templateId);
  return (
    <button
      type="button"
      className={`template-mini ${active ? "is-active" : ""} ${disabled && !active ? "is-dimmed" : ""}`}
      onClick={onClick}
      aria-pressed={active}
      disabled={disabled}
    >
      <div className="template-mini-frame">
        <div className="template-mini-scale">
          <CvTemplatePreview cv={cv} templateId={templateId} />
        </div>
        {active ? <span className="template-mini-selected">Selected</span> : null}
      </div>
      <div className="template-mini-meta">
        <span className="template-mini-swatches" aria-hidden>
          <i style={{ background: theme.accent }} />
          <i style={{ background: theme.accentSoft }} />
        </span>
        <strong>{label}</strong>
        {badge ? <em>{badge}</em> : null}
      </div>
    </button>
  );
}
