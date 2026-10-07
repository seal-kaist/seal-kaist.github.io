"use client";

import { useEffect, useState } from "react";
import { Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

const STAGES = [
  "Original KV",
  "Direct INT2",
  "Predict from anchor",
  "Quantize residual",
  "Reconstruct",
];
const STAGE_EXPLANATIONS = [
  "Start with the KV state from an earlier loop.",
  "Direct INT2 must map the full KV range to only four levels, producing a coarse quantization scale.",
  "ResidualQuant uses the final-loop INT4 anchor to predict most of the earlier loop's KV state.",
  "The remaining residual has a much narrower range, so INT2 represents it with a finer scale.",
  "Adding the quantized residual back to the prediction reconstructs the KV state with lower error.",
];
const PLOT_WIDTH = 320;
const PLOT_HEIGHT = 148;
const PLOT_PADDING = 14;

function quantize(values: number[], bits: number) {
  const bound = Math.max(...values.map((value) => Math.abs(value)), 1e-6);
  const levels = 2 ** bits - 1;
  const quantized = values.map((value) => {
    const index = Math.round(((value + bound) / (2 * bound)) * levels);
    return (index / levels) * 2 * bound - bound;
  });

  return { values: quantized, bound, scale: (2 * bound) / levels };
}

function relativeRmse(reference: number[], estimate: number[]) {
  const error = Math.sqrt(
    estimate.reduce(
      (sum, value, index) => sum + (value - reference[index]) ** 2,
      0,
    ) / reference.length,
  );
  const magnitude = Math.sqrt(
    reference.reduce((sum, value) => sum + value ** 2, 0) / reference.length,
  );
  return (100 * error) / magnitude;
}

function createDemoData() {
  const anchor = Array.from({ length: 96 }, (_, index) => {
    const spike = index % 29 === 7 ? 0.34 : index % 37 === 12 ? -0.31 : 0;
    return (
      0.62 * Math.sin(index * 0.41) +
      0.24 * Math.cos(index * 1.17) +
      spike
    );
  });
  const target = anchor.map(
    (value, index) =>
      0.84 * value +
      0.105 * Math.sin(index * 1.73 + 0.8) +
      (index % 23 === 5 ? 0.055 : 0),
  );

  const direct = quantize(target, 2);
  const quantizedAnchor = quantize(anchor, 4);
  const numerator = target.reduce(
    (sum, value, index) => sum + value * quantizedAnchor.values[index],
    0,
  );
  const denominator = quantizedAnchor.values.reduce(
    (sum, value) => sum + value * value,
    0,
  );
  const alpha = numerator / denominator;
  const prediction = quantizedAnchor.values.map((value) => alpha * value);
  const residual = target.map((value, index) => value - prediction[index]);
  const quantizedResidual = quantize(residual, 2);
  const reconstruction = prediction.map(
    (value, index) => value + quantizedResidual.values[index],
  );

  return {
    target,
    anchor,
    residual,
    direct,
    quantizedAnchor,
    quantizedResidual,
    alpha,
    directError: relativeRmse(target, direct.values),
    residualError: relativeRmse(target, reconstruction),
  };
}

const DEMO = createDemoData();
const COMMON_BOUND = Math.max(DEMO.direct.bound, DEMO.quantizedAnchor.bound) * 1.08;

function densityPath(values: number[], bound: number) {
  const points = 72;
  const bandwidth = bound * 0.105;
  const densities = Array.from({ length: points }, (_, index) => {
    const x = -bound + (index / (points - 1)) * bound * 2;
    return values.reduce((sum, value) => {
      const distance = (x - value) / bandwidth;
      return sum + Math.exp(-0.5 * distance * distance);
    }, 0);
  });
  const peak = Math.max(...densities);

  return densities
    .map((density, index) => {
      const x =
        PLOT_PADDING +
        (index / (points - 1)) * (PLOT_WIDTH - PLOT_PADDING * 2);
      const y =
        PLOT_HEIGHT -
        PLOT_PADDING -
        (density / peak) * (PLOT_HEIGHT - PLOT_PADDING * 2 - 8);
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

function levelPositions(range: number, bits: number, commonBound: number) {
  const count = 2 ** bits;
  return Array.from({ length: count }, (_, index) => {
    const value = -range + (index / (count - 1)) * range * 2;
    return (
      PLOT_PADDING +
      ((value + commonBound) / (commonBound * 2)) *
        (PLOT_WIDTH - PLOT_PADDING * 2)
    );
  });
}

function DistributionPlot({
  values,
  range,
  bits,
  color,
  active,
  showLevels,
  label,
}: {
  values: number[];
  range: number;
  bits: number;
  color: "charcoal" | "blue" | "orange";
  active: boolean;
  showLevels: boolean;
  label: string;
}) {
  return (
    <svg
      viewBox={`0 0 ${PLOT_WIDTH} ${PLOT_HEIGHT}`}
      className={`rq-compare-plot is-${color} ${active ? "is-active" : ""}`}
      role="img"
      aria-label={label}
    >
      <line
        x1={PLOT_PADDING}
        x2={PLOT_WIDTH - PLOT_PADDING}
        y1={PLOT_HEIGHT - PLOT_PADDING}
        y2={PLOT_HEIGHT - PLOT_PADDING}
        className="rq-compare-axis"
      />
      <line
        x1={PLOT_WIDTH / 2}
        x2={PLOT_WIDTH / 2}
        y1={PLOT_PADDING}
        y2={PLOT_HEIGHT - PLOT_PADDING}
        className="rq-compare-center"
      />
      {showLevels &&
        levelPositions(range, bits, COMMON_BOUND).map((x, index) => (
          <line
            key={index}
            x1={x}
            x2={x}
            y1={PLOT_PADDING + 5}
            y2={PLOT_HEIGHT - PLOT_PADDING}
            className="rq-compare-level"
          />
        ))}
      <path
        pathLength="1"
        d={densityPath(values, COMMON_BOUND)}
        className="rq-compare-density"
      />
    </svg>
  );
}

export function ResidualQuantDemo() {
  const [stage, setStage] = useState(4);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!isPlaying) return;

    const timer = window.setTimeout(() => {
      if (stage === STAGES.length - 1) {
        setIsPlaying(false);
        return;
      }
      setStage((current) => current + 1);
    }, 900);

    return () => window.clearTimeout(timer);
  }, [isPlaying, stage]);

  const replay = () => {
    setStage(0);
    setIsPlaying(true);
  };

  const selectStage = (nextStage: number) => {
    setStage(nextStage);
    setIsPlaying(false);
  };

  const scaleRatio = DEMO.direct.scale / DEMO.quantizedResidual.scale;

  return (
    <div className="rq-compare">
      <div className="rq-compare-intro">
        <p>
          Both methods use INT2 for loop-specific information. Direct
          quantization encodes the entire KV state; ResidualQuant uses a shared
          anchor to predict it and encodes only the smaller difference.
        </p>
        <div>
          <span aria-live="polite">{STAGES[stage]}</span>
          <Button type="button" variant="outline" onClick={replay}>
            {isPlaying ? <RotateCcw /> : <Play />}
            Replay
          </Button>
        </div>
      </div>

      <div className="rq-compare-flow" aria-label="Choose explanation step">
        {STAGES.map((item, index) => (
          <button
            type="button"
            key={item}
            className={`${index <= stage ? "is-complete" : ""} ${index === stage ? "is-active" : ""}`}
            aria-current={index === stage ? "step" : undefined}
            onClick={() => selectStage(index)}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            {item}
          </button>
        ))}
      </div>

      <p className="rq-compare-explanation" aria-live="polite">
        {STAGE_EXPLANATIONS[stage]}
      </p>

      <div className="rq-compare-branches">
        <section
          className={`rq-compare-direct ${stage === 1 ? "is-highlighted" : ""}`}
        >
          <header>
            <span>Direct quantization</span>
            <h3>Full KV → INT2</h3>
          </header>
          <DistributionPlot
            values={DEMO.target}
            range={DEMO.direct.bound}
            bits={2}
            color="charcoal"
            active
            showLevels={stage >= 1}
            label="Full KV distribution with four INT2 quantization levels"
          />
          <div className="rq-compare-scale">
            <span>Full range</span>
            <strong>±{DEMO.direct.bound.toFixed(2)}</strong>
            <span>Scale Δ</span>
            <strong>{DEMO.direct.scale.toFixed(2)}</strong>
          </div>
          <div
            className={`rq-compare-error is-direct ${stage >= 1 ? "is-visible" : ""}`}
          >
            <span>Relative reconstruction error</span>
            <strong>{DEMO.directError.toFixed(1)}%</strong>
          </div>
        </section>

        <section className="rq-compare-residual">
          <header>
            <span>ResidualQuant</span>
            <h3>Anchor + residual</h3>
          </header>

          <div className="rq-compare-pair">
            <div className={stage === 2 ? "is-highlighted" : ""}>
              <div className="rq-compare-subheading">
                <span>1</span>
                <strong>INT4 anchor</strong>
              </div>
              <DistributionPlot
                values={DEMO.anchor}
                range={DEMO.quantizedAnchor.bound}
                bits={4}
                color="blue"
                active={stage >= 2}
                showLevels={stage >= 2}
                label="Anchor distribution with sixteen INT4 quantization levels"
              />
              <div className="rq-compare-scale">
                <span>Full range</span>
                <strong>±{DEMO.quantizedAnchor.bound.toFixed(2)}</strong>
                <span>Scale Δ</span>
                <strong>{DEMO.quantizedAnchor.scale.toFixed(2)}</strong>
              </div>
            </div>

            <div className={stage === 3 ? "is-highlighted" : ""}>
              <div className="rq-compare-subheading">
                <span>2</span>
                <strong>INT2 residual</strong>
              </div>
              <DistributionPlot
                values={DEMO.residual}
                range={DEMO.quantizedResidual.bound}
                bits={2}
                color="orange"
                active={stage >= 3}
                showLevels={stage >= 3}
                label="Narrow residual distribution with four INT2 quantization levels"
              />
              <div className="rq-compare-scale">
                <span>Residual range</span>
                <strong>±{DEMO.quantizedResidual.bound.toFixed(2)}</strong>
                <span>Scale Δ</span>
                <strong>{DEMO.quantizedResidual.scale.toFixed(2)}</strong>
              </div>
            </div>
          </div>

          <div
            className={`rq-compare-reconstruct ${stage === 4 ? "is-highlighted" : ""}`}
          >
            <code>
              K̂ᵢ = {DEMO.alpha.toFixed(2)} · Q₄(K₄) + Q₂(Kᵢ − {DEMO.alpha.toFixed(2)} · Q₄(K₄))
            </code>
            <div
              className={`rq-compare-error is-residual ${stage >= 4 ? "is-visible" : ""}`}
            >
              <span>Relative reconstruction error</span>
              <strong>{DEMO.residualError.toFixed(1)}%</strong>
            </div>
          </div>
        </section>
      </div>

      <div className={`rq-compare-takeaway ${stage >= 3 ? "is-visible" : ""}`}>
        <span>Same INT2 precision</span>
        <strong>{scaleRatio.toFixed(1)}× finer quantization scale</strong>
        <p>
          The residual occupies a smaller range, reducing the step size from{" "}
          {DEMO.direct.scale.toFixed(2)} to {DEMO.quantizedResidual.scale.toFixed(2)}.
        </p>
      </div>

      <p className="rq-compare-note">
        Illustrative distributions and errors. Quantization ranges and scales
        are computed from the values shown.
      </p>
    </div>
  );
}
