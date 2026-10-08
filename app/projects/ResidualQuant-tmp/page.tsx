import { ResidualQuantTerminalVideo } from '@/components/residualquant-terminal-video';
import { ResidualQuantThroughputFigure } from '@/components/residualquant-throughput-figure';
import type { Metadata } from 'next';
import { FaGithub } from 'react-icons/fa';
import { LinkArrow } from '@/components/link-arrow';
import { ResidualQuantKVHeatmap } from '@/components/residualquant-kv-heatmap';
import { ResidualQuantProgressFigure } from '@/components/residualquant-progress-figure';
import { ResidualQuantResultsTable } from '@/components/residualquant-results-table';
import { RevealSection } from '@/components/reveal-section';
import { SiteFooter } from '@/components/site-chrome';
import { sitePath } from '@/lib/site-path';

export const dynamic = 'force-static';

const title = 'ResidualQuant';
const description =
  'KV Cache Quantization for Looped Transformers with 2-Bit Residuals';

export const metadata: Metadata = {
  title: 'ResidualQuant',
  description,
  openGraph: {
    title,
    description,
    images: [
      {
        url: sitePath('/projects/residualquant/teaser-published.png'),
        width: 1419,
        height: 393,
        alt: 'ResidualQuant accuracy, KV storage, and throughput results',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: [sitePath('/projects/residualquant/teaser-published.png')],
  },
};

const authors = [
  { name: 'Heejun Kim', marker: '1', href: 'https://heejunkim00.github.io/' },
  { name: 'Junyoung Lee', marker: '2', href: 'https://ahavaujun.github.io/' },
  { name: 'SangLyul Cho', marker: '3', href: 'https://billcho.net/' },
  {
    name: 'Dongsu Han',
    marker: '1',
    href: 'https://ina.kaist.ac.kr/team/dongsuh',
  },
  { name: 'Insu Han', marker: '1', href: 'https://insuhan.github.io/' },
  { name: 'Sehoon Kim', marker: '1,†', href: 'https://sehoonkim.org/' },
];

export default function ResidualQuantPage() {
  return (
    <main className="project-template-page residualquant-page">
      <nav
        className="project-template-nav shell"
        aria-label="Project navigation"
      >
        <a href={sitePath('/projects')}>
          All projects
          <LinkArrow />
        </a>
      </nav>

      <section className="project-template-hero residualquant-hero shell">
        <h1>{title}</h1>
        <p className="project-template-tagline residualquant-placeholder-subtitle">
          KV Cache Quantization for Looped Transformers with{' '}
          <span>2-Bit Residuals</span>
        </p>

        <div
          className="project-template-authors residualquant-authors"
          aria-label="Authors"
        >
          {authors.map((author) => (
            <a
              href={author.href}
              key={author.name}
              target="_blank"
              rel="noreferrer"
            >
              {author.name}
              <sup>{author.marker}</sup>
            </a>
          ))}
        </div>
        <div className="project-template-affiliations">
          <p>
            <sup>1</sup> KAIST · <sup>2</sup> Yonsei University · <sup>3</sup>{' '}
            Seoul National University
          </p>
          <p>† Corresponding author</p>
        </div>
        <div className="project-template-links">
          <a
            href="https://arxiv.org/abs/2610.10381"
            target="_blank"
            rel="noreferrer"
          >
            <span aria-hidden="true">📄</span> Paper <LinkArrow />
          </a>
          <a href="#concept"><span aria-hidden="true">💡</span> Explore the idea ↓</a>
          <span className="residualquant-code-pending">
            <FaGithub aria-hidden="true" /> Code · Coming soon
          </span>
        </div>
      </section>

      <figure className="residualquant-figure residualquant-teaser shell">
        <ResidualQuantProgressFigure />
        <figcaption>
          ResidualQuant recovers BF16-level accuracy with 80.7% lower logical KV
          storage and reaches 3.27× peak decode throughput at 8k context.
        </figcaption>
      </figure>

      <p className="residualquant-summary shell">
        Looped Transformers share weights across depth, but not their KV caches.
        ResidualQuant compresses the loop-specific information instead of
        repeatedly storing nearly redundant full-precision states.
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
            Repeated application of the same projection produces closely related
            KV patterns across loops. After least-squares prediction, the
            residual has fewer large-magnitude outliers and is substantially
            more robust to aggressive low-bit quantization.
          </p>
        </div>
        <figure className="residualquant-figure residualquant-evidence">
          <img
            src={sitePath('/projects/residualquant/residuals.png')}
            alt="Key magnitudes from two loops and their smaller prediction residual"
          />
          <figcaption>
            Post-RoPE key magnitudes for two loops of Ouro-1.4B and the
            least-squares prediction residual, shown on the same scale.
          </figcaption>
        </figure>
      </RevealSection>

      <RevealSection className="residualquant-section shell" id="concept">
        <h2>Share the pattern. Store the difference.</h2>
        <ResidualQuantKVHeatmap />
      </RevealSection>

      <RevealSection className="residualquant-section shell">
        <h2>Decode throughput</h2>
        <div className="residualquant-copy">
          <p>
            Reducing KV memory traffic accelerates fixed-batch decoding, while
            the smaller cache footprint also admits larger batches. On an RTX
            5090, the combined effect reaches up to 4.15× peak throughput at 16k
            context.
          </p>
        </div>
        <figure className="residualquant-figure rq-terminal-video">
          <ResidualQuantTerminalVideo />
          <figcaption>
            Actual terminal screen recordings: BF16 batch 2 versus ResidualQuant batch 4.
            Each request receives 16,384 input tokens and generates 512 output tokens.
            Ouro-1.4B · RTX 5090 · CUDA Graph decode · util 0.90 · INT2 G16 / INT4 G32.
            Recorded separately at 1× speed, with prefill completed before decode timing.
            Aggregate throughput: BF16 35.07 tokens/s · ResidualQuant 88.34 tokens/s (2.52×).
            This compares different batch sizes; the first two prompts are identical across methods.
            {' '}<a href="/projects/residualquant/terminal-live-16k-b2-b4.json">Measurement details</a>
          </figcaption>
        </figure>
        <figure className="residualquant-figure residualquant-results-figure">
          <ResidualQuantThroughputFigure />
        </figure>
      </RevealSection>

      <RevealSection className="residualquant-section shell" id="results">
        <h2>The accuracy–memory tradeoff</h2>
        <div className="residualquant-copy">
          <p>
            Across Ouro-1.4B and Huginn-3.5B, ResidualQuant preserves accuracy
            across math and code benchmarks with low-bit KV caches. On Ouro-1.4B,
            it reaches 76.0% MATH500 accuracy with 80.7% less logical KV storage,
            compared with 75.0% for BF16 (mixed INT2/4, group size g = 32).
          </p>
        </div>
        <ResidualQuantResultsTable />
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
  eprint = {2610.10381},
  archivePrefix = {arXiv},
  primaryClass = {cs.LG},
  url    = {https://arxiv.org/abs/2610.10381}
}`}</code>
        </pre>
      </RevealSection>

      <SiteFooter />
    </main>
  );
}
