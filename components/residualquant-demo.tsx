'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';

const STEPS = [
  {
    title: 'Similar loops',
    text: 'Each loop has its own KV state, but much of the pattern is shared.',
  },
  {
    title: 'Last-loop anchor',
    text: 'Store the final loop as an INT4 anchor. Earlier loops share this reconstructed reference.',
  },
  {
    title: 'LS prediction',
    text: 'Scale the reconstructed anchor to predict the earlier loop. LS chooses α to minimize the remaining error.',
  },
  {
    title: 'Small residual',
    text: 'Subtract the prediction. Only the smaller, loop-specific difference remains.',
  },
  {
    title: 'Rotate + INT2',
    text: 'Rotate the residual across channels, then encode each group with four INT2 levels.',
  },
  {
    title: 'Reconstruct',
    text: 'Add the inverse-rotated residual to the scaled anchor. Attention consumes reconstructed tiles directly.',
  },
];

// Deterministic teaching example, independent of model traces and benchmark scores.
const N = 32;
const anchor = Array.from(
  { length: N },
  (_, i) => 0.65 * Math.sin(i * 0.43) + 0.23 * Math.cos(i * 1.13),
);
const target = anchor.map(
  (v, i) => 0.84 * v + 0.055 * Math.sin(i * 1.71) + (i === 13 ? 0.17 : 0),
);
function quantize(values: number[], bits: number) {
  const low = Math.min(...values),
    high = Math.max(...values);
  const scale = (high - low) / (2 ** bits - 1) || 1;
  return {
    values: values.map((v) => low + Math.round((v - low) / scale) * scale),
    scale,
  };
}
function rotate(values: number[]) {
  const out = [...values];
  for (let span = 1; span < out.length; span *= 2) {
    for (let i = 0; i < out.length; i += span * 2) {
      for (let j = 0; j < span; j++) {
        const a = out[i + j],
          b = out[i + j + span];
        out[i + j] = a + b;
        out[i + j + span] = a - b;
      }
    }
  }
  return out.map((v) => v / Math.sqrt(out.length));
}
const reference = quantize(anchor, 4).values;
const alpha =
  target.reduce((s, v, i) => s + v * reference[i], 0) /
  reference.reduce((s, v) => s + v * v, 0);
const prediction = reference.map((v) => alpha * v);
const residual = target.map((v, i) => v - prediction[i]);
const rotated = rotate(residual);
const packed = quantize(rotated, 2);
const recovered = rotate(packed.values).map((v, i) => v + prediction[i]);
const direct = quantize(target, 2);
const rmse = (values: number[]) =>
  Math.sqrt(values.reduce((s, v, i) => s + (v - target[i]) ** 2, 0) / N);
const bound = Math.max(...anchor.map(Math.abs), ...target.map(Math.abs)) * 1.15;
function path(values: number[]) {
  return values
    .map(
      (v, i) =>
        `${i ? 'L' : 'M'}${(24 + (i / (N - 1)) * 592).toFixed(2)},${(110 - (v / bound) * 80).toFixed(2)}`,
    )
    .join(' ');
}

