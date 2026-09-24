import { LinkArrow } from "@/components/link-arrow";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { ResearchGlyph } from "@/components/research-glyph";
import { RevealSection } from "@/components/reveal-section";
import { news, researchAreas } from "@/lib/site-data";
import { sitePath } from "@/lib/site-path";

export const dynamic = "force-static";

export default function Home() {
  return (
    <main className="home-page">
      <SiteHeader />

      <section className="hero academic-hero shell">
        <h1>
          Scalable &amp;
          <br />
          Efficient AI Lab<span className="cursor-mark">.</span>
        </h1>
        <p className="hero-affiliation">KAIST AI</p>
        <p className="hero-copy">
          We develop algorithms and systems that make advanced AI efficient,
          scalable, and reliable. Our mission is to make foundation models and
          intelligent agents practical across a wider range of computing
          environments.
        </p>
        <div className="academic-links">
          <a href={sitePath("/publications")}>
            Publications <LinkArrow />
          </a>
          <a href={sitePath("/join")}>
            Prospective students <LinkArrow />
          </a>
        </div>
      </section>

      <RevealSection className="academic-intro shell">
        <p className="eyebrow">About SEAL</p>
        <div className="academic-intro-copy">
          <h2>We study how to make advanced AI systems efficient by design.</h2>
          <p>
            Modern AI capabilities increasingly depend on large models and
            significant computational resources. Our research asks how new
            algorithms, model architectures, and systems can reduce these costs
            while preserving—or improving—model capability.
          </p>
          <p>
            We work across the AI stack, spanning model architectures, training
            and inference systems, compression and deployment, and reasoning
            and agentic systems.
            Our goal is to develop principled methods that make foundation
            models practical at larger scales and in more practical settings.
          </p>
        </div>
      </RevealSection>

      <RevealSection className="research-overview shell" id="research">
        <div className="section-heading compact-heading">
          <p className="eyebrow">Research</p>
          <div>
            <h2>Current research directions</h2>
            <a className="text-link" href={sitePath("/publications")}>
              View all publications <LinkArrow />
            </a>
          </div>
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
      </RevealSection>

      {/* News section hidden for now. Remove this JSX comment to restore it.
      <section className="news shell">
        <div className="section-heading compact-heading">
          <p className="eyebrow">Recent news</p>
          <h2>News from the lab</h2>
        </div>
        <div className="news-list">
          {news.map((item) => (
            <article className="news-row" key={`${item.date}-${item.text}`}>
              <time>{item.date}</time>
              <p>{item.text}</p>
              {item.href ? (
                <a href={item.href} aria-label="Read more">
                  <LinkArrow />
                </a>
              ) : (
                <span aria-hidden="true">—</span>
              )}
            </article>
          ))}
        </div>
      </section>
      */}

      <RevealSection className="prospective-note shell">
        <p className="eyebrow">Prospective students</p>
        <div>
          <h2>Interested in joining SEAL?</h2>
          <p>
            We welcome applications from graduate students and research interns
            interested in efficient AI, large language models, and AI systems.
          </p>
          <a className="text-link" href={sitePath("/join")}>
            Application information <LinkArrow />
          </a>
        </div>
      </RevealSection>

      <SiteFooter />
    </main>
  );
}
