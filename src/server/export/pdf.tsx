import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
  type DocumentProps,
} from "@react-pdf/renderer";
import type { StructuredCv, TemplateId } from "@/lib/cv-types";
import { getTheme } from "@/lib/templates";

const ink = "#1a1a1a";
const muted = "#555555";

function contactLine(cv: StructuredCv): string {
  return [cv.personal.email, cv.personal.phone, cv.personal.location, ...cv.personal.links]
    .filter(Boolean)
    .join(" · ");
}

function makeClassic(accent: string, compact?: boolean) {
  return StyleSheet.create({
    page: { padding: compact ? 28 : 40, fontFamily: "Helvetica", fontSize: compact ? 9 : 10, color: ink },
    name: {
      fontSize: compact ? 15 : 18,
      fontFamily: "Helvetica-Bold",
      textAlign: "center",
      marginBottom: 4,
      color: accent,
    },
    contact: { fontSize: compact ? 8 : 9, color: muted, textAlign: "center", marginBottom: compact ? 8 : 14 },
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
    bullet: { marginLeft: compact ? 8 : 10, marginBottom: 2 },
  });
}

function makeSidebar(accent: string, railBg: string, railText: string) {
  return StyleSheet.create({
    page: { padding: 0, fontFamily: "Helvetica", fontSize: 9, color: ink, flexDirection: "row" },
    left: { width: "32%", backgroundColor: railBg, color: railText, padding: 18 },
    right: { width: "68%", padding: 22 },
    name: { fontSize: 14, fontFamily: "Helvetica-Bold", marginBottom: 6, color: railText },
    contact: { fontSize: 8, marginBottom: 10, color: railText },
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
      marginTop: 8,
      marginBottom: 3,
      color: railText,
    },
    body: { marginBottom: 3, lineHeight: 1.35 },
    jobTitle: { fontFamily: "Helvetica-Bold", marginTop: 5 },
    meta: { fontSize: 8, color: muted, marginBottom: 1 },
    bullet: { marginLeft: 8, marginBottom: 1 },
  });
}

function makeBanner(accent: string, headerText: string, soft: string) {
  return StyleSheet.create({
    page: { padding: 0, fontFamily: "Helvetica", fontSize: 9, color: ink },
    header: { backgroundColor: accent, color: headerText, padding: 24, paddingBottom: 18 },
    name: { fontSize: 18, fontFamily: "Helvetica-Bold", color: headerText, marginBottom: 4 },
    contact: { fontSize: 8, color: headerText },
    bodyWrap: { padding: 20, flexDirection: "row", gap: 12, backgroundColor: soft },
    left: { width: "38%", backgroundColor: "#ffffff", padding: 12 },
    right: { width: "62%", backgroundColor: "#ffffff", padding: 12 },
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
  });
}

function makeAccent(accent: string) {
  return StyleSheet.create({
    page: { padding: 0, fontFamily: "Helvetica", fontSize: 10, color: ink, flexDirection: "row" },
    bar: { width: 10, backgroundColor: accent },
    main: { flexGrow: 1, padding: 28, paddingLeft: 22 },
    name: { fontSize: 18, fontFamily: "Helvetica-Bold", color: accent, marginBottom: 4 },
    contact: { fontSize: 9, color: muted, marginBottom: 12 },
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
    jobTitle: { fontFamily: "Helvetica-Bold", marginTop: 6, color: accent },
    meta: { fontSize: 9, color: muted, marginBottom: 2 },
    bullet: { marginLeft: 10, marginBottom: 2 },
  });
}

type StyleBag = ReturnType<typeof makeClassic>;

function ExperienceBlock({ cv, styles }: { cv: StructuredCv; styles: StyleBag }) {
  return (
    <>
      {cv.experience.map((job, i) => (
        <View key={i}>
          <Text style={styles.jobTitle}>{[job.title, job.company].filter(Boolean).join(" — ")}</Text>
          <Text style={styles.meta}>
            {[job.start, job.end].filter(Boolean).join(" – ")}
            {job.location ? ` · ${job.location}` : ""}
          </Text>
          {job.bullets.map((b, j) => (
            <Text key={j} style={styles.bullet}>
              • {b}
            </Text>
          ))}
        </View>
      ))}
    </>
  );
}

