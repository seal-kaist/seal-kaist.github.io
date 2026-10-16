'use client';

import { useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';

export function ResidualQuantTerminalVideo({ base = '/projects/residualquant/terminal-decode' }: { base?: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
    const element = video.current;
    if (!element) return;
    let visible = false;
    let active = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting && entry.intersectionRatio >= 0.2;
        if (!visible) {
          element.pause();
          return;
        }
        element.muted = true;
        if (element.ended) element.currentTime = 0;
        void element.play().then(() => {
          if (!active || !visible) element.pause();
        }).catch(() => {
          // Keep the manual play button if browser policy blocks autoplay.
          if (active) setStarted(false);
        });
      },
      { threshold: [0, 0.2] },
    );
    observer.observe(element);
    return () => {
      active = false;
      visible = false;
      observer.disconnect();
      element.pause();
    };
  }, []);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState(false);
  async function play() {
    const element = video.current;
    if (!element) return;
    setError(false);
    try {
      await element.play();
    } catch {
      setError(true);
    }
  }
  return (
    <div>
      <div className="rq-terminal-player">
        <video
          ref={video}
          controls
          playsInline
          muted
          preload="auto"
          poster={`${base}-poster.png`}
          aria-label="Actual terminal screen recordings comparing vLLM BF16 and ResidualQuant at 1x speed"
          onPlay={() => { setStarted(true); setError(false); }}
          onEnded={() => setStarted(false)}
          onError={() => setError(true)}
        >
          <source src={`${base}.webm`} type="video/webm" />
          <source src={`${base}.mp4`} type="video/mp4" />
        </video>
        {!started && !error && (
          <button type="button" className="rq-terminal-play" disabled={!ready} onClick={play} aria-label="Play decode comparison">
            <Play size={24} fill="currentColor" strokeWidth={1.5} aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="rq-terminal-links">
        {error && <span>Playback unavailable in this browser. Open the video directly:</span>}
        <a href={`${base}.mp4`} target="_blank" rel="noreferrer">Open MP4</a>
        <a href={`${base}.webm`} target="_blank" rel="noreferrer">Open WebM</a>
      </div>
    </div>
  );
}
