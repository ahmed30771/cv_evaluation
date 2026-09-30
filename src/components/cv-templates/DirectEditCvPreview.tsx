"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import type { StructuredCv, TemplateId } from "@/lib/cv-types";
import { getTheme } from "@/lib/templates";
import { improveDraftText } from "@/lib/api";
import {
  addSectionTemplate,
  availableSectionTemplates,
  clearSection,
  sectionIsPresent,
  type SectionTemplateId,
} from "@/lib/section-templates";
import {
  layoutSplitFromKind,
  moveSectionColumn,
  placeSectionRelative,
  presentByColumn,
  presentSectionsInOrder,
  type LayoutSplit,
} from "@/lib/section-order";
import type { BodySectionId } from "@/lib/cv-types";
import { SectionShell, type SectionActionTarget } from "@/components/cv-templates/SectionShell";
import { isBodySectionId } from "@/lib/cv-types";

const wrap: CSSProperties = {
  overflowWrap: "anywhere",
  wordBreak: "break-word",
  maxWidth: "100%",
  minWidth: 0,
};

function EditableText({
  value,
  onCommit,
  multiline,
  style,
  className,
  placeholder,
  onFocusField,
}: {
  value: string;
  onCommit: (next: string) => void;
  multiline?: boolean;
  style?: CSSProperties;
  className?: string;
  placeholder?: string;
  onFocusField?: (el: HTMLElement, getText: () => string, commit: (t: string) => void) => void;
}) {
  const ref = useRef<HTMLDivElement | HTMLSpanElement | null>(null);

  const syncDom = useCallback(
    (el: HTMLElement | null) => {
      if (!el) return;
      if (document.activeElement === el) return;
      const current = multiline ? el.innerText : el.textContent || "";
      if (current !== (value || "")) {
        el.textContent = value || "";
      }
    },
    [value, multiline],
  );

  useEffect(() => {
    syncDom(ref.current);
  }, [syncDom]);

  const setNode = useCallback(
    (node: HTMLDivElement | HTMLSpanElement | null) => {
      ref.current = node;
      syncDom(node);
    },
    [syncDom],
  );

  const commit = () => {
    const el = ref.current;
    if (!el) return;
    const next = (multiline ? el.innerText : el.textContent || "").replace(/\u00a0/g, " ").trimEnd();
    if (next !== value) onCommit(next);
  };

  const onFocus = (e: FocusEvent<HTMLElement>) => {
    onFocusField?.(
      e.currentTarget,
      () => (multiline ? e.currentTarget.innerText : e.currentTarget.textContent || ""),
      (t) => {
        if (ref.current) {
          ref.current.textContent = t;
          onCommit(t);
        }
      },
    );
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (!multiline && e.key === "Enter") {
      e.preventDefault();
      (e.target as HTMLElement).blur();
    }
  };

  const baseStyle: CSSProperties = {
    ...wrap,
    outline: "none",
    cursor: "text",
    borderRadius: 4,
    minHeight: multiline ? "1.4em" : undefined,
    whiteSpace: multiline ? "pre-wrap" : undefined,
    ...style,
  };

  if (multiline) {
    return (
      <div
        ref={setNode as (n: HTMLDivElement | null) => void}
        className={`cv-edit-field ${className || ""}`}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-placeholder={placeholder}
        style={baseStyle}
        onBlur={commit}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
      />
    );
  }

  return (
    <span
      ref={setNode as (n: HTMLSpanElement | null) => void}
      className={`cv-edit-field ${className || ""}`}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-placeholder={placeholder}
      style={baseStyle}
      onBlur={commit}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
    />
  );
}

function SectionTitle({ children, accent }: { children: ReactNode; accent: string }) {
  return (
    <h3
      style={{
        margin: "0 0 0.4rem",
        fontSize: "0.7rem",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        borderBottom: `2px solid ${accent}`,
        paddingBottom: 3,
        color: accent,
        fontWeight: 750,
      }}
    >
      {children}
    </h3>
  );
}

