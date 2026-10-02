import React from "react";
import {
  Document,
  Image,
  Link,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
  type DocumentProps,
} from "@react-pdf/renderer";
import type { BodySectionId, StructuredCv, TemplateId } from "@/lib/cv-types";
import { resolveTheme, type CustomColorPalette } from "@/lib/templates";
import {
  columnsForExport,
  exportModeFromKind,
  exportPlain,
  isListSection,
  labelFor,
  listText,
  orderedSections,
} from "@/server/export/layout";

const ink = "#1a1a1a";
const muted = "#555555";

function contactLine(cv: StructuredCv): string {
  return [cv.personal.email, cv.personal.phone, cv.personal.location, ...cv.personal.links]
    .map((x) => exportPlain(x))
    .filter(Boolean)
    .join(" · ");
}

function contactHref(
  cv: StructuredCv,
  kind: "email" | "phone" | "location" | "link",
  text: string,
  linkIndex = 0,
): string | null {
  const manual =
    kind === "email"
      ? cv.personal.hrefs?.email
      : kind === "phone"
        ? cv.personal.hrefs?.phone
        : kind === "location"
          ? cv.personal.hrefs?.location
          : cv.personal.hrefs?.links?.[linkIndex];
  if (manual?.trim()) return manual.trim();
  const t = text.trim();
  if (!t) return null;
  if (/^(mailto:|tel:|https?:\/\/)/i.test(t)) return t;
  if (kind === "email" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(t)) return `mailto:${t}`;
  if (kind === "phone") {
    const digits = t.replace(/[^\d+]/g, "");
    if (digits.replace(/\D/g, "").length >= 7) {
      return `tel:${digits.startsWith("+") ? digits : digits.replace(/\D/g, "")}`;
    }
  }
  if (/^(www\.|[a-z0-9.-]+\.[a-z]{2,})/i.test(t)) return `https://${t.replace(/^\/\//, "")}`;
  return null;
}

function ContactText({
  cv,
  kind,
  text,
  style,
  linkIndex = 0,
}: {
  cv: StructuredCv;
  kind: "email" | "phone" | "location" | "link";
  text: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  style: any;
  linkIndex?: number;
}) {
  const href = contactHref(cv, kind, text, linkIndex);
  if (href) {
    return (
      <Link src={href} style={style}>
        {text}
      </Link>
    );
  }
  return <Text style={style}>{text}</Text>;
}

// react-pdf style bags vary by StyleSheet.create shape
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SheetStyles = Record<string, any>;

function ExperienceBlock({ cv, s }: { cv: StructuredCv; s: SheetStyles }) {
  return (
    <>
      {cv.experience.map((job, i) => (
        <View key={i} style={s.block}>
          <Text style={s.jobTitle}>
            {[exportPlain(job.title), exportPlain(job.company)].filter(Boolean).join(" — ")}
          </Text>
          <Text style={s.meta}>
            {[exportPlain(job.start), exportPlain(job.end)].filter(Boolean).join(" – ")}
            {exportPlain(job.location) ? ` · ${exportPlain(job.location)}` : ""}
          </Text>
          {job.bullets.map((b, j) => (
            <Text key={j} style={s.bullet}>
              • {exportPlain(b)}
            </Text>
          ))}
        </View>
      ))}
    </>
  );
}

function EducationBlock({ cv, s }: { cv: StructuredCv; s: SheetStyles }) {
  return (
    <>
      {cv.education.map((ed, i) => (
        <View key={i} style={s.block}>
          <Text style={s.jobTitle}>
            {[exportPlain(ed.degree), exportPlain(ed.school)].filter(Boolean).join(" — ")}
          </Text>
          {(ed.year || ed.details) && (
            <Text style={s.meta}>
              {[exportPlain(ed.year), exportPlain(ed.details)].filter(Boolean).join(" · ")}
            </Text>
          )}
        </View>
      ))}
    </>
  );
}

