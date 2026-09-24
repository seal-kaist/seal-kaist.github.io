import { publications } from "@/lib/site-data";

const years = [...new Set(publications.map((publication) => publication.year))];

export function PublicationIndex() {
  return (
    <section className="publications-page shell">
      {years.map((year) => (
        <div className="year-group" key={year}>
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
                        Paper ↗
                      </a>
                      {publication.code ? (
                        <a
                          href={publication.code}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Code ↗
                        </a>
                      ) : null}
                      {publication.project ? (
                        <a
                          href={publication.project}
                          target="_blank"
                          rel="noreferrer"
                        >
                          More ↗
                        </a>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
          </div>
        </div>
      ))}
      <p className="publication-note">* indicates equal contribution.</p>
    </section>
  );
}
