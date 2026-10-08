'use client';

import { useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';

const BASE = '/projects/residualquant/terminal-live-16k-b2-b4';

export function ResidualQuantTerminalVideo() {
  const video = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
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
          poster={`${BASE}-poster.png?v=subtitles`}
          aria-label="Real-time terminal comparison of vLLM BF16 and ResidualQuant decoding"
          onPlay={() => { setStarted(true); setError(false); }}
          onEnded={() => setStarted(false)}
          onError={() => setError(true)}
        >
          <source src={`${BASE}.webm?v=subtitles`} type="video/webm" />
          <source src={`${BASE}.mp4?v=subtitles`} type="video/mp4" />
        </video>
        {!started && !error && (
          <button type="button" className="rq-terminal-play" disabled={!ready} onClick={play} aria-label="Play decode comparison">
            <Play size={25} fill="currentColor" />
            <span>{ready ? 'Watch terminal recording' : 'Loading video…'}</span>
          </button>
        )}
      </div>
      <div className="rq-terminal-links">
        {error && <span>Playback unavailable in this browser. Open the video directly:</span>}
        <a href={`${BASE}.mp4?v=subtitles`} target="_blank" rel="noreferrer">Open MP4</a>
        <a href={`${BASE}.webm?v=subtitles`} target="_blank" rel="noreferrer">Open WebM</a>
      </div>
    </div>
  );
}
