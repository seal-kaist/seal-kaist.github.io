import { sitePath } from "@/lib/site-path";
import { LinkArrow } from "@/components/link-arrow";

type PageIntroProps = {
  title: string;
  description: string;
};

export function LogoMark() {
  return (
    <span className="ship-crop" aria-hidden="true">
      <img src={sitePath("/seal-logo.png")} alt="" />
    </span>
  );
}

export function SiteHeader() {
  const links = [
    ["Home", "/"],
    ["People", "/people"],
    ["Publications", "/publications"],
    ["Join", "/join"],
  ];

  return (
    <header className="site-header">
      <a className="brand" href={sitePath("/")} aria-label="SEAL home">
        <LogoMark />
        <span>SEAL</span>
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
      <div className="footer-brand">
        <LogoMark />
        <div>
          <strong>SEAL</strong>
          <p>Scalable &amp; Efficient AI Lab</p>
        </div>
      </div>
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
