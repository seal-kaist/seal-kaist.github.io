import { sitePath } from "@/lib/site-path";
import { LinkArrow } from "@/components/link-arrow";

type PageIntroProps = {
  title: string;
  description: string;
};

type SiteHeaderProps = {
  brandAurora?: boolean;
};

export function LogoMark({ animated = false }: { animated?: boolean } = {}) {
  return (
    <span
      className={`ship-crop${animated ? " ship-crop-approach" : ""}`}
      aria-hidden="true"
    >
      {animated ? (
        <>
          <img
            className="ship-approach-gif"
            src={sitePath("/seal-logo-approach-white.gif")}
            alt=""
          />
          <img
            className="ship-approach-fallback"
            src={sitePath("/seal-logo.png")}
            alt=""
          />
        </>
      ) : (
        <img src={sitePath("/seal-logo.png")} alt="" />
      )}
    </span>
  );
}

export function SiteHeader({ brandAurora = false }: SiteHeaderProps = {}) {
  const links = [
    ["Home", "/"],
    ["People", "/people"],
    ["Publications", "/publications"],
    ["Projects", "/projects"],
    ["Join", "/join"],
  ];

  return (
    <header className="site-header">
      <a
        className={`brand${brandAurora ? " brand-aurora" : ""}`}
        href={sitePath("/")}
        aria-label="SEAL home"
      >
        <LogoMark animated={brandAurora} />
        <span className="brand-lockup" aria-hidden="true">
          <span className="brand-initial">S</span>
          <span className="brand-rest brand-rest-scalable">
            calable &amp;{" "}
          </span>
          <span className="brand-initial">E</span>
          <span className="brand-rest brand-rest-efficient">fficient </span>
          <span className="brand-initial">A</span>
          <span className="brand-rest brand-rest-ai">I </span>
          <span className="brand-initial">L</span>
          <span className="brand-rest brand-rest-lab">ab.</span>
        </span>
      </a>

      <nav className="desktop-nav" aria-label="Primary navigation">
        {links.map(([label, href]) => (
          <a href={sitePath(href)} key={href}>
            {label}
          </a>
        ))}
      </nav>

      <details className="mobile-nav">
        <summary aria-label="Open navigation">Menu</summary>
        <nav aria-label="Mobile navigation">
          {links.map(([label, href]) => (
            <a href={sitePath(href)} key={href}>
              {label} <LinkArrow />
            </a>
          ))}
        </nav>
      </details>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer shell">
      <a
        className="footer-brand"
        href={sitePath("/")}
        aria-label="SEAL home"
      >
        <LogoMark />
        <div>
          <strong>SEAL</strong>
          <p>Scalable &amp; Efficient AI Lab</p>
        </div>
      </a>
      <div className="footer-meta">
        <p>Kim Jaechul Graduate School of AI, KAIST</p>
        <p>108 Taebong-ro, Seocho-gu, Seoul 06764, Republic of Korea</p>
        <p>© 2026 SEAL, KAIST</p>
      </div>
    </footer>
  );
}

export function PageIntro({ title, description }: PageIntroProps) {
  return (
    <section className="page-intro shell">
      <h1>{title}</h1>
      <p>{description}</p>
    </section>
  );
}
