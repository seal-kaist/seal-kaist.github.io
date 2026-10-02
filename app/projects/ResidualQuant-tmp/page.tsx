import type { Metadata } from "next";
import { LinkArrow } from "@/components/link-arrow";
import { RevealSection } from "@/components/reveal-section";
import { SiteFooter } from "@/components/site-chrome";
import { sitePath } from "@/lib/site-path";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "ResidualQuant",
  description: "ResidualQuant project page from SEAL at KAIST.",
};

export default function ResidualQuantPage() {
  return (
    <main className="project-template-page">
      <nav className="project-template-nav shell" aria-label="Project navigation">
        <a href={sitePath("/projects")}>
          All projects
          <LinkArrow />
        </a>
      </nav>

      <section className="project-template-hero project-placeholder-hero shell">
        <h1>ResidualQuant</h1>
        <p className="project-template-tagline">
          Project details will be available soon.
        </p>
      </section>

      <figure className="project-template-figure shell">
        <img
          src={sitePath("/project-template-figure.png")}
          alt="Abstract visualization of information flowing through an AI system"
        />
      </figure>

      <RevealSection className="project-template-section shell">
        <div className="project-template-section-heading">
          <h2>Coming soon</h2>
        </div>
        <div className="project-template-prose">
          <p>
            We are preparing the paper, code, results, and an interactive
            explanation of ResidualQuant.
          </p>
        </div>
      </RevealSection>

      <SiteFooter />
    </main>
  );
}