function ProjectsBlock({ cv, s }: { cv: StructuredCv; s: SheetStyles }) {
  return (
    <>
      {cv.projects.map((p, i) => (
        <View key={i} style={s.block}>
          <Text style={s.jobTitle}>{exportPlain(p.name)}</Text>
          {!!exportPlain(p.description) && <Text style={s.body}>{exportPlain(p.description)}</Text>}
          {(p.bullets || []).map((b, j) => (
            <Text key={j} style={s.bullet}>
              • {exportPlain(b)}
            </Text>
          ))}
        </View>
      ))}
    </>
  );
}

function SectionView({
  id,
  cv,
  s,
  h2Style,
}: {
  id: BodySectionId;
  cv: StructuredCv;
  s: SheetStyles;
  h2Style?: SheetStyles[string];
}) {
  const heading = <Text style={h2Style || s.h2}>{labelFor(id)}</Text>;
  if (id === "summary") {
    if (!exportPlain(cv.summary)) return null;
    return (
      <>
        {heading}
        <Text style={s.body}>{exportPlain(cv.summary)}</Text>
      </>
    );
  }
  if (isListSection(id)) {
    const text = listText(cv, id);
    if (!text) return null;
    return (
      <>
        {heading}
        <Text style={s.body}>{text}</Text>
      </>
    );
  }
  if (id === "experience") {
    if (!cv.experience.length) return null;
    return (
      <>
        {heading}
        <ExperienceBlock cv={cv} s={s} />
      </>
    );
  }
  if (id === "education") {
    if (!cv.education.length) return null;
    return (
      <>
        {heading}
        <EducationBlock cv={cv} s={s} />
      </>
    );
  }
  if (id === "projects") {
    if (!cv.projects.length) return null;
    return (
      <>
        {heading}
        <ProjectsBlock cv={cv} s={s} />
      </>
    );
  }
  return null;
}

function Sections({
  ids,
  cv,
  s,
  h2Style,
}: {
  ids: BodySectionId[];
  cv: StructuredCv;
  s: SheetStyles;
  h2Style?: SheetStyles[string];
}) {
  return (
    <>
      {ids.map((id) => (
        <View key={id}>
          <SectionView id={id} cv={cv} s={s} h2Style={h2Style} />
        </View>
      ))}
    </>
  );
}

