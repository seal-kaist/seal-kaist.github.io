import type { Metadata } from "next";
import { LinkArrow } from "@/components/link-arrow";
import { SiteFooter } from "@/components/site-chrome";
import { sitePath } from "@/lib/site-path";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "ResidualQuant",
  description: "ResidualQuant project page. More details will be available soon.",
};

const authors = [
  { name: "Heejun Kim", marker: "1", href: "https://heejunkim00.github.io/" },
  { name: "Junyoung Lee", marker: "2", href: "https://ahavaujun.github.io/" },
  { name: "SangLyul Cho", marker: "3", href: "https://billcho.net/" },
  { name: "Dongsu Han", marker: "1", href: "https://ina.kaist.ac.kr/team/dongsuh" },
  { name: "Insu Han", marker: "1", href: "https://insuhan.github.io/" },
  { name: "Sehoon Kim", marker: "1,†", href: "https://sehoonkim.org/" },
];

export default function ResidualQuantPlaceholderPage() {
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
        <p className="project-template-tagline residualquant-placeholder-subtitle">
          KV Cache Quantization for Looped Transformers with{" "}
          <span>2-Bit Residuals</span>
        </p>

        <div className="project-template-authors residualquant-authors" aria-label="Authors">
          {authors.map((author) => (
            <a href={author.href} key={author.name} target="_blank" rel="noreferrer">
              {author.name}
              <sup>{author.marker}</sup>
            </a>
          ))}
        </div>
        <div className="project-template-affiliations">
          <p>
            <sup>1</sup> KAIST · <sup>2</sup> Yonsei University · <sup>3</sup>{" "}
            Seoul National University
          </p>
          <p>† Corresponding author</p>
        </div>
      </section>

      <figure className="project-template-figure residualquant-placeholder-figure shell">
        <img
          src={sitePath("/project-template-figure.png")}
          alt="Abstract visualization placeholder for ResidualQuant"
        />
      </figure>

      <section className="residualquant-placeholder-message shell">
        <p>More details will be available soon.</p>
      </section>

      <SiteFooter />
    </main>
  );
}
