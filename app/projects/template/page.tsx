import type { Metadata } from "next";
import { LinkArrow } from "@/components/link-arrow";
import { RevealSection } from "@/components/reveal-section";
import { SiteFooter } from "@/components/site-chrome";
import { sitePath } from "@/lib/site-path";
import { projectData } from "./project-data";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Project page template",
  description:
    "A reusable academic project page template from the Scalable & Efficient AI Lab at KAIST.",
};

export default function ProjectTemplatePage() {
  return (
    <main className="project-template-page">
      <nav className="project-template-nav shell" aria-label="Project navigation">
        <a href={sitePath("/projects")}>
          All projects
          <LinkArrow />
        </a>
      </nav>

      <section className="project-template-hero shell">
        <p className="project-template-kicker">
          {projectData.venue} · {projectData.year}
        </p>
        <h1>{projectData.title}</h1>
        <p className="project-template-tagline">{projectData.tagline}</p>

        <div className="project-template-authors" aria-label="Authors">
          {projectData.authors.map((author) => (
            <span key={author.name}>
              {author.name}
              <sup>{author.marker}</sup>
            </span>
          ))}
        </div>
        <div className="project-template-affiliations">
          {projectData.affiliations.map((affiliation, index) => (
            <p key={affiliation}>
              <sup>{index + 1}</sup> {affiliation}
            </p>
          ))}
          <p>{projectData.authorNote}</p>
        </div>

        <div className="project-template-links" aria-label="Project resources">
          {projectData.links.map((link) => (
            <a href={link.href} key={link.label}>
              {link.label}
              <LinkArrow />
            </a>
          ))}
        </div>
      </section>

      <section className="project-template-visual shell" id="overview">
        <div className="project-template-visual-grid">
          <div className="project-template-visual-node">
            <span>Input</span>
            <strong>Real-world workload</strong>
            <p>Describe the model, data, or system entering the pipeline.</p>
          </div>
          <div className="project-template-flow" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="project-template-visual-node project-template-visual-node-main">
            <span>Core method</span>
            <strong>Your key technical idea</strong>
            <p>Show the mechanism that differentiates this work.</p>
          </div>
          <div className="project-template-flow" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="project-template-visual-node">
            <span>Outcome</span>
            <strong>Better quality and efficiency</strong>
            <p>State the concrete improvement delivered by the method.</p>
          </div>
        </div>
      </section>

      <p className="project-template-highlight shell">{projectData.highlight}</p>

      <RevealSection className="project-template-section shell" id="abstract">
        <div className="project-template-section-heading">
          <p>Overview</p>
          <h2>Abstract</h2>
        </div>
        <div className="project-template-prose">
          {projectData.abstract.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </RevealSection>

      <RevealSection className="project-template-method shell" id="method">
        <div className="project-template-wide-heading">
          <p>Method</p>
          <h2>How the project works</h2>
        </div>
        <div className="project-template-method-grid">
          {projectData.method.map((step) => (
            <article key={step.label}>
              <span>{step.label}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </RevealSection>

      <RevealSection className="project-template-results shell">
        <div className="project-template-wide-heading">
          <p>Results</p>
          <h2>Put the headline numbers first</h2>
        </div>
        <div className="project-template-results-grid">
          {projectData.results.map((result) => (
            <article key={result.value}>
              <strong>{result.value}</strong>
              <p>{result.label}</p>
            </article>
          ))}
        </div>
      </RevealSection>

      <RevealSection className="project-template-section shell">
        <div className="project-template-section-heading">
          <p>Details</p>
          <h2>Tell the technical story</h2>
        </div>
        <div className="project-template-prose">
          {projectData.explanation.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </RevealSection>

      <RevealSection className="project-template-citation shell" id="citation">
        <div className="project-template-wide-heading">
          <p>Reference</p>
          <h2>Citation</h2>
        </div>
        <pre>
          <code>{projectData.citation}</code>
        </pre>
      </RevealSection>

      <SiteFooter />
    </main>
  );
}
