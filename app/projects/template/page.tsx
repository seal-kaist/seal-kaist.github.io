import type { Metadata } from "next";
import { FaFilePdf, FaGithub } from "react-icons/fa6";
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
              {link.label === "Paper" ? (
                <FaFilePdf aria-hidden="true" />
              ) : (
                <FaGithub aria-hidden="true" />
              )}
              {link.label}
            </a>
          ))}
        </div>
      </section>

      <figure className="project-template-figure shell">
        <img
          src={sitePath("/project-template-figure.png")}
          alt="Abstract visualization of information flowing through an AI system"
        />
      </figure>

      <RevealSection className="project-template-section shell" id="abstract">
        <div className="project-template-section-heading">
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
          <h2>Method</h2>
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
