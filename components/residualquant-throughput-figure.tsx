'use client';

import { useEffect, useRef, useState } from 'react';
import data from '@/lib/residualquant-throughput-data.json';

const BATCHES = [1, 2, 4, 8, 16, 32, 64];
const CONTEXTS = [2048, 4096, 8192, 16384];

function ContextPanel({ context, phase }: { context: number; phase: number }) {
  const rows = data.rows.filter(row => row.context === context);
  const baseline = rows.filter(row => row.method === 'bf16_fa').sort((a,b) => a.batch - b.batch);
  const residual = rows.filter(row => row.method === 'ls_optr').sort((a,b) => a.batch - b.batch);
  const baselineBatch = baseline[baseline.length - 1].batch;
  const residualBatch = residual[residual.length - 1].batch;
  const baselinePeak = Math.max(...baseline.map(row => row.throughput));
  const residualPeak = Math.max(...residual.map(row => row.throughput));
  const lastPhase = Math.log2(residualBatch);
  const complete = phase >= lastPhase;
  const batch = BATCHES[Math.max(0, phase)];
  const maxY = Math.ceil(residualPeak / 100) * 100;
  const tx = (value: number) => 44 + Math.log2(value) / lastPhase * 248;
  const ty = (value: number) => 236 - value / maxY * 198;
  const ticks = BATCHES.filter(value => value <= residualBatch);
  return <div className={`rq-context-panel ${complete ? 'is-complete' : ''}`} data-context={context} data-complete={complete}>
    <div className="rq-context-heading"><h3>{context / 1024}k context</h3><div>{complete ? <><strong>{(residualPeak / baselinePeak).toFixed(2)}×</strong><span>peak throughput</span></> : <><strong>Batch {Math.min(batch, residualBatch)}</strong><span>decode throughput</span></>}</div></div>
    <svg viewBox="0 0 320 292" role="img" aria-label={`${context / 1024}k context: BF16 up to batch ${baselineBatch}, ResidualQuant up to batch ${residualBatch}, ${(residualPeak/baselinePeak).toFixed(2)} times peak throughput.`}>
      {[0,1,2,3,4].map(index => {
        const value = maxY / 4 * index;
        return <g key={index}><line x1="44" x2="292" y1={ty(value)} y2={ty(value)} className="rq-progress-grid" /><text x="36" y={ty(value)+4} textAnchor="end">{value}</text></g>;
      })}
      {['bf16_fa','ls_optr'].map(method => {
        const points = method === 'bf16_fa' ? baseline : residual;
        return <g key={method} className={method === 'bf16_fa' ? 'rq-progress-bf16' : 'rq-progress-throughput'}>
          {points.map((row,index) => <g key={row.batch} data-method={method} data-batch={row.batch} className={`rq-throughput-point ${Math.log2(row.batch) <= phase ? 'is-visible' : ''}`}>
            {index > 0 && <line x1={tx(points[index-1].batch)} y1={ty(points[index-1].throughput)} x2={tx(row.batch)} y2={ty(row.throughput)} strokeWidth="2.5" pathLength="1" className="rq-throughput-segment" />}
            {method === 'bf16_fa' ? <rect x={tx(row.batch)-3} y={ty(row.throughput)-3} width="6" height="6" rx=".8" /> : <circle cx={tx(row.batch)} cy={ty(row.throughput)} r="3.5" />}
          </g>)}
        </g>;
      })}
      {ticks.map(value => <text key={value} x={tx(value)} y="256" textAnchor="middle" fontWeight={value === Math.min(batch,residualBatch) ? '650' : '400'} fill={value === Math.min(batch,residualBatch) ? '#167D8D' : '#7C8B87'}>{value}</text>)}
      <text x="166" y="280" textAnchor="middle">Batch size</text>
      <text transform="translate(11 139) rotate(-90)" textAnchor="middle">Tokens/s</text>
    </svg>
    <div className={`rq-context-capacity ${complete ? 'is-visible' : ''}`}><strong>{residualBatch/baselineBatch}× batch capacity</strong><span>BF16 {baselineBatch} → ResidualQuant {residualBatch}</span></div>
  </div>;
}

export function ResidualQuantThroughputFigure() {
  const root = useRef<HTMLDivElement>(null);
  const [phase,setPhase] = useState(6);
  const [playing,setPlaying] = useState(false);
  const [visible,setVisible] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let wasVisible = false;
    const onPreference = () => { if (media.matches) { setPhase(6); setPlaying(false); } };
    media.addEventListener('change',onPreference);
    const observer = new IntersectionObserver(([entry]) => {
      const inView = entry.isIntersecting && entry.intersectionRatio >= .15;
      setVisible(inView);
      if (inView && !wasVisible && !media.matches) { setPhase(0); setPlaying(true); }
      wasVisible = inView;
    }, {threshold:[0,.15]});
    if(root.current) observer.observe(root.current);
    return () => {observer.disconnect();media.removeEventListener('change',onPreference);};
  },[]);
  useEffect(() => {
    if(!playing||!visible)return;
    const timer=window.setTimeout(()=>{if(phase===6)setPlaying(false);else setPhase(value=>value+1);},1500);
    return ()=>window.clearTimeout(timer);
  },[phase,playing,visible]);
  return <div ref={root} className="rq-context-figure" data-phase={phase}>
    <div className="rq-context-toolbar"><div className="rq-context-legend"><span>ResidualQuant</span><span>BF16</span></div></div>
    <div className="rq-context-grid">{CONTEXTS.map(context=><ContextPanel key={context} context={context} phase={phase}/>)}</div>
    <p className="rq-context-source">Ouro-1.4B · RTX 5090 · group size g=32 · 128 output tokens · decode only · one warm-up, three measured trials. Independent axis ranges; batch capacity means the largest feasible tested power-of-two batch.</p>
  </div>;
}
