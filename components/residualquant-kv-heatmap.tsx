'use client';

import { useEffect, useRef, useState } from 'react';
import { sitePath } from '@/lib/site-path';
import { ResidualQuantMechanism } from '@/components/residualquant-mechanism';

type Matrix = number[][];
type Stats = { rms: number; maxAbs: number; peakToRms: number };
type LoopFrame = {
  anchor: Matrix;
  prediction: Matrix;
  residual: Matrix;
  codes: Matrix | null;
  transformed: Matrix;
  reconstructed: Matrix;
  error: Matrix;
  stats: {
    original: Stats;
    transformed: Stats;
    errorRmse: number;
    alphaMean: number | null;
  };
};
type Frame = {
  loops: LoopFrame[];
  bits: number[];
  groups: number[];
  effectiveBits: number[];
  storagePercent: number;
};
type Example = { bound: number; originals: Matrix[]; frames: Frame[] };
type Data = {
  provenance: {
    model: string;
    layer: number;
    head: number;
    tokenStart: number;
    tokenEnd: number;
    rows: number;
    channels: number;
    sample: number;
    split: string;
  };
  kinds: { k: Example; v: Example };
};
const STAGES = [
  {
    name: 'BF16',
    title: 'Four loops. A shared pattern.',
    description:
      'The same token positions and channels are shown across four recurrent loops. Each loop still stores a separate BF16 KV state.',
    formula: 'X₁, X₂, X₃, X₄ · four independent BF16 caches',
    label: 'Last-loop KV',
    detail: 'Compare the last loop with the selected earlier loop.',
  },
  {
    name: 'direct INT2',
    title: 'Quantize the entire state.',
    description:
      'Direct INT2 maps each group of 16 channels to four decoded levels. Compare the reconstructed pattern with the original to see what four levels lose.',
    formula: 'X̂ = Q₂(X)',
    label: 'Direct INT2 reconstruction',
    detail: 'Four levels per quantization group; group ranges differ.',
  },
  {
    name: '+Residual',
    title: 'Keep the residual from the anchor.',
    description:
      'Reconstruct the last-loop INT2 anchor, then subtract it from the earlier loop. Encode the remaining loop-specific residual instead of the full state.',
    formula: 'R = Q₂(X₄)     ·     residual = X − R',
    label: 'Residual before quantization',
    detail: 'Unscaled Last-loop reference (α = 1).',
  },
  {
    name: '+LS',
    title: "Match the anchor's magnitude.",
    description:
      'Least-square scaling predicts this loop from the reconstructed anchor. Its token-wise coefficient changes the residual before INT2 quantization.',
    formula: 'α = ⟨X, R⟩ / ‖R‖²     ·     residual = X − αR',
    label: 'LS residual before quantization',
    detail: 'LS is fitted per token and head, not per channel.',
  },
  {
    name: '+Rotation',
    title: 'Redistribute residual outliers.',
    description:
      'Apply the learned shared OptR-H rotation across all 128 channels, then quantize. Rotated columns are new coordinates; reconstruction returns to the original channel space.',
    formula: 'X̂ = αR + UᵀQ₂(U(X − αR))',
    label: 'Rotated LS residual',
    detail: 'Keys include fixed calibration centering before rotation.',
  },
  {
    name: '+Mixed Precision',
    title: 'Give the shared anchor more bits.',
    description:
      'Use an INT4 anchor and INT2 residuals. This example uses the learned rotation artifact for each precision schedule; compare the measured reconstruction error below.',
    formula: '[INT2, INT2, INT2, INT4]     ·     R = Q₄(X₄)',
    label: 'Rotated residual · INT4 anchor',
    detail: 'Precision-specific calibrated rotations; residuals remain INT2.',
  },
];
function color(value: number, bound: number) {
  const t = Math.min(1, Math.abs(value) / bound);
  const white = [247, 247, 242];
  const end = value < 0 ? [35, 93, 164] : [198, 100, 42];
  return end.map((v, i) => Math.round(white[i] + t * (v - white[i])));
}
function Heatmap({
  matrix,
  bound,
  label,
  tokenStart,
  compact = false,
  monochrome = false,
}: {
  matrix: Matrix;
  bound: number;
  label: string;
  tokenStart: number;
  compact?: boolean;
  monochrome?: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const previous = useRef<Matrix | null>(null);
  const [hover, setHover] = useState<{ row: number; col: number } | null>(null);
  useEffect(() => {
    const context = canvas.current?.getContext('2d');
    if (!context || !matrix.length) return;
    const rows = matrix.length,
      columns = matrix[0].length;
    const from = previous.current ?? matrix;
    previous.current = matrix;
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)')
      .matches
      ? 0
      : 650;
    let animation = 0;
    const start = performance.now();
    const draw = (now: number) => {
      const t = duration ? Math.min(1, (now - start) / duration) : 1;
      const eased = 1 - (1 - t) ** 3;
      for (let row = 0; row < rows; row++)
        for (let col = 0; col < columns; col++) {
          const value =
            (from[row]?.[col] ?? matrix[row][col]) * (1 - eased) +
            matrix[row][col] * eased;
          context.fillStyle = `rgb(${color(monochrome ? -Math.abs(value) : value, bound).join(',')})`;
          context.fillRect(col * 4, row * 6, 4, 6);
        }
      if (t < 1) animation = requestAnimationFrame(draw);
    };
    animation = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animation);
  }, [matrix, bound, monochrome]);
  return (
    <div className={`rq-matrix ${compact ? 'is-compact' : ''}`}>
      <canvas
        ref={canvas}
        width={matrix[0].length * 4}
        height={matrix.length * 6}
        role="img"
        aria-label={label}
        onMouseMove={
          compact
            ? undefined
            : (event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                setHover({
                  row: Math.min(
                    matrix.length - 1,
                    Math.floor(
                      ((event.clientY - rect.top) / rect.height) *
                        matrix.length,
                    ),
                  ),
                  col: Math.min(
                    matrix[0].length - 1,
                    Math.floor(
                      ((event.clientX - rect.left) / rect.width) *
                        matrix[0].length,
                    ),
                  ),
                });
              }
        }
        onMouseLeave={() => setHover(null)}
      />
      {!compact && (
        <>
          <div className="rq-matrix-axis">
            <span>Channel 1</span>
            <span>128</span>
          </div>
          <div className="rq-matrix-readout">
            {hover
              ? `Token ${tokenStart + hover.row} · Channel ${hover.col + 1} · ${matrix[hover.row][hover.col].toFixed(4)}`
              : `Tokens ${tokenStart}–${tokenStart + matrix.length - 1} × 128 channels`}
          </div>
        </>
      )}
    </div>
  );
}

