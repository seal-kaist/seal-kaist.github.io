import { LinkArrow } from "@/components/link-arrow";
import { publications } from "@/lib/site-data";
import { RevealSection } from "@/components/reveal-section";

const years = [...new Set(publications.map((publication) => publication.year))];

export function PublicationIndex() {
  return (
    <section className="publications-page shell">
      {years.map((year) => (
        <RevealSection className="year-group" key={year}>
          <h2>{year}</h2>
          <div className="publication-list">
            {publications
              .filter((publication) => publication.year === year)
              .map((publication) => (
                <article className="publication-row" key={publication.title}>
                  <div className="publication-main">
                    <h3>{publication.title}</h3>
                    <p>{publication.authors}</p>
                  </div>
                  <div className="publication-meta">
                    <span>{publication.venue}</span>
                    <div>
                      <a
                        href={publication.paper}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Paper <LinkArrow />
                      </a>
                      {publication.project ? (
                        <a
                          href={publication.project}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Project <LinkArrow />
                        </a>
                      ) : null}
                      {publication.code ? (
                        <a
                          href={publication.code}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Code <LinkArrow />
                        </a>
                      ) : null}
                      {publication.more ? (
                        <a
                          href={publication.more}
                          target="_blank"
                          rel="noreferrer"
                        >
                          More <LinkArrow />
                        </a>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
          </div>
        </RevealSection>
      ))}
      <p className="publication-note">* indicates equal contribution.</p>
    </section>
  );
}