export function ResidualQuantDemo() {
  const root = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      setReducedMotion(media.matches);
      if (media.matches) setPlaying(false);
    };
    media.addEventListener('change', update);
    const observer = new IntersectionObserver(
      ([entry]) => {
        update();
        setVisible(entry.isIntersecting);
      },
      { threshold: 0.2 },
    );
    if (root.current) observer.observe(root.current);
    return () => {
      observer.disconnect();
      media.removeEventListener('change', update);
    };
  }, []);
  useEffect(() => {
    if (!playing || !visible) return;
    const timer = window.setTimeout(
      () => setStage((s) => (s + 1) % STEPS.length),
      stage === 5 ? 4200 : 2600,
    );
    return () => window.clearTimeout(timer);
  }, [playing, visible, stage]);

  const shown =
    stage < 2
      ? target
      : stage === 2
        ? prediction
        : stage === 3
          ? residual
          : stage === 4
            ? rotated
            : recovered;
  const label = [
    'Earlier-loop KV',
    'Earlier-loop KV',
    'Scaled anchor · αR',
    'Residual · X − αR',
    'Rotated residual · U(X − αR)',
    'Reconstructed KV · X̂',
  ][stage];
  const replay = () => {
    setStage(0);
    setPlaying(true);
  };
  return (
    <div
      ref={root}
      className={`rq-story ${reducedMotion ? 'rq-story-reduced' : ''}`}
      data-stage={stage}
    >
      <div className="rq-story-top">
        <p className="rq-story-kicker">Store what changes between loops.</p>
        <div className="rq-story-controls">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? 'Pause animation' : 'Play animation'}
          >
            {playing ? <Pause size={16} /> : <Play size={16} />}{' '}
            {playing ? 'Pause' : 'Play'}
          </button>
          <button type="button" onClick={replay}>
            <RotateCcw size={16} /> Replay
          </button>
        </div>
      </div>
      <div className="rq-story-steps" aria-label="Animation steps">
        {STEPS.map((step, i) => (
          <button
            key={step.title}
            type="button"
            aria-current={stage === i ? 'step' : undefined}
            className={stage === i ? 'is-active' : ''}
            onClick={() => {
              setStage(i);
              setPlaying(false);
            }}
          >
            <span>0{i + 1}</span>
            {step.title}
          </button>
        ))}
      </div>
      <div
        className="rq-story-loop-row"
        aria-label="Four-loop precision schedule"
      >
        {[1, 2, 3, 4].map((loop) => (
          <div
            key={loop}
            className={`rq-story-loop ${loop === 4 ? 'is-anchor' : ''} ${stage >= 1 ? 'is-stored' : ''}`}
          >
            <span>Loop {loop}</span>
            <strong>
              {stage === 0
                ? 'BF16 KV'
                : loop === 4
                  ? 'INT4 anchor'
                  : 'INT2 residual'}
            </strong>
            <div className="rq-story-mini">
              {Array.from({ length: 16 }, (_, i) => (
                <i
                  key={i}
                  style={{
                    height: `${12 + Math.abs(anchor[i] * (loop === 4 || stage === 0 ? 1 : 0.2)) * 45}px`,
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="rq-story-caption">
        <span>0{stage + 1} / 06</span>
        <div>
          <h3>{STEPS[stage].title}</h3>
          <p>{STEPS[stage].text}</p>
        </div>
      </div>
      <div className="rq-story-visual">
        <div className="rq-story-chart-label">
          <span>{label}</span>
          <span>Same value scale at every step</span>
        </div>
        <svg
          viewBox="0 0 640 220"
          role="img"
          aria-label={`${label}, compared with the original KV on a fixed scale`}
        >
          {[30, 70, 110, 150, 190].map((y) => (
            <line
              key={y}
              x1="24"
              x2="616"
              y1={y}
              y2={y}
              className="rq-story-grid"
            />
          ))}
          <path d={path(target)} className="rq-story-original" />
          {stage === 0 && (
            <path d={path(anchor)} className="rq-story-anchor-line" />
          )}
          {stage === 1 && (
            <path d={path(reference)} className="rq-story-anchor-line" />
          )}
          <path
            key={stage}
            d={path(shown)}
            pathLength="1"
            className={`rq-story-signal ${stage === 3 || stage === 4 ? 'is-residual' : ''}`}
          />
          <text x="24" y="213">
            Channel 1
          </text>
          <text x="548" y="213">
            Channel 32
          </text>
        </svg>
        <div className="rq-story-legend">
          <span>Original KV</span>
          <span>{label}</span>
        </div>
        <div className="rq-story-equation">
          {stage < 2
            ? '[X₁, X₂, X₃, X₄] → [INT2, INT2, INT2, INT4]'
            : stage === 2
              ? 'α = ⟨X, R⟩ / ‖R‖²     ·     prediction = αR'
              : stage === 3
                ? 'residual = X − αR'
                : stage === 4
                  ? 'stored residual = Q₂(U(X − αR))'
                  : 'X̂ = αR + UᵀQ₂(U(X − αR))'}
        </div>
      </div>
      <div className="rq-story-bottom">
        <div>
          <span>direct INT2 · illustrative RMSE</span>
          <strong>{rmse(direct.values).toFixed(3)}</strong>
        </div>
        <div className={stage === 5 ? 'is-active' : ''}>
          <span>Anchor + rotated INT2 residual · illustrative RMSE</span>
          <strong>{stage === 5 ? rmse(recovered).toFixed(3) : '—'}</strong>
        </div>
      </div>
      <p className="rq-story-note">
        Synthetic 32-channel teaching example with affine quantization and a
        fixed Hadamard rotation. The paper uses calibrated OptR-H rotations;
        these curves and errors are not model measurements. During decode, the
        current token stays in BF16 until its final-loop anchor is available.
      </p>
    </div>
  );
}