function ClassicDoc({
  cv,
  accent,
  compact,
  alignLeft,
  softBg,
  timeline,
  photoMode,
}: {
  cv: StructuredCv;
  accent: string;
  compact?: boolean;
  alignLeft?: boolean;
  softBg?: string;
  timeline?: boolean;
  photoMode?: "portrait" | "medallion" | null;
}) {
  const photo = cv.personal.photo;
  const centered = photoMode === "medallion" || (!alignLeft && !photoMode);
  const leftish = alignLeft || photoMode === "portrait";
  const s = StyleSheet.create({
    page: {
      padding: compact ? 28 : 40,
      fontFamily: "Helvetica",
      fontSize: compact ? 9 : 10,
      color: ink,
      backgroundColor: softBg || "#ffffff",
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 10,
      borderBottomWidth: photoMode === "portrait" ? 3 : 0,
      borderBottomColor: accent,
      paddingBottom: photoMode === "portrait" ? 10 : 0,
    },
    headerCenter: {
      alignItems: "center",
      marginBottom: 10,
    },
    photo: {
      width: photoMode === "medallion" ? 72 : 64,
      height: photoMode === "medallion" ? 72 : 64,
      borderRadius: 999,
      objectFit: "cover",
      borderWidth: 2,
      borderColor: accent,
      marginBottom: photoMode === "medallion" ? 8 : 0,
    },
    headerTextCol: { flexGrow: 1 },
    name: {
      fontSize: compact ? 15 : 18,
      fontFamily: "Helvetica-Bold",
      textAlign: centered ? "center" : leftish ? "left" : "center",
      marginBottom: 4,
      color: accent,
    },
    rule: {
      height: 3,
      backgroundColor: accent,
      marginBottom: compact ? 8 : 12,
      width: leftish || photoMode === "medallion" ? 56 : "100%",
      alignSelf: centered ? "center" : "flex-start",
    },
    contact: {
      fontSize: compact ? 8 : 9,
      color: muted,
      textAlign: centered ? "center" : leftish ? "left" : "center",
      marginBottom: compact ? 8 : 10,
    },
    h2: {
      fontSize: compact ? 10 : 11,
      fontFamily: "Helvetica-Bold",
      textTransform: "uppercase",
      marginTop: compact ? 6 : 10,
      marginBottom: compact ? 2 : 4,
      borderBottomWidth: 1.5,
      borderBottomColor: accent,
      paddingBottom: 2,
      color: accent,
    },
    body: { marginBottom: compact ? 2 : 4, lineHeight: 1.35 },
    jobTitle: { fontFamily: "Helvetica-Bold", marginTop: compact ? 4 : 6 },
    meta: { fontSize: compact ? 8 : 9, color: muted, marginBottom: 2 },
    bullet: {
      marginLeft: compact ? 8 : 10,
      marginBottom: 2,
      ...(timeline
        ? { borderLeftWidth: 2, borderLeftColor: accent, paddingLeft: 8, marginLeft: 4 }
        : {}),
    },
    block: timeline
      ? { borderLeftWidth: 2, borderLeftColor: accent, paddingLeft: 10, marginTop: 4 }
      : {},
  });

  const identity = (
    <>
      <Text style={s.name}>{exportPlain(cv.personal.fullName) || "Resume"}</Text>
      {(leftish || photoMode === "medallion") && <View style={s.rule} />}
      <Text style={s.contact}>{contactLine(cv)}</Text>
    </>
  );

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {photoMode === "portrait" ? (
          <View style={s.headerRow}>
            {photo ? (
              // react-pdf Image has no alt; photo is decorative in layout
              // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image
              <Image src={photo} style={s.photo} />
            ) : null}
            <View style={s.headerTextCol}>{identity}</View>
          </View>
        ) : photoMode === "medallion" ? (
          <View style={s.headerCenter}>
            {photo ? (
              // react-pdf Image has no alt; photo is decorative in layout
              // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image
              <Image src={photo} style={s.photo} />
            ) : null}
            {identity}
          </View>
        ) : (
          <>
            <Text style={s.name}>{exportPlain(cv.personal.fullName) || "Resume"}</Text>
            {alignLeft ? <View style={s.rule} /> : null}
            <Text style={s.contact}>{contactLine(cv)}</Text>
          </>
        )}
        <Sections ids={orderedSections(cv)} cv={cv} s={s} />
      </Page>
    </Document>
  );
}

