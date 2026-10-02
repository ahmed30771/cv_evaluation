import type { Metadata } from "next";
import "@/app/www/site.css";

export const metadata: Metadata = {
  title: "Offerquay — Get job-ready",
  description:
    "Offerquay helps you prepare for your next role — resume studio now, interview prep and more coming soon.",
};

export default function WwwLayout({ children }: { children: React.ReactNode }) {
  return <div className="bx-site">{children}</div>;
}