function ConnectedKVFlow({ example, loop, kind, tokenStart, onLoop, onKind }: {
  example: Example; loop: number; kind: 'k' | 'v'; tokenStart: number;
  onLoop: (loop: number) => void; onKind: (kind: 'k' | 'v') => void;
}) {
  const [open, setOpen] = useState<number | null>(0);
  const refs = useRef<(HTMLDetailsElement | null)[]>([]);
  const frame = example.frames[5];
  const current = frame.loops[loop];
  let group = 0, energy = -1;
  for (let start = 0; start < 128; start += 16) {
    const score = example.originals[0].slice(0, 8).reduce((sum, row) => sum + row.slice(start, start + 16).reduce((s, v) => s + v * v, 0), 0);
    if (score > energy) { energy = score; group = start; }
  }
  const crop = (matrix: Matrix) => matrix.slice(0, 8).map(row => row.slice(group, group + 16));
  const recoveredResidual = current.reconstructed.map((row, r) => row.map((v, c) => v - current.prediction[r][c]));
  const card = (title: string, matrix: Matrix, note: string, role = '', bound = example.bound) => (
    <section className={`rq-chain-card ${role}`}><h5>{title}</h5><Heatmap matrix={crop(matrix)} bound={bound} tokenStart={tokenStart} label={title} compact monochrome /><p>{note}</p></section>
  );
  const next = (index: number) => { setOpen(index); window.setTimeout(() => refs.current[index]?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'nearest' }), 50); };
  const titles = ['Compare the original four loops', 'From shared anchor to Residual', 'Quantize and store', 'Reconstruct the KV states'];
  return <div className="rq-connected-flow">
    <div className="rq-chain-context"><strong>One continuous KV example</strong><span>Same layer, head, tokens and channels throughout</span></div>
    <div className="rq-heatmap-selectors"><div aria-label="Select KV tensor">{(['k', 'v'] as const).map(value => <button key={value} aria-pressed={kind === value} onClick={() => onKind(value)}>{value === 'k' ? 'Keys · K' : 'Values · V'}</button>)}</div><div aria-label="Select earlier loop">{[0, 1, 2].map(value => <button key={value} aria-pressed={loop === value} onClick={() => onLoop(value)}>Loop {value + 1}</button>)}</div></div>
    {titles.map((title, index) => <details key={title} className="rq-heatmap-extra rq-chain-step" open={open === index} ref={el => { refs.current[index] = el; }}>
      <summary onClick={event => { event.preventDefault(); setOpen(open === index ? null : index); }}><span className="rq-chain-summary-title">{title}</span><small>{['Choose the anchor', 'Extract the Residual', 'Save compact codes', 'Return to the original'][index]}</small></summary>
      <div className="rq-chain-content">
        {index === 0 && <>
          <p>The four loops exhibit similar KV patterns. Select the final loop as the shared anchor for predicting Loops 1–3.</p>
          <div className="rq-chain-grid four">{example.originals.map((matrix, i) => card(`Loop ${i + 1}`, matrix, i === 3 ? 'Selected shared anchor source' : 'Original BF16 KV', i === 3 ? 'anchor' : ''))}</div>
          <div className="rq-chain-transfer"><span>Loop 4</span><b>→</b><strong>Shared INT4 anchor</strong><span>Quantize once · reconstruct for prediction</span></div>
          <div className="rq-chain-grid two">{card('Loop 4 · original', example.originals[3], 'Source from the four loops above')}{card('Shared anchor · A', current.anchor, 'Decoded from the stored INT4 anchor', 'anchor')}</div>
        </>}
        {index === 1 && <>
          <div className="rq-chain-input"><strong>Shared anchor A</strong><span>Carried forward from step 1 · scale per token with LS</span></div>
          <div className="rq-chain-grid three">{card(`Loop ${loop + 1} · original X`, example.originals[loop], 'Original KV from step 1')}{card('Anchor prediction · αA', current.prediction, 'Same anchor × token-wise LS scale', 'anchor')}{card(`Loop ${loop + 1} · Residual E`, current.residual, 'Only the remaining loop-specific information', 'residual')}</div>
          <div className="rq-chain-equation">Original KV − scaled anchor = Residual</div>
          <p>Repeat for Loops 1–3. The anchor stays shared; each loop keeps its own LS scales and Residual.</p>
          <div className="rq-chain-grid three">{frame.loops.slice(0, 3).map((item, i) => card(`Residual · Loop ${i + 1}`, item.residual, 'Output passed to quantization', 'residual'))}</div>
        </>}
        {index === 2 && <>
          <div className="rq-chain-input residual"><strong>Residual E · Loop {loop + 1}</strong><span>The same Residual produced in step 2</span></div>
          <div className="rq-chain-grid three">{card('Residual · E', current.residual, 'Input from the preceding step', 'residual')}{card('Rotate the Residual', current.transformed, kind === 'k' ? 'Center keys, then redistribute outliers' : 'Redistribute outliers across channels')}{card('INT2 codes · q', current.codes!, 'Four integer levels: 0, 1, 2, 3', 'stored', 3)}</div>
          <div className="rq-chain-equation">Residual → {kind === 'k' ? 'centering + ' : ''}rotation → INT2 quantization</div>
          <div className="rq-chain-storage"><div className="anchor"><strong>One shared anchor</strong><span>Loop 4 · INT4</span></div><div className="stored"><strong>Three Residual caches</strong><span>Loops 1–3 · INT2</span></div><div><strong>Reconstruction metadata</strong><span>Quantization parameters + LS scales</span></div></div>
          <p>Integer-code colors use a separate 0–3 scale. Rotated columns are new coordinates. Fixed rotations and key centering parameters are shared model data.</p>
        </>}
        {index === 3 && <>
          <div className="rq-chain-input stored"><strong>Stored INT2 codes + shared INT4 anchor</strong><span>Read the compact cache produced in step 3</span></div>
          <div className="rq-chain-grid three">{card('Read INT2 codes · q', current.codes!, 'Decode with quantization parameters', 'stored', 3)}{card('Recovered Residual · Ê', recoveredResidual, 'Inverse rotation; restore key centering', 'residual')}{card('Add prediction · X̂', current.reconstructed, 'Rebuild αA from the shared anchor and LS scale')}</div>
          <div className="rq-chain-equation">Recovered Residual + scaled anchor ≈ original KV</div>
          <p>Return to the four KV states from step 1. Compare each original with its reconstructed state on the same color scale.</p>
          <div className="rq-chain-pairs">{example.originals.map((matrix, i) => <div key={i}><strong>Loop {i + 1}{i === 3 ? ' · shared anchor' : ''}</strong><div className="rq-chain-grid two">{card('Original', matrix, 'BF16 reference')}{card('Reconstructed', frame.loops[i].reconstructed, i === 3 ? 'Decoded INT4 anchor' : 'Prediction + recovered Residual')}</div></div>)}</div>
          <div className="rq-chain-finish">The shared pattern is stored once. Each earlier loop is rebuilt using its own Residual.</div>
        </>}
        <div className="rq-chain-footer"><span>Actual {kind.toUpperCase()} · tokens {tokenStart}–{tokenStart + 7} · channels {group + 1}–{group + 16} · fixed magnitude scale</span>{index < 3 ? <button onClick={() => next(index + 1)}>Next: {titles[index + 1]} →</button> : <button onClick={() => next(0)}>Back to the original loops ↺</button>}</div>
      </div>
    </details>)}
  </div>;
}

