"use client";

import { useState } from "react";
import type { StructuredCv } from "@/lib/cv-types";
import { improveDraftText } from "@/lib/api";

export type EditSection =
  | "personal"
  | "summary"
  | "skills"
  | "experience"
  | "education"
  | "projects"
  | "certifications";

const SECTIONS: { id: EditSection; label: string }[] = [
  { id: "personal", label: "Personal" },
  { id: "summary", label: "Summary" },
  { id: "skills", label: "Skills" },
  { id: "experience", label: "Experience" },
  { id: "education", label: "Education" },
  { id: "projects", label: "Projects" },
  { id: "certifications", label: "Certs" },
];

function emptyJob() {
  return { company: "", title: "", location: "", start: "", end: "", bullets: [""] };
}
function emptyEdu() {
  return { school: "", degree: "", year: "", details: "" };
}
function emptyProject() {
  return { name: "", description: "", bullets: [""] };
}

export function PreviewInlineEditor({
  evaluationId,
  content,
  active,
  onClose,
  onChange,
  onSelectSection,
}: {
  evaluationId: string;
  content: StructuredCv;
  active: EditSection | null;
  onClose: () => void;
  onChange: (updater: (prev: StructuredCv) => StructuredCv) => void;
  onSelectSection: (section: EditSection) => void;
}) {
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [instruction, setInstruction] = useState("");

  if (!active) return null;

  async function runAi(text: string, section: string, apply: (improved: string) => void) {
    if (!text.trim()) return;
    setAiBusy(true);
    setAiError(null);
    try {
      const res = await improveDraftText(evaluationId, {
        text,
        section,
        instruction: instruction.trim() || "Improve this resume text for clarity and impact.",
      });
      apply(res.improved);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "AI improve failed");
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <div className="preview-edit-dock" role="dialog" aria-label="Edit resume section">
      <div className="preview-edit-tabs">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`preview-edit-tab ${active === s.id ? "is-active" : ""}`}
            onClick={() => onSelectSection(s.id)}
          >
            {s.label}
          </button>
        ))}
        <button type="button" className="preview-edit-close" onClick={onClose} aria-label="Close editor">
          ×
        </button>
      </div>

      <div className="preview-edit-ai-bar">
        <input
          className="wizard-input"
          style={{ marginBottom: 0 }}
          placeholder="AI instruction (optional) e.g. make bullets more quantified"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
        />
      </div>
      {aiError && (
        <p style={{ margin: "0.35rem 0 0", color: "var(--bad)", fontSize: "0.85rem" }}>{aiError}</p>
      )}

      <div className="preview-edit-body">
        {active === "personal" && (
          <>
            <label className="field-label">Full name</label>
            <input
              className="wizard-input"
              value={content.personal.fullName}
              onChange={(e) =>
                onChange((p) => ({ ...p, personal: { ...p.personal, fullName: e.target.value } }))
              }
            />
            <label className="field-label">Email</label>
            <input
              className="wizard-input"
              value={content.personal.email}
              onChange={(e) =>
                onChange((p) => ({ ...p, personal: { ...p.personal, email: e.target.value } }))
              }
            />
            <label className="field-label">Phone</label>
            <input
              className="wizard-input"
              value={content.personal.phone}
              onChange={(e) =>
                onChange((p) => ({ ...p, personal: { ...p.personal, phone: e.target.value } }))
              }
            />
            <label className="field-label">Location</label>
            <input
              className="wizard-input"
              value={content.personal.location}
              onChange={(e) =>
                onChange((p) => ({ ...p, personal: { ...p.personal, location: e.target.value } }))
              }
            />
            <label className="field-label">Links (one per line)</label>
            <textarea
              className="wizard-input wizard-textarea"
              rows={3}
              value={content.personal.links.join("\n")}
              onChange={(e) =>
                onChange((p) => ({
                  ...p,
                  personal: {
                    ...p.personal,
                    links: e.target.value
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  },
                }))
              }
            />
          </>
        )}

        {active === "summary" && (
          <>
            <div className="preview-edit-row">
              <label className="field-label" style={{ margin: 0 }}>
                Professional summary
              </label>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ padding: "0.3rem 0.65rem", fontSize: "0.8rem" }}
                disabled={aiBusy || !content.summary.trim()}
                onClick={() =>
                  void runAi(content.summary, "summary", (improved) =>
                    onChange((p) => ({ ...p, summary: improved })),
                  )
                }
              >
                {aiBusy ? "AI…" : "Improve with AI"}
              </button>
            </div>
            <textarea
              className="wizard-input wizard-textarea"
              rows={5}
              value={content.summary}
              onChange={(e) => onChange((p) => ({ ...p, summary: e.target.value }))}
            />
          </>
        )}

        {active === "skills" && (
          <>
            <div className="preview-edit-row">
              <label className="field-label" style={{ margin: 0 }}>
                Skills (comma-separated)
              </label>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ padding: "0.3rem 0.65rem", fontSize: "0.8rem" }}
                disabled={aiBusy || !content.skills.length}
                onClick={() =>
                  void runAi(content.skills.join(", "), "skills", (improved) =>
                    onChange((p) => ({
                      ...p,
                      skills: improved
                        .split(/[,;\n]/)
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })),
                  )
                }
              >
                {aiBusy ? "AI…" : "Improve with AI"}
              </button>
            </div>
            <textarea
              className="wizard-input wizard-textarea"
              rows={3}
              value={content.skills.join(", ")}
              onChange={(e) =>
                onChange((p) => ({
                  ...p,
                  skills: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                }))
              }
            />
          </>
        )}

        {active === "experience" && (
          <>
            <div className="preview-edit-row">
              <strong>Experience</strong>
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: "0.3rem 0.65rem", fontSize: "0.8rem" }}
                onClick={() => onChange((p) => ({ ...p, experience: [...p.experience, emptyJob()] }))}
              >
                + Add role
              </button>
            </div>
            {content.experience.map((job, i) => (
              <div key={i} className="form-card">
                <input
                  className="wizard-input"
                  placeholder="Title"
                  value={job.title}
                  onChange={(e) =>
                    onChange((p) => {
                      const experience = [...p.experience];
                      experience[i] = { ...experience[i], title: e.target.value };
                      return { ...p, experience };
                    })
                  }
                />
                <input
                  className="wizard-input"
                  placeholder="Company"
                  value={job.company}
                  onChange={(e) =>
                    onChange((p) => {
                      const experience = [...p.experience];
                      experience[i] = { ...experience[i], company: e.target.value };
                      return { ...p, experience };
                    })
                  }
                />
                <div className="field-row">
                  <input
                    className="wizard-input"
                    placeholder="Start"
                    value={job.start}
                    onChange={(e) =>
                      onChange((p) => {
                        const experience = [...p.experience];
                        experience[i] = { ...experience[i], start: e.target.value };
                        return { ...p, experience };
                      })
                    }
                  />
                  <input
                    className="wizard-input"
                    placeholder="End"
                    value={job.end}
                    onChange={(e) =>
                      onChange((p) => {
                        const experience = [...p.experience];
                        experience[i] = { ...experience[i], end: e.target.value };
                        return { ...p, experience };
                      })
                    }
                  />
                </div>
                <div className="preview-edit-row">
                  <label className="field-label" style={{ margin: 0 }}>
                    Bullets (one per line)
                  </label>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ padding: "0.25rem 0.55rem", fontSize: "0.78rem" }}
                    disabled={aiBusy || !job.bullets.join("\n").trim()}
                    onClick={() =>
                      void runAi(job.bullets.join("\n"), "experience", (improved) =>
                        onChange((p) => {
                          const experience = [...p.experience];
                          experience[i] = {
                            ...experience[i],
                            bullets: improved
                              .split("\n")
                              .map((s) => s.replace(/^[-•*]\s*/, "").trim())
                              .filter(Boolean),
                          };
                          return { ...p, experience };
                        }),
                      )
                    }
                  >
                    {aiBusy ? "AI…" : "AI bullets"}
                  </button>
                </div>
                <textarea
                  className="wizard-input wizard-textarea"
                  rows={3}
                  value={job.bullets.join("\n")}
                  onChange={(e) =>
                    onChange((p) => {
                      const experience = [...p.experience];
                      experience[i] = {
                        ...experience[i],
                        bullets: e.target.value.split("\n").map((s) => s.trimEnd()),
                      };
                      return { ...p, experience };
                    })
                  }
                />
                <button
                  type="button"
                  className="linkish"
                  onClick={() =>
                    onChange((p) => ({ ...p, experience: p.experience.filter((_, idx) => idx !== i) }))
                  }
                >
                  Remove role
                </button>
              </div>
            ))}
          </>
        )}

        {active === "education" && (
          <>
            <div className="preview-edit-row">
              <strong>Education</strong>
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: "0.3rem 0.65rem", fontSize: "0.8rem" }}
                onClick={() => onChange((p) => ({ ...p, education: [...p.education, emptyEdu()] }))}
              >
                + Add
              </button>
            </div>
            {content.education.map((ed, i) => (
              <div key={i} className="form-card">
                <input
                  className="wizard-input"
                  placeholder="Degree"
                  value={ed.degree}
                  onChange={(e) =>
                    onChange((p) => {
                      const education = [...p.education];
                      education[i] = { ...education[i], degree: e.target.value };
                      return { ...p, education };
                    })
                  }
                />
                <input
                  className="wizard-input"
                  placeholder="School"
                  value={ed.school}
                  onChange={(e) =>
                    onChange((p) => {
                      const education = [...p.education];
                      education[i] = { ...education[i], school: e.target.value };
                      return { ...p, education };
                    })
                  }
                />
                <input
                  className="wizard-input"
                  placeholder="Year"
                  value={ed.year || ""}
                  onChange={(e) =>
                    onChange((p) => {
                      const education = [...p.education];
                      education[i] = { ...education[i], year: e.target.value };
                      return { ...p, education };
                    })
                  }
                />
                <button
                  type="button"
                  className="linkish"
                  onClick={() =>
                    onChange((p) => ({ ...p, education: p.education.filter((_, idx) => idx !== i) }))
                  }
                >
                  Remove
                </button>
              </div>
            ))}
          </>
        )}

        {active === "projects" && (
          <>
            <div className="preview-edit-row">
              <strong>Projects</strong>
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: "0.3rem 0.65rem", fontSize: "0.8rem" }}
                onClick={() => onChange((p) => ({ ...p, projects: [...p.projects, emptyProject()] }))}
              >
                + Add
              </button>
            </div>
            {content.projects.map((proj, i) => (
              <div key={i} className="form-card">
                <input
                  className="wizard-input"
                  placeholder="Name"
                  value={proj.name}
                  onChange={(e) =>
                    onChange((p) => {
                      const projects = [...p.projects];
                      projects[i] = { ...projects[i], name: e.target.value };
                      return { ...p, projects };
                    })
                  }
                />
                <textarea
                  className="wizard-input wizard-textarea"
                  rows={2}
                  placeholder="Description"
                  value={proj.description}
                  onChange={(e) =>
                    onChange((p) => {
                      const projects = [...p.projects];
                      projects[i] = { ...projects[i], description: e.target.value };
                      return { ...p, projects };
                    })
                  }
                />
                <button
                  type="button"
                  className="linkish"
                  onClick={() =>
                    onChange((p) => ({ ...p, projects: p.projects.filter((_, idx) => idx !== i) }))
                  }
                >
                  Remove
                </button>
              </div>
            ))}
          </>
        )}

        {active === "certifications" && (
          <>
            <div className="preview-edit-row">
              <label className="field-label" style={{ margin: 0 }}>
                Certifications (comma-separated)
              </label>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ padding: "0.3rem 0.65rem", fontSize: "0.8rem" }}
                disabled={aiBusy || !content.certifications.length}
                onClick={() =>
                  void runAi(content.certifications.join(", "), "certifications", (improved) =>
                    onChange((p) => ({
                      ...p,
                      certifications: improved
                        .split(/[,;\n]/)
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })),
                  )
                }
              >
                {aiBusy ? "AI…" : "Improve with AI"}
              </button>
            </div>
            <textarea
              className="wizard-input wizard-textarea"
              rows={3}
              value={content.certifications.join(", ")}
              onChange={(e) =>
                onChange((p) => ({
                  ...p,
                  certifications: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                }))
              }
            />
          </>
        )}
      </div>
    </div>
  );
}

export { SECTIONS };