function SidebarDoc({
  cv,
  accent,
  railBg,
  railText,
  kind,
}: {
  cv: StructuredCv;
  accent: string;
  railBg: string;
  railText: string;
  kind: "sidebar" | "magazine";
}) {
  const { left, right } = columnsForExport(cv, kind);
  const s = StyleSheet.create({
    page: { padding: 0, fontFamily: "Helvetica", fontSize: 9, color: ink, flexDirection: "row" },
    left: {
      width: kind === "magazine" ? "28%" : "34%",
      backgroundColor: railBg,
      color: railText,
      padding: 18,
      minHeight: "100%",
      alignSelf: "stretch",
    },
    right: {
      width: kind === "magazine" ? "72%" : "66%",
      padding: 22,
      backgroundColor: "#ffffff",
      minHeight: "100%",
      alignSelf: "stretch",
    },
    name: { fontSize: 14, fontFamily: "Helvetica-Bold", marginBottom: 6, color: railText },
    contact: { fontSize: 8, marginBottom: 4, color: railText },
    h2: {
      fontSize: 10,
      fontFamily: "Helvetica-Bold",
      textTransform: "uppercase",
      marginTop: 8,
      marginBottom: 3,
      color: accent,
    },
    h2Rail: {
      fontSize: 10,
      fontFamily: "Helvetica-Bold",
      textTransform: "uppercase",
      marginTop: 10,
      marginBottom: 3,
      color: railText,
      borderBottomWidth: 1,
      borderBottomColor: railText,
      paddingBottom: 2,
      opacity: 0.9,
    },
    body: { marginBottom: 3, lineHeight: 1.35 },
    jobTitle: { fontFamily: "Helvetica-Bold", marginTop: 5 },
    meta: { fontSize: 8, color: muted, marginBottom: 1 },
    bullet: { marginLeft: 8, marginBottom: 1 },
    block: {},
  });

  // Editor puts name/contact in the rail; left column sections also go in rail.
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.left}>
          <Text style={s.name}>{exportPlain(cv.personal.fullName) || "Resume"}</Text>
          {!!cv.personal.email && (
            <ContactText cv={cv} kind="email" text={cv.personal.email} style={s.contact} />
          )}
          {!!cv.personal.phone && (
            <ContactText cv={cv} kind="phone" text={cv.personal.phone} style={s.contact} />
          )}
          {!!cv.personal.location && (
            <ContactText cv={cv} kind="location" text={cv.personal.location} style={s.contact} />
          )}
          {cv.personal.links.map((l, i) => (
            <ContactText key={i} cv={cv} kind="link" text={l} linkIndex={i} style={s.contact} />
          ))}
          <Sections ids={left} cv={cv} s={s} h2Style={s.h2Rail} />
        </View>
        <View style={s.right}>
          <Sections ids={right} cv={cv} s={s} />
        </View>
      </Page>
    </Document>
  );
}

function BannerDoc({
  cv,
  accent,
  headerText,
  soft,
  kind,
}: {
  cv: StructuredCv;
  accent: string;
  headerText: string;
  soft: string;
  kind: "folio" | "aurora" | "spotlight";
}) {
  const { left, right } = columnsForExport(cv, kind === "spotlight" ? "aurora" : kind);
  const photo = kind === "spotlight" ? cv.personal.photo : undefined;
  const s = StyleSheet.create({
    page: { padding: 0, fontFamily: "Helvetica", fontSize: 9, color: ink },
    header: {
      backgroundColor: kind === "aurora" ? soft : accent,
      color: kind === "aurora" ? ink : headerText,
      padding: 24,
      paddingBottom: 18,
      flexDirection: kind === "spotlight" ? "row" : "column",
      alignItems: kind === "spotlight" ? "center" : "flex-start",
      gap: 12,
    },
    headerTextCol: { flexGrow: 1 },
    photo: {
      width: 70,
      height: 70,
      borderRadius: 10,
      objectFit: "cover",
      borderWidth: 2,
      borderColor: "#ffffff",
    },
    name: {
      fontSize: 18,
      fontFamily: "Helvetica-Bold",
      color: kind === "aurora" ? accent : headerText,
      marginBottom: 4,
    },
    contact: { fontSize: 8, color: kind === "aurora" ? muted : headerText },
    bodyWrap: { padding: 20, flexDirection: "row", gap: 12, backgroundColor: soft },
    col: { flexGrow: 1, flexBasis: 0, backgroundColor: "#ffffff", padding: 12 },
    h2: {
      fontSize: 10,
      fontFamily: "Helvetica-Bold",
      textTransform: "uppercase",
      marginTop: 8,
      marginBottom: 3,
      color: accent,
    },
    body: { marginBottom: 3, lineHeight: 1.35 },
    jobTitle: { fontFamily: "Helvetica-Bold", marginTop: 5 },
    meta: { fontSize: 8, color: muted, marginBottom: 1 },
    bullet: { marginLeft: 8, marginBottom: 1 },
    block: {},
  });

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View style={s.headerTextCol}>
            <Text style={s.name}>{exportPlain(cv.personal.fullName) || "Resume"}</Text>
            <Text style={s.contact}>{contactLine(cv)}</Text>
          </View>
          {photo ? (
            // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image
            <Image src={photo} style={s.photo} />
          ) : null}
        </View>
        <View style={s.bodyWrap}>
          <View style={s.col}>
            <Sections ids={left} cv={cv} s={s} />
          </View>
          <View style={s.col}>
            <Sections ids={right} cv={cv} s={s} />
          </View>
        </View>
      </Page>
    </Document>
  );
}

