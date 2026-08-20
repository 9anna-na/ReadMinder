import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Remind | Never miss what matters most",
  description: "Answer a few questions, upload your data, and build a tailored reminder system in under two minutes.",
  openGraph: {
    title: "Remind | Never miss what matters most",
    description: "Build a tailored reminder system in under two minutes.",
  },
  twitter: {
    title: "Remind | Never miss what matters most",
    description: "Build a tailored reminder system in under two minutes.",
  },
};

export default function EnglishLayout({ children }: { children: React.ReactNode }) {
  return children;
}
