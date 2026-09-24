import type { Metadata } from "next";
import { PublicationIndex } from "@/components/publication-index";
import { PageIntro, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { sitePath } from "@/lib/site-path";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Publications",
  description: "Publications from the Scalable & Efficient AI Lab at KAIST.",
  openGraph: {
    title: "Publications — SEAL at KAIST",
    description: "Publications from the Scalable & Efficient AI Lab at KAIST.",
    images: [sitePath("/og.png")],
  },
  twitter: {
    card: "summary_large_image",
    title: "Publications — SEAL at KAIST",
    description: "Publications from the Scalable & Efficient AI Lab at KAIST.",
    images: [sitePath("/og.png")],
  },
};

export default function PublicationsPage() {
  return (
    <main>
      <SiteHeader />
      <PageIntro
        title="Publications"
        description="Research on efficient inference, model compression, long-context systems, and intelligent agents."
      />

      <PublicationIndex />

      <SiteFooter />
    </main>
  );
}