type FocusAi = {
  el: HTMLElement;
  getText: () => string;
  commit: (t: string) => void;
  section: string;
} | null;

function collectSectionText(cv: StructuredCv, target: SectionActionTarget): string {
  if (target.scope === "section") {
    switch (target.sectionId as SectionTemplateId) {
      case "summary":
        return cv.summary;
      case "skills":
        return cv.skills.join(", ");
      case "certifications":
        return cv.certifications.join(", ");
      case "languages":
        return (cv.languages ?? []).join(", ");
      case "awards":
        return (cv.awards ?? []).join(", ");
      case "interests":
        return (cv.interests ?? []).join(", ");
      case "experience":
        return cv.experience
          .map(
            (j) =>
              `${j.title} — ${j.company}\n${j.start} – ${j.end}\n${j.bullets.map((b) => `• ${b}`).join("\n")}`,
          )
          .join("\n\n");
      case "education":
        return cv.education.map((e) => [e.degree, e.school, e.year].filter(Boolean).join(" · ")).join("\n");
      case "projects":
        return cv.projects.map((p) => `${p.name}\n${p.description}`).join("\n\n");
      default:
        return "";
    }
  }
  const i = target.index;
  if (target.sectionId === "experience") {
    const j = cv.experience[i];
    if (!j) return "";
    return `${j.title} — ${j.company}\n${j.start} – ${j.end}\n${j.bullets.map((b) => `• ${b}`).join("\n")}`;
  }
  if (target.sectionId === "education") {
    const e = cv.education[i];
    if (!e) return "";
    return [e.degree, e.school, e.year].filter(Boolean).join(" · ");
  }
  if (target.sectionId === "projects") {
    const p = cv.projects[i];
    if (!p) return "";
    return `${p.name}\n${p.description}`;
  }
  return "";
}

