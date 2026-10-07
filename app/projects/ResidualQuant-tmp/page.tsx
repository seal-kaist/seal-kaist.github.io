import type { Metadata } from "next";
import { LinkArrow } from "@/components/link-arrow";
import { ResidualQuantDemo } from "@/components/residualquant-demo";
import { RevealSection } from "@/components/reveal-section";
import { SiteFooter } from "@/components/site-chrome";
import { sitePath } from "@/lib/site-path";

export const dynamic = "force-static";

const title = "ResidualQuant";
const description =
  "KV Cache Quantization for Looped Transformers with 2-Bit Residuals";

export const metadata: Metadata = {
  title: "ResidualQuant",
  description,
  openGraph: {
    title,
    description,
    images: [
      {
        url: sitePath("/projects/residualquant/teaser.png"),
        width: 1481,
        height: 423,
        alt: "ResidualQuant accuracy, KV storage, and throughput results",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [sitePath("/projects/residualquant/teaser.png")],
  },
};

const authors = [
  { name: "Heejun Kim", marker: "1", href: "https://heejunkim00.github.io/" },
  { name: "Junyoung Lee", marker: "2", href: "https://ahavaujun.github.io/" },
  { name: "SangLyul Cho", marker: "3", href: "https://billcho.net/" },
  { name: "Dongsu Han", marker: "1", href: "https://ina.kaist.ac.kr/team/dongsuh" },
  { name: "Insu Han", marker: "1", href: "https://insuhan.github.io/" },
  { name: "Sehoon Kim", marker: "1,†", href: "https://sehoonkim.org/" },
];

export default function ResidualQuantPage() {
  return (
    <main className="project-template-page residualquant-page">
      <nav className="project-template-nav shell" aria-label="Project navigation">
        <a href={sitePath("/projects")}>
          All projects
          <LinkArrow />
        </a>
      </nav>

      <section className="project-template-hero residualquant-hero shell">
        <h1>{title}</h1>
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

      <figure className="residualquant-figure residualquant-teaser shell">
        <img
          src={sitePath("/projects/residualquant/teaser.png")}
          alt="ResidualQuant progressively recovers accuracy while reducing KV storage and increasing peak throughput"
        />
        <figcaption>
          ResidualQuant recovers BF16-level accuracy with 80.7% lower logical
          KV storage and reaches 3.27× peak decode throughput at 8k context.
        </figcaption>
      </figure>

      <p className="residualquant-summary shell">
        Looped Transformers share weights across depth, but not their KV
        caches. ResidualQuant compresses the loop-specific information instead
        of repeatedly storing nearly redundant full-precision states.
      </p>

      <RevealSection className="residualquant-section shell" id="abstract">
        <h2>ResidualQuant</h2>
        <div className="residualquant-copy">
          <p>
            Looped Transformers repeatedly apply shared modules to extend
            computational depth without increasing parameter count. Each loop,
            however, produces a distinct KV cache, so memory still grows with
            recurrent depth, context length, and batch size. This limits the
            larger batches and higher throughput that weight sharing should
            enable.
          </p>
          <p>
            ResidualQuant exploits the strong similarity between KV states
            across loops. It stores the final loop as a shared INT4 anchor,
            predicts earlier loops with least-squares scaling, and encodes only
            the remaining residuals in INT2. Shared rotations and loop-wise
            precision allocation preserve loop-specific information without a
            separate BF16 region for past KV states.
          </p>
        </div>
      </RevealSection>

      <RevealSection className="residualquant-section shell">
        <h2>Inter-loop redundancy</h2>
        <div className="residualquant-copy">
          <p>
            Repeated application of the same projection produces closely
            related KV patterns across loops. After least-squares prediction,
            the residual has fewer large-magnitude outliers and is substantially
            more robust to aggressive low-bit quantization.
          </p>
        </div>
        <figure className="residualquant-figure residualquant-evidence">
          <img
            src={sitePath("/projects/residualquant/residuals.png")}
            alt="Key magnitudes from two loops and their smaller prediction residual"
          />
          <figcaption>
            Post-RoPE key magnitudes for two loops of Ouro-1.4B and the
            least-squares prediction residual, shown on the same scale.
          </figcaption>
        </figure>
      </RevealSection>

      <RevealSection className="residualquant-section shell">
        <h2>KV reconstruction</h2>
        <ResidualQuantDemo />
      </RevealSection>

      <RevealSection className="residualquant-section shell" id="method">
        <h2>Method</h2>
        <div className="residualquant-copy">
          <p>
            ResidualQuant stores the final loop&apos;s KV state once as a shared
            INT4 anchor. For each earlier loop, token-wise least-squares scaling
            predicts its KV state from this anchor, and only the remaining
            loop-specific residual is quantized in INT2.
          </p>
          <p>
            Fixed per-head rotations redistribute residual outliers before
            quantization and reconstruction. Loop-wise mixed precision then
            allocates additional bits only where they contribute most to model
            accuracy.
          </p>
        </div>
      </RevealSection>

      <RevealSection className="residualquant-section shell">
        <h2>Results</h2>
        <div className="residualquant-copy">
          <p>
            On Ouro-1.4B, ResidualQuant reduces logical KV storage by 80.7%
            relative to BF16 while retaining 77.6% accuracy on MATH500. At 8k
            context, it reaches 3.27× peak decode throughput and supports a 4×
            larger tested batch; at 16k context, peak throughput improves by
            4.15×.
          </p>
        </div>
      </RevealSection>

      <RevealSection className="residualquant-section shell">
        <h2>Accuracy vs. KV storage</h2>
        <div className="residualquant-copy">
          <p>
            Across Ouro-1.4B and Huginn-3.5B on GSM8K, MATH500,
            HumanEval, and MBPP, residual quantization consistently improves
            the low-bit accuracy–memory frontier over direct quantization and
            rotation-only baselines.
          </p>
        </div>
        <figure className="residualquant-figure residualquant-results-figure">
          <img
            src={sitePath("/projects/residualquant/tradeoff.png")}
            alt="Accuracy versus effective KV bitwidth across two models and four benchmarks"
          />
        </figure>
      </RevealSection>

      <RevealSection className="residualquant-section shell">
        <h2>Decode throughput</h2>
        <div className="residualquant-copy">
          <p>
            Reducing KV memory traffic accelerates fixed-batch decoding, while
            the smaller cache footprint also admits larger batches. On an RTX
            5090, the combined effect reaches up to 4.15× peak throughput at
            16k context.
          </p>
        </div>
        <figure className="residualquant-figure residualquant-results-figure">
          <img
            src={sitePath("/projects/residualquant/throughput.png")}
            alt="ResidualQuant and BF16 decode throughput over batch size at four context lengths"
          />
        </figure>
      </RevealSection>

      <RevealSection className="project-template-citation shell" id="citation">
        <div className="project-template-wide-heading">
          <h2>Citation</h2>
        </div>
        <pre>
          <code>{`@article{kim2026residualquant,
  title  = {ResidualQuant: KV Cache Quantization for Looped Transformers with 2-Bit Residuals},
  author = {Kim, Heejun and Lee, Junyoung and Cho, SangLyul and Han, Dongsu and Han, Insu and Kim, Sehoon},
  year   = {2026},
  note   = {Preprint},
  url    = {https://seal-kaist.github.io/projects/ResidualQuant-tmp}
}`}</code>
        </pre>
      </RevealSection>

      <SiteFooter />
    </main>
  );
}
