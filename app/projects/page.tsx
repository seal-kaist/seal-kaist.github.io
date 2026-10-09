import type { Metadata } from "next";
import { LinkArrow } from "@/components/link-arrow";
import { SiteFooter } from "@/components/site-chrome";
import { sitePath } from "@/lib/site-path";
import { collaborations, projects } from "./project-catalog";

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
        <a className="projects-index-kicker" href={sitePath("/")}>
          SEAL · KAIST AI
        </a>
        <h1>Projects</h1>
        <div className="projects-index-intro">
          <p>A closer look at the ideas and systems we build.</p>
          <div className="projects-index-actions">
            <a href={sitePath("/")}>
              SEAL home
              <LinkArrow />
            </a>
            <a href="#collaborations">
              Collaborations
              <LinkArrow />
            </a>
          </div>
        </div>
      </section>

      <section className="projects-index-grid shell" aria-label="Projects">
        {projects.map((project) => (
          <a
            className="projects-index-card"
            href={sitePath(`/projects/${project.slug}`)}
            key={project.slug}
          >
            <div className="projects-index-card-visual">
              <img src={sitePath(project.image)} alt="" />
            </div>
            {project.published ? (
              <div className="projects-index-card-meta">
                <span>{project.published}</span>
              </div>
            ) : null}
            <div className="projects-index-card-title">
              <h2>{project.title}</h2>
              <LinkArrow />
            </div>
            <p>{project.description}</p>
          </a>
        ))}
      </section>

      <section
        className="projects-collaborations shell"
        id="collaborations"
        aria-labelledby="collaborations-title"
      >
        <header className="projects-collaborations-header">
          <h2 id="collaborations-title">Collaborations</h2>
          <p>Projects with research collaborators.</p>
        </header>
        <div className="projects-collaboration-list">
          {collaborations.map((collaboration) => (
            <a
              href={collaboration.href}
              key={collaboration.title}
              target="_blank"
              rel="noreferrer"
            >
              <span>{collaboration.year}</span>
              <div>
                <h3>{collaboration.title}</h3>
              </div>
              <LinkArrow />
            </a>
          ))}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
