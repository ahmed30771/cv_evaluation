import type { StructuredCv } from "@/lib/cv-types";

/** Demo CV for template thumbnail previews only (not user data). */
export const TEMPLATE_PREVIEW_SAMPLE: StructuredCv = {
  personal: {
    fullName: "Alex Morgan",
    email: "alex.morgan@email.com",
    phone: "+1 (555) 010-2048",
    location: "Austin, TX",
    links: ["linkedin.com/in/alexmorgan", "alexmorgan.dev"],
  },
  summary:
    "Product-minded engineer with 5+ years shipping reliable web apps. Focused on clear UX, measurable outcomes, and cross-functional delivery.",
  skills: ["TypeScript", "React", "Node.js", "SQL", "Figma", "A/B testing", "Stakeholder sync"],
  experience: [
    {
      company: "Northwind Labs",
      title: "Senior Product Engineer",
      location: "Remote",
      start: "2022",
      end: "Present",
      bullets: [
        "Led checkout redesign that cut drop-off by 18% across mobile and desktop.",
        "Partnered with design and data to ship weekly experiments with clear success metrics.",
        "Mentored 3 engineers and improved PR review turnaround from 3 days to under 24 hours.",
      ],
    },
    {
      company: "Brightline Co.",
      title: "Software Engineer",
      location: "Austin, TX",
      start: "2019",
      end: "2022",
      bullets: [
        "Built customer dashboard used by 12k weekly active users.",
        "Reduced API latency p95 from 900ms to 320ms through caching and query tuning.",
      ],
    },
  ],
  education: [
    {
      school: "State University",
      degree: "B.S. Computer Science",
      year: "2019",
      details: "Dean’s list · Capstone: recommendation systems",
    },
  ],
  projects: [
    {
      name: "Launchpad Analytics",
      description: "Lightweight analytics toolkit for early-stage product teams.",
      bullets: ["Open-sourced React widgets with 1.2k GitHub stars."],
    },
  ],
  certifications: ["AWS Cloud Practitioner"],
  languages: ["English", "Spanish"],
  awards: [],
  interests: [],
};
