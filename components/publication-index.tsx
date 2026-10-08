"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { LinkArrow } from "@/components/link-arrow";
import { RevealSection } from "@/components/reveal-section";
import { Input } from "@/components/ui/input";
import { publications } from "@/lib/site-data";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function HighlightedText({ text, terms }: { text: string; terms: string[] }) {
  if (terms.length === 0) return text;

  const termSet = new Set(terms);
  const matcher = new RegExp(
    `(${terms.map(escapeRegExp).sort((a, b) => b.length - a.length).join("|")})`,
    "gi",
  );

  return text.split(matcher).map((part, index) =>
    termSet.has(part.toLocaleLowerCase()) ? (
      <mark className="publication-search-highlight" key={`${part}-${index}`}>
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

export function PublicationIndex() {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const searchTerms = useMemo(
    () => (normalizedQuery ? normalizedQuery.split(/\s+/) : []),
    [normalizedQuery],
  );
  const filteredPublications = useMemo(() => {
    if (!normalizedQuery) return publications;

    return publications.filter((publication) => {
      const searchableText = [
        publication.title,
        publication.authors,
        publication.venue,
        publication.year,
      ]
        .join(" ")
        .toLocaleLowerCase();

      return searchTerms.every((term) => searchableText.includes(term));
    });
  }, [normalizedQuery, searchTerms]);
  const years = [
    ...new Set(filteredPublications.map((publication) => publication.year)),
  ];

  return (
    <section className="publications-page shell">
      <div className="publication-search-block">
        <div className="publication-search">
          <Search aria-hidden="true" />
          <Input
            aria-label="Search publications"
            className="publication-search-input"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search publications"
            type="search"
            value={query}
          />
          {query ? (
            <button
              aria-label="Clear publication search"
              className="publication-search-clear"
              onClick={() => setQuery("")}
              type="button"
            >
              <X aria-hidden="true" />
            </button>
          ) : null}
        </div>

        {normalizedQuery ? (
          <p className="publication-search-summary" aria-live="polite">
            {filteredPublications.length}{" "}
            {filteredPublications.length === 1 ? "publication" : "publications"}
          </p>
        ) : null}
      </div>

      {years.map((year) => (
        <RevealSection className="year-group" key={year}>
          <h2>
            <HighlightedText text={String(year)} terms={searchTerms} />
          </h2>
          <div className="publication-list">
            {filteredPublications
              .filter((publication) => publication.year === year)
              .map((publication) => (
                <article className="publication-row" key={publication.title}>
                  <div className="publication-main">
                    <h3>
                      <HighlightedText
                        text={publication.title}
                        terms={searchTerms}
                      />
                    </h3>
                    <p>
                      <HighlightedText
                        text={publication.authors}
                        terms={searchTerms}
                      />
                    </p>
                  </div>
                  <div className="publication-meta">
                    <span>
                      <HighlightedText
                        text={publication.venue}
                        terms={searchTerms}
                      />
                    </span>
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
      {filteredPublications.length === 0 ? (
        <div className="publication-search-empty">
          <p>No publications match “{query.trim()}”.</p>
          <button onClick={() => setQuery("")} type="button">
            Clear search
          </button>
        </div>
      ) : null}
      <p className="publication-note">* indicates equal contribution.</p>
    </section>
  );
}