export function DirectEditCvPreview({
  cv,
  templateId,
  evaluationId,
  onPatch,
}: {
  cv: StructuredCv;
  templateId: TemplateId;
  evaluationId: string;
  onPatch: (updater: (prev: StructuredCv) => StructuredCv) => void;
}) {
  const theme = getTheme(templateId);
  const kind = theme.kind;
  const splitMode: LayoutSplit = layoutSplitFromKind(kind);
  const isSidebar = kind === "sidebar";
  const isBanner = kind === "banner";
  const isAurora = kind === "aurora";
  const isMagazine = kind === "magazine";
  const isCards = kind === "cards";
  const isFrame = kind === "frame";
  const compact = kind === "compact";
  const [focusAi, setFocusAi] = useState<FocusAi>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiErr, setAiErr] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const bindFocus = useCallback(
    (section: string) => (el: HTMLElement, getText: () => string, commit: (t: string) => void) => {
      setFocusAi({ el, getText, commit, section });
      setAiErr(null);
    },
    [],
  );

  const addFromTemplate = (id: SectionTemplateId) => {
    onPatch((p) => addSectionTemplate(p, id));
    setPickerOpen(false);
  };

  const missingSections = availableSectionTemplates(cv);

  const activate = (key: string, _target: SectionActionTarget) => {
    setActiveKey(key);
    setAiErr(null);
  };

  const handleAdd = (target: SectionActionTarget) => {
    if (target.sectionId === "personal" || target.sectionId === "contact") {
      setPickerOpen(true);
      return;
    }
    addFromTemplate(target.sectionId as SectionTemplateId);
  };

  const handleDelete = (target: SectionActionTarget) => {
    if (target.scope === "section") {
      if (target.sectionId === "personal") {
        onPatch((p) => ({ ...p, personal: { ...p.personal, fullName: "" } }));
      } else if (target.sectionId === "contact") {
        onPatch((p) => ({
          ...p,
          personal: { ...p.personal, email: "", phone: "", location: "", links: [] },
        }));
      } else {
        onPatch((p) => clearSection(p, target.sectionId as SectionTemplateId));
      }
    } else if (target.sectionId === "experience") {
      onPatch((p) => ({ ...p, experience: p.experience.filter((_, idx) => idx !== target.index) }));
    } else if (target.sectionId === "education") {
      onPatch((p) => ({ ...p, education: p.education.filter((_, idx) => idx !== target.index) }));
    } else if (target.sectionId === "projects") {
      onPatch((p) => ({ ...p, projects: p.projects.filter((_, idx) => idx !== target.index) }));
    }
    setActiveKey(null);
  };

  async function handleAiImprove(target: SectionActionTarget, instruction: string) {
    const text = collectSectionText(cv, target).trim();
    if (!text) {
      setAiErr("Nothing to improve in this block yet.");
      return;
    }
    setAiBusy(true);
    setAiErr(null);
    try {
      const res = await improveDraftText(evaluationId, {
        text,
        section: target.sectionId,
        instruction,
      });
      const improved = res.improved.trim();
      if (target.scope === "section") {
        const id = target.sectionId as SectionTemplateId;
        onPatch((p) => {
          if (id === "summary") return { ...p, summary: improved };
          if (id === "skills") {
            return { ...p, skills: improved.split(",").map((s) => s.trim()).filter(Boolean) };
          }
          if (id === "certifications") {
            return { ...p, certifications: improved.split(",").map((s) => s.trim()).filter(Boolean) };
          }
          if (id === "languages") {
            return { ...p, languages: improved.split(",").map((s) => s.trim()).filter(Boolean) };
          }
          if (id === "awards") {
            return { ...p, awards: improved.split(/[,\n]/).map((s) => s.trim()).filter(Boolean) };
          }
          if (id === "interests") {
            return { ...p, interests: improved.split(",").map((s) => s.trim()).filter(Boolean) };
          }
          // multi-entry sections: apply to first field-focus commit path via focusAi if available
          if (focusAi && focusAi.section === target.sectionId) {
            focusAi.commit(improved);
          }
          return p;
        });
      } else if (target.sectionId === "experience") {
        const lines = improved.split("\n").map((s) => s.trim()).filter(Boolean);
        const titleLine = lines[0] || "";
        const [title, ...rest] = titleLine.split("—").map((s) => s.trim());
        const dateLine = lines.find((l) => /–|-/.test(l) && l.length < 40) || "";
        const [start, end] = dateLine.split(/–|-/).map((s) => s.trim());
        const bullets = lines
          .filter((l) => l !== titleLine && l !== dateLine)
          .map((s) => s.replace(/^[-•*]\s*/, ""));
        onPatch((p) => {
          const experience = [...p.experience];
          if (!experience[target.index]) return p;
          experience[target.index] = {
            ...experience[target.index],
            title: title || experience[target.index].title,
            company: rest.join(" — ") || experience[target.index].company,
            start: start || experience[target.index].start,
            end: end || experience[target.index].end,
            bullets: bullets.length ? bullets : experience[target.index].bullets,
          };
          return { ...p, experience };
        });
      } else if (target.sectionId === "education") {
        const parts = improved.split("·").map((s) => s.trim());
        onPatch((p) => {
          const education = [...p.education];
          if (!education[target.index]) return p;
          education[target.index] = {
            ...education[target.index],
            degree: parts[0] || education[target.index].degree,
            school: parts[1] || education[target.index].school,
            year: parts[2] || education[target.index].year,
          };
          return { ...p, education };
        });
      } else if (target.sectionId === "projects") {
        const [nameLine, ...rest] = improved.split("\n");
        onPatch((p) => {
          const projects = [...p.projects];
          if (!projects[target.index]) return p;
          projects[target.index] = {
            ...projects[target.index],
            name: nameLine?.trim() || projects[target.index].name,
            description: rest.join("\n").trim() || projects[target.index].description,
          };
          return { ...p, projects };
        });
      }
    } catch (err) {
      setAiErr(err instanceof Error ? err.message : "AI failed");
    } finally {
      setAiBusy(false);
    }
  }

  const handleDropSection = (draggedId: string, targetId: string, place: "before" | "after") => {
    if (!isBodySectionId(draggedId) || !isBodySectionId(targetId)) return;
    onPatch((p) => placeSectionRelative(p, draggedId, targetId, place, splitMode));
  };

  const handleDropEntry = (
    sectionId: string,
    fromIndex: number,
    toIndex: number,
    place: "before" | "after",
  ) => {
    let insertAt = place === "after" ? toIndex + 1 : toIndex;
    if (fromIndex < insertAt) insertAt -= 1;
    if (fromIndex === insertAt) return;

    const reorder = <T,>(arr: T[]) => {
      if (fromIndex < 0 || fromIndex >= arr.length) return arr;
      const next = [...arr];
      const [item] = next.splice(fromIndex, 1);
      const at = Math.max(0, Math.min(insertAt, next.length));
      next.splice(at, 0, item);
      return next;
    };

    if (sectionId === "experience") {
      onPatch((p) => ({ ...p, experience: reorder(p.experience) }));
    } else if (sectionId === "education") {
      onPatch((p) => ({ ...p, education: reorder(p.education) }));
    } else if (sectionId === "projects") {
      onPatch((p) => ({ ...p, projects: reorder(p.projects) }));
    }
  };

  const presentOrder = presentSectionsInOrder(cv);
  const columns = presentByColumn(cv, splitMode);
  const useTwoColumns =
    splitMode !== "single" || columns.right.length > 0 || Object.keys(cv.sectionColumns || {}).length > 0;

  const shellProps = {
    activeKey,
    onActivate: activate,
    onAdd: handleAdd,
    onDelete: handleDelete,
    onAiImprove: handleAiImprove,
    onDropOnSection: handleDropSection,
    onDropOnEntry: handleDropEntry,
    aiBusy,
    aiError: aiErr,
  };

  const shellFor = (target: SectionActionTarget) => ({
    ...shellProps,
    target,
  });

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest?.(".cv-section-shell")) return;
      if (t.closest?.(".section-picker")) return;
      if (t.closest?.(".cv-new-section-btn")) return;
      setFocusAi(null);
      setActiveKey(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const isSplitChrome = isSidebar || isMagazine || isBanner || isAurora || isFrame;

  const articleStyle: CSSProperties = {
    background: isCards ? `linear-gradient(180deg, ${theme.accentSoft} 0%, #fff 45%)` : "#fff",
    color: "#1a1a1a",
    minHeight: 520,
    boxShadow: "0 12px 40px rgba(15, 23, 42, 0.1)",
    lineHeight: 1.45,
    overflow: "visible",
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    position: "relative",
    ...(isFrame ? { padding: "0.85rem", background: theme.accentSoft } : {}),
    ...(isSidebar || isMagazine
      ? { display: "grid", gridTemplateColumns: isMagazine ? "minmax(0,28%) minmax(0,1fr)" : "minmax(0,34%) minmax(0,1fr)" }
      : {}),
    ...(!isSplitChrome ? { padding: compact ? "1rem" : "1.35rem 1.5rem", fontSize: compact ? "0.82rem" : "0.9rem" } : {}),
  };

  const nameBlock = (
    <SectionShell
      {...shellFor({ scope: "section", sectionId: "personal", label: "Header" })}
    >
      <EditableText
        value={cv.personal.fullName}
        placeholder="Your Name"
        style={{
          fontSize: isMagazine ? "1.35rem" : compact ? "1.2rem" : "1.55rem",
          fontWeight: 800,
          color: isSidebar || isMagazine ? "inherit" : theme.accent,
          display: "block",
          ...wrap,
        }}
        onCommit={(v) => onPatch((p) => ({ ...p, personal: { ...p.personal, fullName: v } }))}
        onFocusField={bindFocus("personal")}
      />
    </SectionShell>
  );

  const contactLine = (
    <SectionShell
      {...shellFor({ scope: "section", sectionId: "contact", label: "Contact" })}
    >
      <EditableText
        value={[cv.personal.email, cv.personal.phone, cv.personal.location, ...cv.personal.links].filter(Boolean).join(" · ")}
        placeholder="email · phone · location · links"
        style={{
          fontSize: "0.8rem",
          color: isSidebar || isMagazine || isBanner || isAurora ? "inherit" : "#64748b",
          opacity: isSidebar || isAurora || isBanner ? 0.9 : 1,
          display: "block",
          marginTop: 6,
        }}
        onCommit={(v) => {
          const parts = v.split("·").map((s) => s.trim()).filter(Boolean);
          onPatch((p) => ({
            ...p,
            personal: {
              ...p.personal,
              email: parts[0] || "",
              phone: parts[1] || "",
              location: parts[2] || "",
              links: parts.slice(3),
            },
          }));
        }}
        onFocusField={bindFocus("personal")}
      />
    </SectionShell>
  );

  const contactStack = (
    <div style={{ fontSize: "0.72rem", marginTop: 8, ...wrap }}>
      <EditableText
        value={cv.personal.email}
        placeholder="email"
        style={{ display: "block", marginBottom: 4 }}
        onCommit={(v) => onPatch((p) => ({ ...p, personal: { ...p.personal, email: v } }))}
        onFocusField={bindFocus("personal")}
      />
      <EditableText
        value={cv.personal.phone}
        placeholder="phone"
        style={{ display: "block", marginBottom: 4 }}
        onCommit={(v) => onPatch((p) => ({ ...p, personal: { ...p.personal, phone: v } }))}
        onFocusField={bindFocus("personal")}
      />
      <EditableText
        value={cv.personal.location}
        placeholder="location"
        style={{ display: "block", marginBottom: 4 }}
        onCommit={(v) => onPatch((p) => ({ ...p, personal: { ...p.personal, location: v } }))}
        onFocusField={bindFocus("personal")}
      />
      <EditableText
        value={cv.personal.links.join("\n")}
        multiline
        placeholder="links (one per line)"
        style={{ display: "block", marginTop: 4 }}
        onCommit={(v) =>
          onPatch((p) => ({
            ...p,
            personal: {
              ...p.personal,
              links: v.split("\n").map((s) => s.trim()).filter(Boolean),
            },
          }))
        }
        onFocusField={bindFocus("personal")}
      />
    </div>
  );

  const summaryBlock = sectionIsPresent(cv, "summary") ? (
    <SectionShell
      {...shellFor({ scope: "section", sectionId: "summary", label: "Summary" })}
      style={{ marginTop: isBanner || isAurora || isSidebar ? "0.85rem" : "0.9rem" }}
    >
      <SectionTitle accent={theme.accent}>
        {isSidebar ? "Profile" : isAurora ? "About" : isBanner ? "Summary" : "Professional Summary"}
      </SectionTitle>
      <EditableText
        value={cv.summary}
        multiline
        placeholder="Write a short professional summary…"
        style={{ display: "block", minHeight: "3em" }}
        onCommit={(v) => onPatch((p) => ({ ...p, summary: v }))}
        onFocusField={bindFocus("summary")}
      />
    </SectionShell>
  ) : null;

  const experienceBlock = sectionIsPresent(cv, "experience") ? (
    <SectionShell
      {...shellFor({ scope: "section", sectionId: "experience", label: "Experience" })}
      style={{ marginTop: "0.9rem" }}
    >
      <SectionTitle accent={theme.accent}>Experience</SectionTitle>
      {cv.experience.map((job, i) => (
        <SectionShell
          key={i}
          {...shellFor({ scope: "entry", sectionId: "experience", index: i, label: "Role" })}
          className="cv-entry-shell"
          style={{
            marginBottom: "0.75rem",
            paddingLeft: kind === "timeline" ? "0.85rem" : 0,
            borderLeft: kind === "timeline" ? `2px solid ${theme.accentSoft}` : undefined,
          }}
        >
          <EditableText
            value={[job.title, job.company].filter(Boolean).join(" — ")}
            placeholder="Title — Company"
            style={{ fontWeight: 700, display: "block", color: theme.accent }}
            onCommit={(v) => {
              const [title, ...rest] = v.split("—").map((s) => s.trim());
              onPatch((p) => {
                const experience = [...p.experience];
                experience[i] = { ...experience[i], title: title || "", company: rest.join(" — ") };
                return { ...p, experience };
              });
            }}
            onFocusField={bindFocus("experience")}
          />
          <EditableText
            value={[job.start, job.end].filter(Boolean).join(" – ")}
            placeholder="Start – End"
            style={{ fontSize: "0.76rem", color: "#64748b", display: "block" }}
            onCommit={(v) => {
              const [start, end] = v.split("–").map((s) => s.trim());
              onPatch((p) => {
                const experience = [...p.experience];
                experience[i] = { ...experience[i], start: start || "", end: end || "" };
                return { ...p, experience };
              });
            }}
            onFocusField={bindFocus("experience")}
          />
          <EditableText
            value={job.bullets.join("\n")}
            multiline
            placeholder={"• Bullet 1\n• Bullet 2"}
            style={{ display: "block", marginTop: 4, minHeight: "2.5em" }}
            onCommit={(v) =>
              onPatch((p) => {
                const experience = [...p.experience];
                experience[i] = {
                  ...experience[i],
                  bullets: v.split("\n").map((s) => s.replace(/^[-•*]\s*/, "").trimEnd()),
                };
                return { ...p, experience };
              })
            }
            onFocusField={bindFocus("experience")}
          />
        </SectionShell>
      ))}
    </SectionShell>
  ) : null;

  const educationBlock = sectionIsPresent(cv, "education") ? (
    <SectionShell
      {...shellFor({ scope: "section", sectionId: "education", label: "Education" })}
      style={{ marginTop: "0.9rem" }}
    >
      <SectionTitle accent={theme.accent}>Education</SectionTitle>
      {cv.education.map((ed, i) => (
        <SectionShell
          key={i}
          {...shellFor({ scope: "entry", sectionId: "education", index: i, label: "Education entry" })}
          className="cv-entry-shell"
          style={{ marginBottom: "0.45rem" }}
        >
          <EditableText
            value={[ed.degree, ed.school, ed.year].filter(Boolean).join(" · ")}
            placeholder="Degree · School · Year"
            style={{ display: "block", fontWeight: 650 }}
            onCommit={(v) => {
              const parts = v.split("·").map((s) => s.trim());
              onPatch((p) => {
                const education = [...p.education];
                education[i] = {
                  ...education[i],
                  degree: parts[0] || "",
                  school: parts[1] || "",
                  year: parts[2] || "",
                };
                return { ...p, education };
              });
            }}
            onFocusField={bindFocus("education")}
          />
        </SectionShell>
      ))}
    </SectionShell>
  ) : null;

  const projectsBlock = sectionIsPresent(cv, "projects") ? (
    <SectionShell
      {...shellFor({ scope: "section", sectionId: "projects", label: "Projects" })}
      style={{ marginTop: "0.9rem" }}
    >
      <SectionTitle accent={theme.accent}>Projects</SectionTitle>
      {cv.projects.map((proj, i) => (
        <SectionShell
          key={i}
          {...shellFor({ scope: "entry", sectionId: "projects", index: i, label: "Project" })}
          className="cv-entry-shell"
          style={{ marginBottom: "0.45rem" }}
        >
          <EditableText
            value={proj.name}
            placeholder="Project name"
            style={{ fontWeight: 700, display: "block" }}
            onCommit={(v) =>
              onPatch((p) => {
                const projects = [...p.projects];
                projects[i] = { ...projects[i], name: v };
                return { ...p, projects };
              })
            }
            onFocusField={bindFocus("projects")}
          />
          <EditableText
            value={proj.description}
            multiline
            placeholder="Description"
            style={{ display: "block", marginTop: 2 }}
            onCommit={(v) =>
              onPatch((p) => {
                const projects = [...p.projects];
                projects[i] = { ...projects[i], description: v };
                return { ...p, projects };
              })
            }
            onFocusField={bindFocus("projects")}
          />
        </SectionShell>
      ))}
    </SectionShell>
  ) : null;

  const listSection = (
    title: string,
    sectionKey: "skills" | "certifications" | "languages" | "awards" | "interests",
    value: string[],
    placeholder: string,
    joinWith = ", ",
  ) =>
    value.length > 0 ? (
      <SectionShell
        {...shellFor({ scope: "section", sectionId: sectionKey, label: title })}
        style={{ marginTop: "0.9rem" }}
      >
        <SectionTitle accent={theme.accent}>{title}</SectionTitle>
        <EditableText
          value={value.join(joinWith)}
          multiline
          placeholder={placeholder}
          style={{ display: "block", minHeight: "1.6em" }}
          onCommit={(v) =>
            onPatch((p) => ({
              ...p,
              [sectionKey]: v
                .split(joinWith.trim() === "," ? /,/ : /\n/)
                .map((s) => s.trim())
                .filter(Boolean),
            }))
          }
          onFocusField={bindFocus(sectionKey)}
        />
      </SectionShell>
    ) : null;

  const skillsBlock = listSection("Skills", "skills", cv.skills, "Skill1, Skill2, Skill3…");
  const certsBlock = listSection("Certifications", "certifications", cv.certifications, "Cert A, Cert B…");
  const languages = cv.languages ?? [];
  const awards = cv.awards ?? [];
  const interests = cv.interests ?? [];
  const languagesBlock = listSection("Languages", "languages", languages, "English, Urdu…");
  const awardsBlock = listSection("Awards", "awards", awards, "Award title…");
  const interestsBlock = listSection("Interests", "interests", interests, "Interest 1, Interest 2…");

  const blockMap: Partial<Record<BodySectionId, ReactNode>> = {
    summary: summaryBlock,
    skills: skillsBlock,
    experience: experienceBlock,
    education: educationBlock,
    projects: projectsBlock,
    certifications: certsBlock,
    languages: languagesBlock,
    awards: awardsBlock,
    interests: interestsBlock,
  };

  const renderLane = (ids: BodySectionId[], column: "left" | "right") => (
    <div
      className={`cv-column-lane cv-column-lane--${column}`}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("text/section-id")) return;
        e.preventDefault();
        e.currentTarget.classList.add("is-drop-target");
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          e.currentTarget.classList.remove("is-drop-target");
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.currentTarget.classList.remove("is-drop-target");
        const draggedId = e.dataTransfer.getData("text/section-id");
        if (!isBodySectionId(draggedId)) return;
        onPatch((p) => moveSectionColumn(p, draggedId, column, splitMode));
      }}
    >
      {ids.map((id) => blockMap[id])}
      {!ids.length && <div className="cv-column-empty">Drop section here ({column})</div>}
    </div>
  );

  const orderedBlocks = presentOrder.map((id) => blockMap[id]).filter(Boolean);
  const mainColumn = useTwoColumns ? (
    <div className="cv-split-body">
      {renderLane(columns.left, "left")}
      {renderLane(columns.right, "right")}
    </div>
  ) : (
    <>{orderedBlocks}</>
  );

  let body: ReactNode;

  if (isSidebar || isMagazine) {
    body = (
      <>
        <aside
          style={{
            background: isMagazine
              ? `linear-gradient(165deg, ${theme.accent} 0%, ${theme.accent}dd 70%, #0f172a 140%)`
              : theme.railBg,
            color: isMagazine ? "#fff" : theme.railText,
            padding: "1.2rem 0.9rem",
            minWidth: 0,
            overflow: "visible",
          }}
        >
          {nameBlock}
          {contactStack}
        </aside>
        <div style={{ padding: "1.15rem", minWidth: 0, overflow: "visible" }}>{mainColumn}</div>
      </>
    );
  } else if (isAurora) {
    body = (
      <>
        <header
          style={{
            padding: "1.5rem 1.4rem 1.25rem",
            background: "linear-gradient(125deg, #a5f3fc 0%, #c4b5fd 45%, #fbcfe8 100%)",
            color: theme.headerText,
          }}
        >
          {nameBlock}
          {contactLine}
        </header>
        <div style={{ padding: "1.15rem 1.25rem", fontSize: "0.86rem" }}>{mainColumn}</div>
      </>
    );
  } else if (isBanner) {
    body = (
      <>
        <header
          style={{
            padding: "1.4rem 1.45rem 1.2rem",
            background: `linear-gradient(115deg, ${theme.accent} 0%, ${theme.accent}bb 55%, ${theme.accentSoft} 160%)`,
            color: theme.headerText,
          }}
        >
          {nameBlock}
          {contactLine}
        </header>
        <div style={{ padding: "1rem", background: theme.accentSoft, fontSize: "0.85rem" }}>{mainColumn}</div>
      </>
    );
  } else if (isFrame) {
    body = (
      <div
        style={{
          background: "#fff",
          border: `2px solid ${theme.accent}`,
          padding: "1.2rem 1.3rem",
          minHeight: 480,
          position: "relative",
        }}
      >
        <header style={{ textAlign: "center", marginBottom: "0.75rem" }}>
          {nameBlock}
          {contactLine}
        </header>
        {mainColumn}
      </div>
    );
  } else {
    body = (
      <>
        <header
          style={{
            textAlign: kind === "executive" ? "left" : "center",
            marginBottom: "0.75rem",
            ...(kind === "executive"
              ? { borderBottom: `3px solid ${theme.accent}`, paddingBottom: "0.75rem" }
              : {}),
          }}
        >
          {nameBlock}
          {kind !== "executive" && (
            <div
              style={{
                height: 2,
                width: 64,
                background: theme.accent,
                margin: "0.4rem auto 0.45rem",
                borderRadius: 2,
              }}
            />
          )}
          {contactLine}
        </header>
        {mainColumn}
      </>
    );
  }

  return (
    <div className="direct-edit-root preview-canvas-wrap">
      <article style={articleStyle} className="direct-edit-cv">
        {body}
        <div className="cv-new-section-bar">
          {missingSections.length > 0 ? (
            <>
              <button
                type="button"
                className="cv-new-section-btn"
                onClick={() => setPickerOpen(true)}
                aria-label="Add new section"
              >
                +
              </button>
              <span>Add section</span>
            </>
          ) : (
            <span className="cv-sections-complete">All section types added</span>
          )}
        </div>
      </article>

      {pickerOpen && (
        <div className="section-picker" role="dialog" aria-label="Choose a section to add">
          <button type="button" className="section-picker-backdrop" aria-label="Close" onClick={() => setPickerOpen(false)} />
          <div className="section-picker-card">
            <header className="section-picker-head">
              <div>
                <h3>Add a section</h3>
                <p>
                  {missingSections.length
                    ? "Only sections not yet on your resume are listed."
                    : "Every section type is already on this resume."}
                </p>
              </div>
              <button type="button" className="editor-panel-close" onClick={() => setPickerOpen(false)} aria-label="Close">
                ×
              </button>
            </header>
            {missingSections.length ? (
              <div className="section-picker-grid">
                {missingSections.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    className="section-template-tile"
                    onClick={() => addFromTemplate(tpl.id)}
                  >
                    <span className="section-template-icon" aria-hidden>
                      {tpl.icon}
                    </span>
                    <strong>{tpl.label}</strong>
                    <span>{tpl.blurb}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="section-picker-empty">Nothing left to add. Use each section’s + to add another entry.</p>
            )}
          </div>
        </div>
      )}

      <p className="direct-edit-hint">Drag ⠿ on the left to move · Add · Format · AI · Delete</p>
    </div>
  );
}