function ClassicDoc({ cv, accent, compact }: { cv: StructuredCv; accent: string; compact?: boolean }) {
  const s = makeClassic(accent, compact);
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.name}>{cv.personal.fullName || "Resume"}</Text>
        <Text style={s.contact}>{contactLine(cv)}</Text>
        {!!cv.summary && (
          <>
            <Text style={s.h2}>Professional Summary</Text>
            <Text style={s.body}>{cv.summary}</Text>
          </>
        )}
        {!!cv.skills.length && (
          <>
            <Text style={s.h2}>Skills</Text>
            <Text style={s.body}>{cv.skills.join(" · ")}</Text>
          </>
        )}
        {!!cv.experience.length && (
          <>
            <Text style={s.h2}>Experience</Text>
            <ExperienceBlock cv={cv} styles={s} />
          </>
        )}
        {!!cv.education.length && (
          <>
            <Text style={s.h2}>Education</Text>
            {cv.education.map((ed, i) => (
              <View key={i}>
                <Text style={s.jobTitle}>{[ed.degree, ed.school].filter(Boolean).join(" — ")}</Text>
                {(ed.year || ed.details) && (
                  <Text style={s.meta}>{[ed.year, ed.details].filter(Boolean).join(" · ")}</Text>
                )}
              </View>
            ))}
          </>
        )}
        {!!cv.projects.length && (
          <>
            <Text style={s.h2}>Projects</Text>
            {cv.projects.map((p, i) => (
              <View key={i}>
                <Text style={s.jobTitle}>{p.name}</Text>
                {!!p.description && <Text style={s.body}>{p.description}</Text>}
              </View>
            ))}
          </>
        )}
        {!!cv.certifications.length && (
          <>
            <Text style={s.h2}>Certifications</Text>
            <Text style={s.body}>{cv.certifications.join(" · ")}</Text>
          </>
        )}
      </Page>
    </Document>
  );
}

