import { LinkArrow } from "@/components/link-arrow";
import { PageIntro, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { sitePath } from "@/lib/site-path";

export const dynamic = "force-static";

export default function ResearchPage() {
  const publicationsPath = sitePath("/publications");

  return (
    <main>
      <meta httpEquiv="refresh" content={`0; url=${publicationsPath}`} />
      <SiteHeader />
      <PageIntro
        title="Publications"
        description="Research has moved to our publications page."
      />
      <section className="publications-page shell">
        <a className="text-link" href={publicationsPath}>
          Continue to publications <LinkArrow />
        </a>
      </section>
      <SiteFooter />
    </main>
  );
}
