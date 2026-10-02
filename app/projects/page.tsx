import type { Metadata } from "next";
import { LinkArrow } from "@/components/link-arrow";
import { SiteFooter } from "@/components/site-chrome";
import { sitePath } from "@/lib/site-path";
import { projects } from "./project-catalog";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Research projects from the Scalable & Efficient AI Lab at KAIST.",
};

export default function ProjectsPage() {
  return (
    <main className="projects-index-page">
      <section className="projects-index-hero shell">
        <p>SEAL · KAIST AI</p>
        <h1>Projects</h1>
        <div className="projects-index-intro">
          <p>A closer look at the ideas and systems we build.</p>
          <a href={sitePath("/")}>
            SEAL home
            <LinkArrow />
          </a>
        </div>
      </section>

      <section className="projects-index-grid shell" aria-label="Projects">
        {projects.map((project, index) => (
          <a
            className="projects-index-card"
            href={sitePath(`/projects/${project.slug}`)}
            key={project.slug}
          >
            <div className="projects-index-card-visual" aria-hidden="true">
              <span>SEAL / {String(index + 1).padStart(2, "0")}</span>
              <div>
                <i />
                <i />
                <i />
              </div>
              <strong>{project.year}</strong>
            </div>
            <div className="projects-index-card-meta">
              <span>{project.area}</span>
              <span>{project.year}</span>
            </div>
            <div className="projects-index-card-title">
              <h2>{project.title}</h2>
              <LinkArrow />
            </div>
            <p>{project.description}</p>
            <div className="projects-index-tags">
              {project.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </a>
        ))}
      </section>

      <SiteFooter />
    </main>
  );
}
