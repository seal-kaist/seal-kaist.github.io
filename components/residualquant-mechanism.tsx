'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Plus,
  Equal,
  Minus,
  Pause,
  Play,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const pattern = [0.82, 0.46, 0.68, 0.91, 0.58, 0.75, 0.35, 0.65];
function Tiles({
  loop = 4,
  residual = false,
  ls = true,
  rotated = false,
  coarse = false,
}: {
  loop?: number;
  residual?: boolean;
  ls?: boolean;
  rotated?: boolean;
  coarse?: boolean;
}) {
  const index = (loop * 2 + 1) % 8;
  return (
    <svg
      className={`rq-core-tiles ${residual ? 'is-difference' : ''}`}
      viewBox="0 0 166 80"
      role="img"
      aria-label={
        residual
          ? `Conceptual loop ${loop} residual; smaller values in the same eight cells`
          : `Conceptual loop ${loop} KV; repeated blue pattern${loop !== 4 ? ' with a unique orange difference' : ''}`
      }
    >
      {pattern.map((value, i) => {
        const x = 5 + (i % 4) * 40,
          y = 4 + Math.floor(i / 4) * 38;
        const mark = rotated
          ? i === index || i === (index + 2) % 8 || i === (index + 5) % 8
            ? 7
            : 2
          : i === index
            ? ls
              ? 12
              : 19
            : ls
              ? 2
              : 6;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width="32"
              height="32"
              rx="5"
              fill={residual ? '#fcf5ed' : '#2d7b94'}
              fillOpacity={
                residual
                  ? 1
                  : 0.32 + (coarse ? Math.round(value * 3) / 3 : value) * 0.64
              }
              stroke={residual ? '#e9cdb1' : '#2d7b94'}
              strokeOpacity={residual ? 0.7 : 0.12}
            />
            {(residual || (loop !== 4 && !coarse)) && (
              <rect
                className="rq-core-difference"
                x={x + (32 - mark) / 2}
                y={y + (32 - mark) / 2}
                width={mark}
                height={mark}
                rx="2"
                fill="#c58245"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

type ReconstructionComparison = {
  original: number[][];
  direct: number[][];
  recovered: number[][];
  label: string;
};
function ReconstructionCompare({ data }: { data?: ReconstructionComparison }) {
  if (!data)
    return (
      <p className="rq-film-comparison-loading">
        Loading the measured KV reconstruction example…
      </p>
    );
  // Select a group using only original magnitudes, then keep the same crop for all methods.
  let group = 0,
    best = -1;
  for (let start = 0; start < 128; start += 16) {
    const energy = data.original
      .slice(0, 8)
      .reduce(
        (sum, row) =>
          sum + row.slice(start, start + 16).reduce((s, v) => s + v * v, 0),
        0,
      );
    if (energy > best) {
      best = energy;
      group = start;
    }
  }
  const crop = (matrix: number[][]) =>
    matrix.slice(0, 8).map((row) => row.slice(group, group + 16));
  const source = crop(data.original),
    direct = crop(data.direct),
    recovered = crop(data.recovered);
  const sorted = source
      .flat()
      .map(Math.abs)
      .sort((a, b) => a - b),
    bound = Math.max(sorted[Math.floor(sorted.length * 0.95)], 0.001);
  const rmse = (matrix: number[][]) =>
    Math.sqrt(
      matrix
        .flat()
        .reduce((sum, v, i) => sum + (v - source.flat()[i]) ** 2, 0) / 128,
    );
  const colors = (v: number) => {
    const t = Math.min(1, Math.abs(v) / bound),
      neutral = [247, 249, 250],
      end = [37, 108, 151];
    return `rgb(${neutral.map((n, i) => Math.round(n + (end[i] - n) * t)).join(',')})`;
  };
  return (
    <div className="rq-film-comparison">
      <div className="rq-film-error-legend">
        <span className="rq-film-error-swatch" aria-hidden="true" />
        <div><strong>Red border = reconstruction error</strong><span>The value differs from the original by more than 0.25.</span></div>
      </div>
      {[
        {
          name: 'Original KV',
          matrix: source,
          mark: 'Reference',
          className: 'is-original',
        },
        {
          name: 'direct INT2',
          matrix: direct,
          mark: '≠ detail lost',
          className: 'is-direct',
        },
        {
          name: 'ResidualQuant',
          matrix: recovered,
          mark: '≈ much closer',
          className: 'is-recovered',
        },
      ].map((item) => (
        <div
          key={item.name}
          className={`rq-film-comparison-card ${item.className}`}
        >
          <h5>{item.name}</h5>
          <span className="rq-film-comparison-badge">{item.mark}</span>
          <svg
            viewBox="0 0 320 160"
            role="img"
            aria-label={`${item.name} actual KV crop; identical color scale, error outlines above absolute error 0.25`}
          >
            {item.matrix.map((row, r) =>
              row.map((v, c) => (
                <rect
                  key={`${r}-${c}`}
                  x={c * 20 + 1}
                  y={r * 20 + 1}
                  width="17"
                  height="17"
                  rx="2"
                  fill={colors(v)}
                  stroke={
                    Math.abs(v - source[r][c]) > 0.25
                      ? '#c65c5c'
                      : 'transparent'
                  }
                  strokeWidth="2"
                >
                  <title>{`Original: ${source[r][c].toFixed(3)} · Reconstructed: ${v.toFixed(3)} · Absolute error: ${Math.abs(v - source[r][c]).toFixed(3)}`}</title>
                </rect>
              )),
            )}
          </svg>
          <div className={`rq-film-error-count ${item.className === 'is-original' ? 'is-reference' : ''}`}>
            {item.className === 'is-original'
              ? <span>Reference for every comparison</span>
              : <><strong>{item.matrix.flat().filter((v,i) => Math.abs(v - source.flat()[i]) > .25).length}</strong><span> / 128 cells marked<br />absolute error &gt; 0.25</span></>}
          </div>
          <p>
            {item.className === 'is-original'
              ? 'Same tokens and channels'
              : `Reconstruction RMSE: ${rmse(item.matrix).toFixed(3)}`}
          </p>
        </div>
      ))}
      <p className="rq-film-comparison-source">
        {data.label} · enlarged 8-token × 16-channel crop · blue intensity shows
        absolute KV magnitude, clipped at {bound.toFixed(2)} on the same scale.
        Red outlines: absolute reconstruction
        error &gt; 0.25. These are local slice errors, not benchmark accuracy.
      </p>
    </div>
  );
}

const SCENES = [
  {
    title: 'Four loops. Nearly the same pattern.',
    text: 'Look at the repeated blue tiles. Orange marks are the small differences specific to each loop.',
    label: 'Similar loops',
    duration: 4200,
  },
  {
    title: 'Choose Loop 4 as the shared anchor.',
    text: 'Store its KV once in INT4. This is the reference used by all three earlier loops.',
    label: 'Choose anchor',
    duration: 3400,
  },
  {
    title: 'Predict, then subtract.',
    text: 'LS scales the Loop 4 anchor to predict Loop 1. Subtracting that prediction leaves the residual.',
    label: 'Find residual',
    duration: 5200,
  },
  {
    title: 'Encode only the differences.',
    text: 'Rotate the residuals and pack them in INT2. The shared anchor remains INT4.',
    label: 'Pack INT2',
    duration: 4300,
  },
  {
    title: 'Add the prediction back.',
    text: 'Read the anchor and Loop 1 residual, decode and inverse-rotate the residual, then add to recover Loop 1 KV.',
    label: 'Reconstruct',
    duration: 6000,
  },
  {
    title: 'Why the residual matters.',
    text: 'Compare the same real KV values. Direct INT2 loses detail; adding the decoded residual to the anchor prediction reduces reconstruction error.',
    label: 'See the difference',
    duration: 9000,
  },
];

export function ResidualQuantMechanism({
  stage: _stage,
  comparison,
}: {
  stage: number;
  comparison?: ReconstructionComparison;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [scene, setScene] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const preference = () => {
      if (media.matches) setPlaying(false);
    };
    media.addEventListener('change', preference);
    const observer = new IntersectionObserver(
      ([entry]) => {
        preference();
        setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.2);
      },
      { threshold: [0, 0.2] },
    );
    if (root.current) observer.observe(root.current);
    return () => {
      observer.disconnect();
      media.removeEventListener('change', preference);
    };
  }, []);
  useEffect(() => {
    if (!playing || !visible) return;
    const timer = window.setTimeout(
      () => setScene((s) => (s + 1) % SCENES.length),
      SCENES[scene].duration,
    );
    return () => window.clearTimeout(timer);
  }, [scene, playing, visible]);
  const go = (value: number) => {
    setScene((value + SCENES.length) % SCENES.length);
    setPlaying(false);
  };
  const current = SCENES[scene];
  const card = (
    title: string,
    loop: number,
    variant: 'original' | 'anchor' | 'residual' = 'original',
  ) => (
    <div className={`rq-film-card is-${variant}`}>
      <span>{title}</span>
      <Tiles loop={loop} residual={variant === 'residual'} />
      <small>
        {variant === 'anchor'
          ? 'From Loop 4'
          : variant === 'residual'
            ? 'Loop-specific difference'
            : 'Shared pattern + difference'}
      </small>
    </div>
  );
  return (
    <div className="rq-film" ref={root} data-scene={scene}>
      <div className="rq-film-topline">
        <span>THE MECHANISM · WATCH IT UNFOLD</span>
        <div>
          <button
            type="button"
            aria-label={
              playing
                ? 'Pause mechanism walkthrough'
                : 'Play mechanism walkthrough'
            }
            onClick={() => setPlaying((p) => !p)}
          >
            {playing ? <Pause size={14} /> : <Play size={14} />}{' '}
            {playing ? 'Pause' : 'Play'}
          </button>
          <button
            type="button"
            onClick={() => {
              setScene(0);
              setPlaying(true);
            }}
          >
            <RotateCcw size={14} /> Replay
          </button>
        </div>
      </div>
      <div className="rq-film-copy">
        <span>0{scene + 1} / 06</span>
        <h4>{current.title}</h4>
        <p>{current.text}</p>
      </div>
      <div className={`rq-film-frame is-scene-${scene}`} key={scene}>
        {scene === 0 && (
          <div className="rq-film-originals">
            {[1, 2, 3, 4].map((loop) => (
              <div key={loop}>{card(`Loop ${loop}`, loop)}</div>
            ))}
          </div>
        )}
        {scene === 1 && (
          <div className="rq-film-pick">
            <div className="rq-film-origin-label">
              <span>Loop 1</span>
              <span>Loop 2</span>
              <span>Loop 3</span>
              <strong>Loop 4</strong>
            </div>
            <div className="rq-film-selected">
              {card('Shared anchor · INT4', 4, 'anchor')}
            </div>
            <p>One reference for Loops 1, 2 and 3.</p>
          </div>
        )}
        {scene === 2 && (
          <div className="rq-film-equation">
            {card('Loop 1 KV', 1)}
            <Minus className="rq-film-operator" />
            {card('Scaled Loop 4 anchor', 4, 'anchor')}
            <Equal className="rq-film-operator" />
            {card('Loop 1 residual', 1, 'residual')}
          </div>
        )}
        {scene === 3 && (
          <div className="rq-film-pack">
            <div className="rq-film-pack-anchor">
              {card('Shared anchor · INT4', 4, 'anchor')}
            </div>
            <Plus className="rq-film-operator" />
            <div className="rq-film-pack-residuals">
              {[1, 2, 3].map((loop) => (
                <div key={loop}>
                  <span>Loop {loop} residual</span>
                  <Tiles loop={loop} residual rotated />
                  <strong>INT2</strong>
                </div>
              ))}
            </div>
          </div>
        )}
        {scene === 4 && (
          <div className="rq-film-equation">
            {card('Scaled anchor', 4, 'anchor')}
            <Plus className="rq-film-operator" />
            {card('Decoded residual', 1, 'residual')}
            <span className="rq-film-approx" aria-label="approximately equals">≈</span>
            {card('Recovered Loop 1 KV', 1)}
          </div>
        )}
        {scene === 5 && <ReconstructionCompare data={comparison} />}
      </div>
      <div className="rq-film-timeline">
        {SCENES.map((item, i) => (
          <button
            type="button"
            key={item.label}
            aria-current={i === scene ? 'step' : undefined}
            onClick={() => go(i)}
          >
            <i>
              <b
                style={{
                  animationDuration: `${item.duration}ms`,
                  animationPlayState: playing && visible ? 'running' : 'paused',
                }}
              />
            </i>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
      <div className="rq-film-bottom">
        <span>
          {scene === 5 ? 'Actual KV trace · red outlines mark reconstruction error' : 'Illustrative tiles · mark size shows value magnitude, not bytes'}
        </span>
        <div>
          <button
            type="button"
            aria-label="Previous scene"
            onClick={() => go(scene - 1)}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            aria-label="Next scene"
            onClick={() => go(scene + 1)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
