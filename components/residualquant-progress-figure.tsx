"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import data from "@/lib/residualquant-figure-data.json";

const LABELS = [["BF16"], ["INT2"], ["+Last-loop", "Residual"], ["+LS", "Scaling"], ["+Rotation"], ["+Mixed", "Precision"]];
const x = (i: number) => 68 + i * 86;
const y = (value: number) => 268 - value * 2;
const steps = data.steps;
// Six-stage palette from the paper's figures/plot_acc_throughput.py.
const BAR_COLORS = ['#F0F8F9', '#C5E4E7', '#99CDD4', '#6BB5C2', '#3C96AC', '#126E84'];
function starPoints(cx: number, cy: number) {
  return Array.from({ length: 10 }, (_, i) => {
    const angle = -Math.PI / 2 + i * Math.PI / 5;
    const radius = i % 2 === 0 ? 23 : 10.2;
    return `${cx + Math.cos(angle) * radius},${cy + Math.sin(angle) * radius}`;
  }).join(' ');
}

function ThroughputPlot({ phase }: { phase: number }) {
  const rows = data.throughput;
  const batches = [1, 2, 4, 8, 16];
  const batch = phase >= 0 ? batches[Math.min(phase, 4)] : 0;
  const tx = (value: number) => 62 + Math.log2(value) * 80;
  const ty = (value: number) => 268 - value * .5;
  const captions = [
    'Decode begins · batch 1',
    'More requests together · batch 2',
    'Same batch 4 · 1.73× faster',
    'Batch 8 · enabled by a smaller KV cache',
    'ResidualQuant reaches batch 16',
  ];
  return <svg viewBox="0 0 440 445" role="img" aria-label={phase < -1 ? 'Throughput animation begins after the accuracy and KV storage progression.' : `At 8k context, ${phase < 0 ? 'reduced KV storage enables larger batches' : captions[phase]}. Final peak throughput gain: 3.27 times.`}>
    {[0, 100, 200, 300, 400].map(v => <g key={v}><line x1="62" x2="398" y1={ty(v)} y2={ty(v)} className="rq-progress-grid" /><text x="50" y={ty(v) + 4} textAnchor="end">{v}</text></g>)}
    <text x="62" y="31" className="rq-progress-panel-title">Decode throughput · 8k context</text>
    {phase >= 0 && ['bf16_fa', 'ls_optr'].map(method => {
      const points = rows.filter(r => r.method === method).sort((a,b) => a.batch - b.batch);
      return <g key={method} className={method === 'ls_optr' ? 'rq-progress-throughput' : 'rq-progress-bf16'}>
        {points.map((point, index) => <g key={point.batch} className={`rq-throughput-point ${index <= phase ? 'is-visible' : ''}`} data-method={method} data-batch={point.batch}>
          {index > 0 && <line x1={tx(points[index - 1].batch)} y1={ty(points[index - 1].throughput)} x2={tx(point.batch)} y2={ty(point.throughput)} pathLength="1" className="rq-throughput-segment" strokeWidth="3" />}
          {method === 'bf16_fa' ? <rect x={tx(point.batch) - 4} y={ty(point.throughput) - 4} width="8" height="8" rx="1" /> : <circle cx={tx(point.batch)} cy={ty(point.throughput)} r={index === phase ? 5.5 : 4} />}
        </g>)}
      </g>;
    })}
    {phase < 0 && <g className="rq-throughput-handoff">
      <rect x="84" y="126" width="290" height="76" rx="10" fill="#F5FAF9" stroke="#D4E5E1" />
      <text x="229" y="152" textAnchor="middle" fill="#167D8D" fontSize="16" fontWeight="600">80.7% less KV storage</text>
      <text x="229" y="178" textAnchor="middle" fill="#6D8A83" fontSize="12">4× batch capacity</text>
    </g>}
    {phase >= 2 && <text x="232" y="205" fill="#62748A">BF16 · Batch capacity: 4</text>}
    {phase >= 0 && <text x="158" y="112" fill="#167D8D" fontSize="18" fontWeight="700">ResidualQuant</text>}
    {batches.map(value => <text key={value} x={tx(value)} y="292" textAnchor="middle" fill={batch === value ? '#167D8D' : '#7D8A86'} fontWeight={batch === value ? '700' : '400'}>{value}</text>)}
    <text x="220" y="325" textAnchor="middle">Batch size</text>
    <text transform="translate(18 170) rotate(-90)" textAnchor="middle">Tokens/s</text>
    {phase === 4 ? <text x="364" y="65" textAnchor="end" fill="#167D8D" fontSize="20" fontWeight="650">3.27× peak throughput</text>
      : phase >= 0 && <text x="62" y="53" fill="#167D8D" fontSize="11">{captions[phase]}</text>}
    {phase >= 3 && <text x="260" y={phase === 4 ? 251 : 258} textAnchor="middle" fill="#167D8D" fontSize={phase === 4 ? 14 : 12}>{phase === 4 ? '4× larger tested batch' : 'Batch 8 · expanded capacity'}</text>}
    {phase >= -1 && <g className="rq-throughput-capacity">
      <text x="62" y="351" fill="#82938D" fontSize="9">REQUESTS DECODING IN PARALLEL</text>
      <text x="62" y="376" fill="#62748A" fontSize="11">BF16 · {Math.min(batch, 4)}</text>
      <text x="62" y="405" fill="#167D8D" fontSize="11">ResidualQuant · {batch}</text>
      {Array.from({ length: 16 }, (_, index) => <g key={index}>
        <rect x={180 + index * 14} y="365" width="10" height="14" rx="2" fill={index < Math.min(batch, 4) ? '#62748A' : '#F1F4F3'} stroke={index < 4 ? '#C2CBD0' : '#E6ECEA'} />
        <rect x={180 + index * 14} y="394" width="10" height="14" rx="2" fill={index < batch ? '#167D8D' : '#F1F6F4'} stroke="#C3DAD5" />
      </g>)}
    </g>}
  </svg>;
}