function FrameDoc({ cv, accent, soft }: { cv: StructuredCv; accent: string; soft: string }) {
  const s = StyleSheet.create({
    page: { padding: 16, fontFamily: "Helvetica", fontSize: 10, color: ink, backgroundColor: soft },
    frame: {
      flexGrow: 1,
      borderWidth: 2,
      borderColor: accent,
      padding: 22,
      backgroundColor: "#ffffff",
    },
    name: {
      fontSize: 18,
      fontFamily: "Helvetica-Bold",
      textAlign: "center",
      marginBottom: 4,
      color: accent,
    },
    contact: { fontSize: 9, color: muted, textAlign: "center", marginBottom: 12 },
    h2: {
      fontSize: 11,
      fontFamily: "Helvetica-Bold",
      textTransform: "uppercase",
      marginTop: 10,
      marginBottom: 4,
      borderBottomWidth: 1.5,
      borderBottomColor: accent,
      paddingBottom: 2,
      color: accent,
    },
    body: { marginBottom: 4, lineHeight: 1.4 },
    jobTitle: { fontFamily: "Helvetica-Bold", marginTop: 6 },
    meta: { fontSize: 9, color: muted, marginBottom: 2 },
    bullet: { marginLeft: 10, marginBottom: 2 },
    block: {},
  });

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.frame}>
          <Text style={s.name}>{exportPlain(cv.personal.fullName) || "Resume"}</Text>
          <Text style={s.contact}>{contactLine(cv)}</Text>
          <Sections ids={orderedSections(cv)} cv={cv} s={s} />
        </View>
      </Page>
    </Document>
  );
}

export async function buildPdf(
  cv: StructuredCv,
  templateId: TemplateId,
  colorThemeId?: string | null,
  customThemes?: CustomColorPalette[] | null,
): Promise<Buffer> {
  const theme = resolveTheme(templateId, colorThemeId, customThemes);
  const mode = exportModeFromKind(theme.kind);
  let element: React.ReactElement;

  if (mode === "sidebar") {
    element = (
      <SidebarDoc
        cv={cv}
        accent={theme.accent}
        railBg={theme.railBg}
        railText={theme.railText}
        kind={theme.kind === "magazine" ? "magazine" : "sidebar"}
      />
    );
  } else if (mode === "banner") {
    element = (
      <BannerDoc
        cv={cv}
        accent={theme.accent}
        headerText={theme.headerText}
        soft={theme.accentSoft}
        kind={theme.kind === "aurora" ? "aurora" : theme.kind === "spotlight" ? "spotlight" : "folio"}
      />
    );
  } else if (mode === "frame") {
    element = <FrameDoc cv={cv} accent={theme.accent} soft={theme.accentSoft} />;
  } else {
    element = (
      <ClassicDoc
        cv={cv}
        accent={theme.accent}
        compact={theme.kind === "compact"}
        alignLeft={theme.kind === "executive"}
        softBg={
          theme.kind === "cards" || theme.kind === "crest" || theme.kind === "medallion"
            ? theme.accentSoft
            : undefined
        }
        timeline={theme.kind === "timeline"}
        photoMode={
          theme.kind === "portrait" ? "portrait" : theme.kind === "medallion" ? "medallion" : null
        }
      />
    );
  }

  const buf = await renderToBuffer(element as React.ReactElement<DocumentProps>);
  return Buffer.from(buf);
}