export function ResidualQuantKVHeatmap() {
  const root = useRef<HTMLDivElement>(null);
  const [load, setLoad] = useState(false);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState(false);
  const [stage, setStage] = useState(5);
  const [loop, setLoop] = useState(0);
  const [kind, setKind] = useState<'k' | 'v'>('k');
  const [reconstruction, setReconstruction] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onPreference = () => {
      if (media.matches) setPlaying(false);
    };
    media.addEventListener('change', onPreference);
    const loader = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setLoad(true);
          loader.disconnect();
        }
      },
      { rootMargin: '600px' },
    );
    const observer = new IntersectionObserver(
      ([entry]) => {
        onPreference();
        setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.15);
      },
      { threshold: [0, 0.15] },
    );
    if (root.current) {
      loader.observe(root.current);
      observer.observe(root.current);
    }
    return () => {
      loader.disconnect();
      observer.disconnect();
      media.removeEventListener('change', onPreference);
    };
  }, []);
  useEffect(() => {
    if (!load) return;
    const controller = new AbortController();
    fetch(sitePath('/projects/residualquant/kv-heatmap-data.json'), {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw Error('Heatmap data unavailable');
        return response.json();
      })
      .then((value) => setData(value as Data))
      .catch((err) => {
        if (err.name !== 'AbortError') setError(true);
      });
    return () => controller.abort();
  }, [load]);
  useEffect(() => {
    if (!playing || !visible || !data) return;
    const timer = window.setTimeout(
      () => setStage((s) => (s + 1) % 6),
      stage === 5 ? 8000 : 6500,
    );
    return () => window.clearTimeout(timer);
  }, [stage, playing, visible, data]);
  if (!data)
    return (
      <div ref={root} className="rq-heatmap">
        <ResidualQuantMechanism stage={5} />
        <p className="rq-film-data-status">
          {error
            ? 'Actual KV data could not load. Reload to retry.'
            : 'Actual KV examples are loading in the background…'}
        </p>
      </div>
    );
  const example = data.kinds[kind],
    frame = example.frames[stage],
    current = frame.loops[loop],
    directError = example.frames[1].loops[loop].stats.errorRmse;
  const matrix = reconstruction
    ? current.reconstructed
    : stage === 0
      ? example.originals[3]
      : current.transformed;
  const meta = data.provenance;
  return (
    <div ref={root} className="rq-heatmap" data-stage={stage}>
      <ResidualQuantMechanism
        stage={stage}
        comparison={{
          original: data.kinds.k.originals[0],
          direct: data.kinds.k.frames[1].loops[0].reconstructed,
          recovered: data.kinds.k.frames[5].loops[0].reconstructed,
          label: `Actual Ouro-1.4B K · Layer ${meta.layer}, Head ${meta.head} · INT2 G16 / INT4 G32`,
        }}
      />
      <details className="rq-heatmap-extra rq-heatmap-all-details">
        <summary>Explore actual KV matrices and implementation details</summary>
        <ConnectedKVFlow example={example} loop={loop} kind={kind} tokenStart={meta.tokenStart} onLoop={setLoop} onKind={setKind} />
        <details className="rq-heatmap-extra">
          <summary>Inspect reconstruction error and numerical details</summary>
          <div className="rq-heatmap-panels">
            <section>
              <header>
                <span>01 · Reference</span>
                <h5>
                  Original {kind.toUpperCase()} · Loop {loop + 1}
                </h5>
                <p>Unchanged BF16 trace at every stage.</p>
              </header>
              <Heatmap
                matrix={example.originals[loop]}
                bound={example.bound}
                label="Original KV heatmap"
                tokenStart={meta.tokenStart}
              />
            </section>
            <section>
              <header>
                <span>02 · Transformation</span>
                <h5>
                  {reconstruction ? 'Reconstructed KV' : STAGES[stage].label}
                </h5>
                <p>
                  {reconstruction
                    ? 'Returned to original channel coordinates.'
                    : STAGES[stage].detail}
                </p>
              </header>
              <Heatmap
                matrix={matrix}
                bound={example.bound}
                label={
                  reconstruction
                    ? 'Reconstructed KV heatmap'
                    : STAGES[stage].label
                }
                tokenStart={meta.tokenStart}
              />
            </section>
            <section>
              <header>
                <span>03 · Error</span>
                <h5>Reconstruction − original</h5>
                <p>Same signed color scale as the other panels.</p>
              </header>
              <Heatmap
                matrix={current.error}
                bound={example.bound}
                label="Signed KV reconstruction error heatmap"
                tokenStart={meta.tokenStart}
              />
            </section>
          </div>
          <div className="rq-heatmap-color-row">
            <div>
              <span>−{example.bound.toFixed(2)}</span>
              <i />
              <span>+{example.bound.toFixed(2)}</span>
              <strong>Fixed color scale · 0 is neutral</strong>
            </div>
            <button
              type="button"
              aria-pressed={reconstruction}
              onClick={() => {
                setReconstruction((value) => !value);
                setPlaying(false);
              }}
            >
              {reconstruction ? 'Show transformation' : 'Show reconstructed KV'}
            </button>
          </div>
          <div className="rq-heatmap-equation">{STAGES[stage].formula}</div>
          <div className="rq-heatmap-metrics">
            <div>
              <span>direct INT2 · this slice</span>
              <strong>{directError.toFixed(4)}</strong>
              <small>reconstruction RMSE</small>
            </div>
            <div>
              <span>Current stage · this slice</span>
              <strong>{current.stats.errorRmse.toFixed(4)}</strong>
              <small>reconstruction RMSE</small>
            </div>
            <div>
              <span>Before quantization</span>
              <strong>{current.stats.transformed.peakToRms.toFixed(2)}×</strong>
              <small>peak magnitude / RMS</small>
            </div>
          </div>
        </details>
        <details className="rq-heatmap-extra">
          <summary>Storage breakdown and data source</summary>
          <div className="rq-heatmap-storage">
            <div className="rq-heatmap-storage-heading">
              <strong>Stored per token</strong>
              <span>
                {frame.storagePercent.toFixed(1)}% of BF16 · G16 residuals / G32
                INT4 anchor
              </span>
            </div>
            {frame.bits.map((bits, i) => (
              <div className="rq-heatmap-storage-row" key={i}>
                <span>Loop {i + 1}</span>
                <div className="rq-heatmap-storage-track">
                  <i
                    className={i === 3 ? 'is-anchor' : ''}
                    style={{ width: `${(bits / 16) * 100}%` }}
                  />
                  <i
                    className="is-metadata"
                    style={{
                      width: `${stage === 0 ? 0 : (16 / frame.groups[i] / 16) * 100}%`,
                    }}
                  />
                  <i
                    className="is-alpha"
                    style={{
                      width: `${stage >= 3 && i < 3 ? (0.125 / 16) * 100 : 0}%`,
                    }}
                  />
                </div>
                <strong>
                  {stage === 0
                    ? 'BF16'
                    : i === 3 && stage >= 2
                      ? `INT${bits} anchor`
                      : stage >= 2
                        ? 'INT2 residual'
                        : 'INT2 KV'}
                </strong>
              </div>
            ))}
            <p>
              Code values + quantization metadata (gray) + LS coefficient
              (orange). Pale tracks show the BF16 footprint. Rotations are a
              fixed calibration cost.
            </p>
          </div>
          <div className="rq-heatmap-provenance">
            <p>
              Actual BF16 {kind.toUpperCase()} from a GSM8K calibration-holdout
              trace, sample {meta.sample}, token positions {meta.tokenStart}–
              {meta.tokenEnd}. Quantization and reconstruction were computed on
              CPU with the original calibration functions and learned OptR-H
              matrices. INT2 uses G16; the mixed anchor uses G32. This example
              differs from the G32 setting of Figure 1.
            </p>
            <p>
              These are local slice errors, not benchmark accuracy. Rotation
              optimizes attention quality rather than every slice&apos;s maximum
              value; improvements need not be monotonic. Keys include fixed
              centering. Rotated columns are basis coordinates, not the original
              channels.
            </p>
            <a
              href={sitePath('/projects/residualquant/kv-heatmap-data.json')}
              download
            >
              Download example & provenance
            </a>
          </div>
        </details>
      </details>
    </div>
  );
}
