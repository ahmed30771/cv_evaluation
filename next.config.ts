import type { NextConfig } from "next";

/** pdfkit loads Helvetica etc. from disk next to its package — NFT must keep those files. */
const pdfkitFontAssets = [
  "./node_modules/pdfkit/js/data/**/*",
  "./node_modules/pdfkit/js/standard-fonts/**/*",
];

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@react-pdf/renderer",
    "@react-pdf/font",
    "@react-pdf/pdfkit",
    "pdfkit",
    "fontkit",
  ],
  outputFileTracingIncludes: {
    // Route globs (picomatch) — PDF export needs pdfkit standard fonts on Vercel
    "/api/v1/evaluations/*/export": pdfkitFontAssets,
    "/api/v1/evaluations/[id]/export": pdfkitFontAssets,
  },
};

export default nextConfig;
