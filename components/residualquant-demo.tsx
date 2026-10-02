"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const STEPS = [
  { short: "Original", label: "Original KV" },
  { short: "Anchor", label: "INT4 anchor" },
  { short: "Prediction", label: "Scaled prediction" },
  { short: "Residual", label: "INT2 residual" },
  { short: "Reconstruction", label: "Reconstructed KV" },
] as const;

const POINT_COUNT = 36;

function quantize(values: number[], bits: number) {
  const bound = Math.max(...values.map((value) => Math.abs(value)), 1e-6);
  const levels = 2 ** bits - 1;

  return values.map((value) => {
    const index = Math.round(((value + bound) / (2 * bound)) * levels);
    return (index / levels) * 2 * bound - bound;
  });
}

function createLoopData(loop: number) {
  const anchorSource = Array.from({ length: POINT_COUNT }, (_, index) => {
    const spike = index === 7 ? 0.48 : index === 25 ? -0.44 : 0;
    return (
      0.64 * Math.sin(index * 0.48) +
      0.25 * Math.cos(index * 1.22) +
      spike
    );
  });
  const scale = [0.76, 0.84, 0.92, 1][loop - 1];
  const residualScale = [0.18, 0.14, 0.1, 0.025][loop - 1];
  const original = anchorSource.map(
    (value, index) =>
      scale * value +
      residualScale * Math.sin(index * 1.73 + loop * 0.61) +
      (index % 11 === loop ? residualScale * 0.42 : 0),
  );
  const anchor = quantize(anchorSource, 4);
  const numerator = original.reduce(
    (sum, value, index) => sum + value * anchor[index],
    0,
  );
  const denominator = anchor.reduce((sum, value) => sum + value * value, 0);
  const alpha = numerator / denominator;
  const prediction = anchor.map((value) => alpha * value);
  const residual = original.map((value, index) => value - prediction[index]);
  const quantizedResidual = quantize(residual, 2);
  const reconstruction = prediction.map(
    (value, index) => value + quantizedResidual[index],
  );
  const direct = quantize(original, 2);

  const relativeRmse = (estimate: number[]) => {
    const error = Math.sqrt(
      estimate.reduce(
        (sum, value, index) => sum + (value - original[index]) ** 2,
        0,
      ) / original.length,
    );
    const reference = Math.sqrt(
      original.reduce((sum, value) => sum + value ** 2, 0) / original.length,
    );
    return (100 * error) / reference;
  };

  return {
    original,
    anchor,
    alpha,
    prediction,
    residual,
    reconstruction,
    directError: relativeRmse(direct),
    reconstructionError: relativeRmse(reconstruction),
  };
}

