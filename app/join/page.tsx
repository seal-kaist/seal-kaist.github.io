import type { Metadata } from "next";
import { LinkArrow } from "@/components/link-arrow";
import { ResearchGlyph } from "@/components/research-glyph";
import { PageIntro, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { researchAreas } from "@/lib/site-data";
import { sitePath } from "@/lib/site-path";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Join",
  description: "Apply to join the Scalable & Efficient AI Lab at KAIST.",
  openGraph: {
    title: "Join — SEAL at KAIST",
    description: "Apply to join the Scalable & Efficient AI Lab at KAIST.",
    images: [sitePath("/og.png")],
  },
  twitter: {
    card: "summary_large_image",
    title: "Join — SEAL at KAIST",
    description: "Apply to join the Scalable & Efficient AI Lab at KAIST.",
    images: [sitePath("/og.png")],
  },
};

export default function JoinPage() {
  return (
    <main>
      <SiteHeader />
      <PageIntro
        title="Prospective students"
        description="Information for graduate students and research interns interested in joining SEAL."
      />

      <section className="join-layout shell">
        <div className="join-primary">
          <p className="eyebrow">How to apply</p>
          <h2>Prospective student application</h2>
          <p>
            Please complete the prospective student application form. It asks
            for your academic background, CV, transcripts, research interests,
            and a brief introduction.
          </p>
          <a
            className="button button-primary"
            href="https://forms.gle/VQB3wnUhZqG9aYRL7"
            target="_blank"
            rel="noreferrer"
          >
            Open application form <LinkArrow />
          </a>
          <p className="form-note">
            Due to the high volume of applications, we may not be able to
            respond to every applicant immediately.
          </p>
        </div>

        <aside className="join-checklist">
          <p className="eyebrow">Before you apply</p>
          <ol>
            <li>
              <span>01</span>
              <p>Explore our research directions and recent publications.</p>
            </li>
            <li>
              <span>02</span>
              <p>
                Share your CV, transcripts, and a short introduction so we can
                get to know you.
              </p>
            </li>
            <li>
              <span>03</span>
              <p>
                Tell us what research questions excite you and why you would
                like to explore them.
              </p>
            </li>
          </ol>
        </aside>
      </section>

      <section className="alignment shell">
        <div className="alignment-heading">
          <p className="eyebrow">Research areas</p>
          <a className="text-link" href={sitePath("/publications")}>
            See publications <LinkArrow />
          </a>
        </div>
        <div className="alignment-grid">
          {researchAreas.map((area) => (
            <article key={area.index}>
              <h3>
                <ResearchGlyph kind={area.icon} />
                {area.title}
              </h3>
              <p>{area.description}</p>
            </article>
          ))}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