export function ResidualQuantProgressFigure() {
  const root = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState(5);
  const [throughputPhase, setThroughputPhase] = useState(4);
  const [playing, setPlaying] = useState(false);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let wasVisible = false;
    const onPreference = () => { if (media.matches) { setStage(5); setThroughputPhase(4); setPlaying(false); } };
    media.addEventListener('change', onPreference);
    const observer = new IntersectionObserver(([entry]) => {
      const inView = entry.isIntersecting && entry.intersectionRatio >= .15;
      setVisible(inView);
      if (inView && !wasVisible) {
        if (!media.matches) { setStage(0); setThroughputPhase(-2); setPlaying(true); }
      }
      wasVisible = inView;
    }, { threshold: [0, .15] });
    if (root.current) observer.observe(root.current);
    return () => { observer.disconnect(); media.removeEventListener('change', onPreference); };
  }, []);
  useEffect(() => {
    if (!playing || !visible || throughputPhase !== -2) return;
    const timer = window.setTimeout(() => {
      if (stage === 5) setThroughputPhase(-1);
      else setStage(s => s + 1);
    }, 1600);
    return () => window.clearTimeout(timer);
  }, [stage, playing, visible, throughputPhase]);
  useEffect(() => {
    if (!playing || !visible || throughputPhase < -1) return;
    const timer = window.setTimeout(() => {
      if (throughputPhase === 4) setPlaying(false);
      else setThroughputPhase(value => value + 1);
    }, throughputPhase === -1 ? 2000 : 1700);
    return () => window.clearTimeout(timer);
  }, [throughputPhase, playing, visible]);

  return <div className="rq-progress" ref={root} data-stage={stage} data-throughput-phase={throughputPhase}>
    <div className="rq-progress-toolbar">
      <span>Building ResidualQuant <strong>{steps[stage].accuracy.toFixed(1)}% accuracy</strong></span>
      <div>
        <button type="button" onClick={() => { if (!playing && stage === 5 && throughputPhase === 4) { setStage(0); setThroughputPhase(-2); } setPlaying(p => !p); }} aria-label={playing ? 'Pause figure animation' : 'Play figure animation'}>{playing ? <Pause size={14} /> : <Play size={14} />}{playing ? 'Pause' : 'Play'}</button>
        <button type="button" onClick={() => { setStage(0); setThroughputPhase(-2); setPlaying(true); }}><RotateCcw size={14} /> Replay figure</button>
      </div>
    </div>
    <div className="rq-progress-panels">
      <svg viewBox="0 0 620 445" role="img" aria-label={`Figure 1 accuracy and KV storage progression. Current step: ${LABELS[stage].join(' ')}. Accuracy ${steps[stage].accuracy} percent. KV storage ${steps[stage].normalized_kv.toFixed(1)} percent of BF16.`}>
        <text x="68" y="31" className="rq-progress-panel-title">Accuracy ↑ · KV storage ↓</text>
        {[0, 25, 50, 75, 100].map(v => <g key={v}><line x1="48" x2="568" y1={y(v)} y2={y(v)} className="rq-progress-grid" /><text x="37" y={y(v) + 4} textAnchor="end" fill="#C77819">{v}</text><text x="580" y={y(v) + 4} fill="#167D8D">{v}</text></g>)}
        <line x1={(x(0) + x(1)) / 2} x2={(x(0) + x(1)) / 2} y1={y(100)} y2={y(0)} stroke="#CDD4DA" strokeWidth="1.1" strokeDasharray="3 3" aria-label="Separator between BF16 and low-bit quantization" />
        <text transform="translate(13 170) rotate(-90)" textAnchor="middle" fill="#C77819">Accuracy (%)</text>
        <text transform="translate(610 170) rotate(-90)" textAnchor="middle" fill="#167D8D">KV storage (% of BF16)</text>
        {steps.map((step, i) => <g key={i} className={`rq-progress-bar ${i <= stage ? 'is-visible' : ''}`}>
          <rect x={x(i) - 20} y={y(step.normalized_kv)} width="40" height={step.normalized_kv * 2} fill={BAR_COLORS[i]} stroke={i === 0 ? "#8EBEC7" : "none"} strokeWidth=".9" />
        </g>)}
        {steps.slice(1).map((step, j) => {
          const i = j + 1;
          return <g key={i} className={`rq-progress-edge ${i <= stage ? 'is-visible' : ''}`}>
            <line x1={x(i - 1)} y1={y(steps[i - 1].accuracy)} x2={x(i)} y2={y(step.accuracy)}
              stroke="#C77819" strokeWidth={i === 1 ? 1.5 : 2}
              strokeDasharray={i === 1 ? "4 4" : undefined} opacity={i === 1 ? .6 : 1}
              pathLength={i === 1 ? undefined : 1} className={i === 1 ? undefined : "rq-progress-connector"} />
          </g>;
        })}
        {steps.map((step, i) => <g key={i} className={`rq-progress-step ${i <= stage ? 'is-visible' : ''}`}>
          <text x={x(i)} y={y(step.normalized_kv) + (i === 0 ? -8 : 16)} textAnchor="middle" fill={i >= 4 ? "white" : "#167D8D"} fontSize="12">{step.normalized_kv.toFixed(1)}</text>
          {i === 5
            ? <polygon points={starPoints(x(i), y(step.accuracy))} fill="#C77819" stroke="white" strokeWidth="1" aria-label="ResidualQuant final result" />
            : <circle cx={x(i)} cy={y(step.accuracy)} r={i === 0 ? 4 : 9} fill="#C77819" stroke="white" strokeWidth="1" />}
          {i > 0 && <text x={x(i)} y={y(step.accuracy) + 3.5} textAnchor="middle" fill="white" fontSize="10" fontWeight="700">{i}</text>}
          {i === 5 && <text x={x(i)} y="177" textAnchor="middle" fill="#167D8D" fontSize="19" fontWeight="700"><tspan x={x(i)}>Residual</tspan><tspan x={x(i)} dy="21">Quant</tspan></text>}
          <text x={x(i)} y={y(step.accuracy) - (i === 5 ? 33 : i === 1 ? 25 : 20)} textAnchor="middle" className="rq-progress-value-label" fill="#C77819" fontSize="16" fontWeight={i === 5 ? '700' : '500'}>{step.accuracy.toFixed(1)}%</text>
        </g>)}
        {LABELS.map((lines, i) => <text key={i} x={x(i)} y="290" textAnchor="middle" className={i === stage ? 'rq-progress-current-label' : ''}>{lines.map((line,j) => <tspan key={line} x={x(i)} dy={j === 0 ? 0 : 16}>{line}</tspan>)}</text>)}
        <g aria-label={`KV storage: BF16 100%, current step ${steps[stage].normalized_kv.toFixed(1)}% of BF16`}>
          <text x="48" y="344" fill="#62748A" fontSize="12">BF16</text>
          <rect x="168" y="333" width="390" height="14" rx="3" fill="#62748A" />
          <text x="568" y="344" fill="#62748A" fontSize="12" fontWeight="600">100%</text>
          <g className={`rq-progress-storage-live ${stage >= 1 ? 'is-visible' : ''}`} style={{ opacity: stage >= 1 ? 1 : 0, transition: 'opacity 400ms ease' }}>
            <text x="48" y="376" fill="#126E84" fontSize="12" fontWeight="650">{['BF16', 'INT2', '+Residual', '+LS scaling', '+Rotation', 'ResidualQuant'][stage]}</text>
            <rect x="168" y="365" width="390" height="14" rx="3" fill="#EDF2F3" />
            <rect x="168" y="365" height="14" rx="3" fill={BAR_COLORS[stage]} stroke="#90BDC5" strokeWidth=".6"
              style={{ width: 390 * steps[stage].normalized_kv / 100, transition: 'width 900ms cubic-bezier(.22,1,.36,1), fill 700ms ease' }} />
            <text x="568" y="376" fill="#126E84" fontSize="12" fontWeight="650">{steps[stage].normalized_kv.toFixed(1)}%</text>
            <line x1={168 + 390 * steps[stage].normalized_kv / 100} x2="558" y1="397" y2="397" stroke="#167D8D" strokeWidth="1.5" />
            <path d={`M${174 + 390 * steps[stage].normalized_kv / 100},393 L${168 + 390 * steps[stage].normalized_kv / 100},397 L${174 + 390 * steps[stage].normalized_kv / 100},401 M552,393 L558,397 L552,401`} fill="none" stroke="#167D8D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <text x={363 + 195 * steps[stage].normalized_kv / 100} y="424" textAnchor="middle" fill="#167D8D" fontSize="18" fontWeight={stage === 5 ? '700' : '500'}>{(100 - steps[stage].normalized_kv).toFixed(1)}% less KV storage</text>
          </g>
        </g>
      </svg>
      <ThroughputPlot phase={throughputPhase} />
    </div>
    <div className="rq-progress-step-controls" aria-label="Select Figure 1 step">{LABELS.map((label,i) => <button key={i} type="button" aria-current={i === stage ? 'step' : undefined} onClick={() => { setStage(i); setThroughputPhase(-2); setPlaying(false); }}>{label.join(' ')}</button>)}</div>
    <p className="rq-progress-source">Paper Figure 1 · Ouro-1.4B · MATH500 · group size g=32 · Throughput: RTX 5090, 8k context, decode only.</p>
  </div>;
}