function makePath(values: number[], bound: number) {
  const width = 720;
  const height = 286;
  const paddingX = 18;
  const paddingY = 22;
  const plotWidth = width - paddingX * 2;
  const plotHeight = height - paddingY * 2;

  return values
    .map((value, index) => {
      const x = paddingX + (index / (values.length - 1)) * plotWidth;
      const y = paddingY + ((bound - value) / (bound * 2)) * plotHeight;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

export function ResidualQuantDemo() {
  const [loop, setLoop] = useState(2);
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const data = useMemo(() => createLoopData(loop), [loop]);
  const isResidualStep = step === 3;
  const plotBound = isResidualStep
    ? Math.max(...data.residual.map((value) => Math.abs(value))) * 1.22
    : 1.28;

  useEffect(() => {
    if (!isPlaying) return;

    const timer = window.setTimeout(() => {
      if (step === STEPS.length - 1) {
        setIsPlaying(false);
        return;
      }
      setStep((current) => current + 1);
    }, 1050);

    return () => window.clearTimeout(timer);
  }, [isPlaying, step]);

  const selectStep = (nextStep: number) => {
    setStep(nextStep);
    setIsPlaying(false);
  };

  const togglePlayback = () => {
    if (!isPlaying && step === STEPS.length - 1) setStep(0);
    setIsPlaying((current) => !current);
  };

  return (
    <div className="rq-demo">
      <div className="rq-demo-topline">
        <p>
          Follow one representative KV slice from its full-precision state to
          its low-bit reconstruction.
        </p>
        <span>Illustrative values</span>
      </div>

      <div className="rq-demo-loops" aria-label="Select recurrent loop">
        <span>Loop</span>
        {[1, 2, 3, 4].map((loopNumber) => (
          <button
            type="button"
            key={loopNumber}
            className={loop === loopNumber ? "is-active" : ""}
            aria-pressed={loop === loopNumber}
            onClick={() => setLoop(loopNumber)}
          >
            {loopNumber}
          </button>
        ))}
        <span className="rq-demo-anchor-note">Loop 4 provides the anchor</span>
      </div>

      <div className="rq-demo-steps" aria-label="Quantization stages">
        {STEPS.map((item, index) => (
          <button
            type="button"
            key={item.short}
            className={step === index ? "is-active" : ""}
            aria-current={step === index ? "step" : undefined}
            onClick={() => selectStep(index)}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            {item.short}
          </button>
        ))}
      </div>

      <div className="rq-demo-stage">
        <div className="rq-demo-plot-wrap">
          <div className="rq-demo-plot-heading">
            <span>KV value</span>
            <strong aria-live="polite">{STEPS[step].label}</strong>
          </div>
          <svg
            className="rq-demo-plot"
            viewBox="0 0 720 286"
            role="img"
            aria-label={`${STEPS[step].label} for loop ${loop}`}
          >
            {[0.2, 0.4, 0.6, 0.8].map((position) => (
              <line
                key={position}
                x1="18"
                x2="702"
                y1={22 + position * 242}
                y2={22 + position * 242}
                className="rq-demo-gridline"
              />
            ))}
            <line x1="18" x2="702" y1="143" y2="143" className="rq-demo-zero" />

            {step === 0 && (
              <path
                pathLength="1"
                d={makePath(data.original, plotBound)}
                className="rq-demo-line rq-demo-line-original"
              />
            )}
            {step === 1 && (
              <>
                <path
                  pathLength="1"
                  d={makePath(data.original, plotBound)}
                  className="rq-demo-line rq-demo-line-reference"
                />
                <path
                  pathLength="1"
                  d={makePath(data.anchor, plotBound)}
                  className="rq-demo-line rq-demo-line-anchor"
                />
              </>
            )}
            {step === 2 && (
              <>
                <path
                  pathLength="1"
                  d={makePath(data.original, plotBound)}
                  className="rq-demo-line rq-demo-line-reference"
                />
                <path
                  pathLength="1"
                  d={makePath(data.prediction, plotBound)}
                  className="rq-demo-line rq-demo-line-prediction"
                />
              </>
            )}
            {step === 3 && (
              <path
                pathLength="1"
                d={makePath(data.residual, plotBound)}
                className="rq-demo-line rq-demo-line-residual"
              />
            )}
            {step === 4 && (
              <>
                <path
                  pathLength="1"
                  d={makePath(data.original, plotBound)}
                  className="rq-demo-line rq-demo-line-reference"
                />
                <path
                  pathLength="1"
                  d={makePath(data.reconstruction, plotBound)}
                  className="rq-demo-line rq-demo-line-reconstruction"
                />
              </>
            )}
          </svg>
          <div className="rq-demo-axis-label">Feature index</div>

          <div className="rq-demo-legend" aria-hidden="true">
            {step > 0 && step !== 3 && <span className="is-reference">Original</span>}
            <span className={`is-step-${step}`}>{STEPS[step].label}</span>
          </div>
        </div>

        <div className="rq-demo-equations" aria-label="ResidualQuant equations">
          <div className={step === 1 ? "is-active" : ""}>
            <span>Anchor</span>
            <code>A = Q₄(K₄)</code>
          </div>
          <div className={step === 2 ? "is-active" : ""}>
            <span>Prediction</span>
            <code>Pᵢ = αᵢA</code>
          </div>
          <div className={step === 3 ? "is-active" : ""}>
            <span>Residual</span>
            <code>Rᵢ = Kᵢ − Pᵢ</code>
          </div>
          <div className={step === 4 ? "is-active" : ""}>
            <span>Reconstruction</span>
            <code>K̂ᵢ = Pᵢ + Q₂(Rᵢ)</code>
          </div>
          <p>
            α<sub>{loop}</sub> = {data.alpha.toFixed(3)}
          </p>
        </div>
      </div>

      <div className="rq-demo-controls">
        <div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Reset animation"
            onClick={() => selectStep(0)}
          >
            <RotateCcw />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Previous stage"
            disabled={step === 0}
            onClick={() => selectStep(Math.max(0, step - 1))}
          >
            <ChevronLeft />
          </Button>
          <Button
            type="button"
            className="rq-demo-play"
            aria-label={isPlaying ? "Pause animation" : "Play animation"}
            onClick={togglePlayback}
          >
            {isPlaying ? <Pause /> : <Play />}
            {isPlaying ? "Pause" : "Play"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Next stage"
            disabled={step === STEPS.length - 1}
            onClick={() => selectStep(Math.min(STEPS.length - 1, step + 1))}
          >
            <ChevronRight />
          </Button>
        </div>
        <p>
          Illustrative relative RMSE: direct INT2{" "}
          <strong>{data.directError.toFixed(1)}%</strong> · ResidualQuant{" "}
          <strong>{data.reconstructionError.toFixed(1)}%</strong>
        </p>
      </div>

      <div className="rq-demo-storage">
        <span>Reported logical KV storage</span>
        <div>
          <label>BF16</label>
          <i><b style={{ width: "100%" }} /></i>
          <strong>100%</strong>
        </div>
        <div>
          <label>ResidualQuant</label>
          <i><b className="is-residualquant" style={{ width: "19.3%" }} /></i>
          <strong>19.3%</strong>
        </div>
      </div>
    </div>
  );
}