function SidebarDoc({
  cv,
  accent,
  railBg,
  railText,
}: {
  cv: StructuredCv;
  accent: string;
  railBg: string;
  railText: string;
}) {
  const s = makeSidebar(accent, railBg, railText);
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.left}>
          <Text style={s.name}>{cv.personal.fullName || "Resume"}</Text>
          {!!cv.personal.email && <Text style={s.contact}>{cv.personal.email}</Text>}
          {!!cv.personal.phone && <Text style={s.contact}>{cv.personal.phone}</Text>}
          {!!cv.personal.location && <Text style={s.contact}>{cv.personal.location}</Text>}
          {cv.personal.links.map((l, i) => (
            <Text key={i} style={s.contact}>
              {l}
            </Text>
          ))}
          {!!cv.skills.length && (
            <>
              <Text style={s.h2Rail}>Skills</Text>
              {cv.skills.map((sk, i) => (
                <Text key={i} style={s.bullet}>
                  • {sk}
                </Text>
              ))}
            </>
          )}
          {!!cv.certifications.length && (
            <>
              <Text style={s.h2Rail}>Certifications</Text>
              <Text style={s.body}>{cv.certifications.join(", ")}</Text>
            </>
          )}
        </View>
        <View style={s.right}>
          {!!cv.summary && (
            <>
              <Text style={s.h2}>Summary</Text>
              <Text style={s.body}>{cv.summary}</Text>
            </>
          )}
          {!!cv.experience.length && (
            <>
              <Text style={s.h2}>Experience</Text>
              <ExperienceBlock cv={cv} styles={s as unknown as StyleBag} />
            </>
          )}
          {!!cv.education.length && (
            <>
              <Text style={s.h2}>Education</Text>
              {cv.education.map((ed, i) => (
                <View key={i}>
                  <Text style={s.jobTitle}>{[ed.degree, ed.school].filter(Boolean).join(" — ")}</Text>
                  {!!ed.year && <Text style={s.meta}>{ed.year}</Text>}
                </View>
              ))}
            </>
          )}
          {!!cv.projects.length && (
            <>
              <Text style={s.h2}>Projects</Text>
              {cv.projects.map((p, i) => (
                <View key={i}>
                  <Text style={s.jobTitle}>{p.name}</Text>
                  {!!p.description && <Text style={s.body}>{p.description}</Text>}
                </View>
              ))}
            </>
          )}
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
}: {
  cv: StructuredCv;
  accent: string;
  headerText: string;
  soft: string;
}) {
  const s = makeBanner(accent, headerText, soft);
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.name}>{cv.personal.fullName || "Resume"}</Text>
          <Text style={s.contact}>{contactLine(cv)}</Text>
        </View>
        <View style={s.bodyWrap}>
          <View style={s.left}>
            {!!cv.skills.length && (
              <>
                <Text style={s.h2}>Skills</Text>
                <Text style={s.body}>{cv.skills.join(" · ")}</Text>
              </>
            )}
            {!!cv.education.length && (
              <>
                <Text style={s.h2}>Education</Text>
                {cv.education.map((ed, i) => (
                  <View key={i}>
                    <Text style={s.jobTitle}>{[ed.degree, ed.school].filter(Boolean).join(" — ")}</Text>
                    {!!ed.year && <Text style={s.meta}>{ed.year}</Text>}
                  </View>
                ))}
              </>
            )}
            {!!cv.certifications.length && (
              <>
                <Text style={s.h2}>Certifications</Text>
                <Text style={s.body}>{cv.certifications.join(" · ")}</Text>
              </>
            )}
          </View>
          <View style={s.right}>
            {!!cv.summary && (
              <>
                <Text style={s.h2}>Summary</Text>
                <Text style={s.body}>{cv.summary}</Text>
              </>
            )}
            {!!cv.experience.length && (
              <>
                <Text style={s.h2}>Experience</Text>
                <ExperienceBlock cv={cv} styles={s as unknown as StyleBag} />
              </>
            )}
            {!!cv.projects.length && (
              <>
                <Text style={s.h2}>Projects</Text>
                {cv.projects.map((p, i) => (
                  <View key={i}>
                    <Text style={s.jobTitle}>{p.name}</Text>
                    {!!p.description && <Text style={s.body}>{p.description}</Text>}
                  </View>
                ))}
              </>
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
}

function AccentDoc({ cv, accent }: { cv: StructuredCv; accent: string }) {
  const s = makeAccent(accent);
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.bar} />
        <View style={s.main}>
          <Text style={s.name}>{cv.personal.fullName || "Resume"}</Text>
          <Text style={s.contact}>{contactLine(cv)}</Text>
          {!!cv.summary && (
            <>
              <Text style={s.h2}>Summary</Text>
              <Text style={s.body}>{cv.summary}</Text>
            </>
          )}
          {!!cv.skills.length && (
            <>
              <Text style={s.h2}>Skills</Text>
              <Text style={s.body}>{cv.skills.join(" · ")}</Text>
            </>
          )}
          {!!cv.experience.length && (
            <>
              <Text style={s.h2}>Experience</Text>
              <ExperienceBlock cv={cv} styles={s as unknown as StyleBag} />
            </>
          )}
          {!!cv.education.length && (
            <>
              <Text style={s.h2}>Education</Text>
              {cv.education.map((ed, i) => (
                <View key={i}>
                  <Text style={s.jobTitle}>{[ed.degree, ed.school].filter(Boolean).join(" — ")}</Text>
                  {!!ed.year && <Text style={s.meta}>{ed.year}</Text>}
                </View>
              ))}
            </>
          )}
          {!!cv.projects.length && (
            <>
              <Text style={s.h2}>Projects</Text>
              {cv.projects.map((p, i) => (
                <View key={i}>
                  <Text style={s.jobTitle}>{p.name}</Text>
                  {!!p.description && <Text style={s.body}>{p.description}</Text>}
                </View>
              ))}
            </>
          )}
          {!!cv.certifications.length && (
            <>
              <Text style={s.h2}>Certifications</Text>
              <Text style={s.body}>{cv.certifications.join(" · ")}</Text>
            </>
          )}
        </View>
      </Page>
    </Document>
  );
}

export async function buildPdf(cv: StructuredCv, templateId: TemplateId): Promise<Buffer> {
  const theme = getTheme(templateId);
  let element: React.ReactElement;
  if (theme.kind === "compact") {
    element = <ClassicDoc cv={cv} accent={theme.accent} compact />;
  } else if (theme.kind === "sidebar") {
    element = (
      <SidebarDoc cv={cv} accent={theme.accent} railBg={theme.railBg} railText={theme.railText} />
    );
  } else if (theme.kind === "banner" || theme.kind === "aurora" || theme.kind === "magazine") {
    element = (
      <BannerDoc
        cv={cv}
        accent={theme.accent}
        headerText={theme.headerText === "#0f172a" ? "#ffffff" : theme.headerText}
        soft={theme.accentSoft}
      />
    );
  } else if (theme.kind === "frame") {
    element = <AccentDoc cv={cv} accent={theme.accent} />;
  } else if (
    theme.kind === "executive" ||
    theme.kind === "timeline" ||
    theme.kind === "cards"
  ) {
    element = <ClassicDoc cv={cv} accent={theme.accent} />;
  } else {
    element = <ClassicDoc cv={cv} accent={theme.accent} />;
  }

  const buf = await renderToBuffer(element as React.ReactElement<DocumentProps>);
  return Buffer.from(buf);
}
