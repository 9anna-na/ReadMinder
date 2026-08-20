import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ReadMinder | Never miss what matters most",
  description: "Answer a few questions, upload your data, and build a tailored reminder system in under two minutes.",
  openGraph: {
    title: "ReadMinder | Never miss what matters most",
    description: "Build a tailored reminder system in under two minutes.",
  },
  twitter: {
    title: "ReadMinder | Never miss what matters most",
    description: "Build a tailored reminder system in under two minutes.",
  },
};

export default function EnglishLayout({ children }: { children: React.ReactNode }) {
  return children;
}
