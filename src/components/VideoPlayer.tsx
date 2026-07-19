import { useCallback, useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
  Settings2,
  PictureInPicture2,
  Loader2,
} from "lucide-react";

type Props = {
  src: string;
  poster?: string;
  title?: string;
  initialTime?: number;
  onProgress?: (currentSeconds: number, durationSeconds: number) => void;
};

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function fmt(sec: number) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const mm = h ? String(m).padStart(2, "0") : String(m);
  const ss = String(s).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function VideoPlayer({ src, poster, title, initialTime, onProgress }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hideTimer = useRef<number | null>(null);
  const lastProgressRef = useRef<number>(0);

  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [loading, setLoading] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);

  const scheduleHide = useCallback(() => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setShowControls(false);
    }, 2600);
  }, []);

  const revealControls = useCallback(() => {
    setShowControls(true);
    scheduleHide();
  }, [scheduleHide]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play();
    else v.pause();
  }, []);

  const seekBy = useCallback((delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min((v.duration || 0), v.currentTime + delta));
    revealControls();
  }, [revealControls]);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const el = wrapRef.current;
    if (!el) return;
    if (!document.fullscreenElement) await el.requestFullscreen?.();
    else await document.exitFullscreen?.();
  }, []);

  const togglePip = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      // @ts-ignore
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      // @ts-ignore
      else await v.requestPictureInPicture();
    } catch {}
  }, []);

  // Fullscreen listener
  useEffect(() => {
    const h = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          revealControls();
          break;
        case "ArrowLeft":
          seekBy(-5);
          break;
        case "ArrowRight":
          seekBy(5);
          break;
        case "j":
          seekBy(-10);
          break;
        case "l":
          seekBy(10);
          break;
        case "m":
          toggleMute();
          revealControls();
          break;
        case "f":
          toggleFullscreen();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, seekBy, toggleMute, toggleFullscreen, revealControls]);

  const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const t = Number(e.target.value);
    setCurrent(t);
    v.currentTime = t;
  };

  const onVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const val = Number(e.target.value);
    v.volume = val;
    v.muted = val === 0;
  };

  const setPlaybackRate = (r: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = r;
    setSpeed(r);
    setSpeedOpen(false);
  };

  const progressPct = duration ? (current / duration) * 100 : 0;
  const bufferedPct = duration ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={wrapRef}
      dir="ltr"
      className="group relative w-full aspect-video overflow-hidden rounded-xl bg-black shadow-2xl shadow-primary/10 ring-1 ring-white/10 select-none"
      onMouseMove={revealControls}
      onMouseLeave={() => {
        if (videoRef.current && !videoRef.current.paused) setShowControls(false);
      }}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        playsInline
        className="h-full w-full object-contain bg-black"
        onClick={() => { togglePlay(); revealControls(); }}
        onDoubleClick={toggleFullscreen}
        onPlay={() => { setPlaying(true); scheduleHide(); }}
        onPause={() => { setPlaying(false); setShowControls(true); }}
        onWaiting={() => setLoading(true)}
        onPlaying={() => setLoading(false)}
        onCanPlay={() => setLoading(false)}
        onLoadedMetadata={(e) => {
          const v = e.target as HTMLVideoElement;
          setDuration(v.duration || 0);
          if (initialTime && initialTime > 3 && initialTime < (v.duration || 0) - 5) {
            v.currentTime = initialTime;
          }
        }}
        onTimeUpdate={(e) => {
          const v = e.target as HTMLVideoElement;
          if (!scrubbing) setCurrent(v.currentTime);
          if (onProgress && v.duration) {
            const now = Date.now();
            if (now - lastProgressRef.current > 5000) {
              lastProgressRef.current = now;
              onProgress(v.currentTime, v.duration);
            }
          }
        }}
        onProgress={(e) => {
          const v = e.target as HTMLVideoElement;
          if (v.buffered.length) setBuffered(v.buffered.end(v.buffered.length - 1));
        }}
        onVolumeChange={(e) => {
          const v = e.target as HTMLVideoElement;
          setVolume(v.volume);
          setMuted(v.muted);
        }}
      />

      {/* Loading spinner */}
      {loading && (
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <Loader2 className="h-10 w-10 animate-spin text-white/90 drop-shadow-lg" />
        </div>
      )}

      {/* Center controls: back 10 | play/pause | forward 10 */}
      <div
        className={`absolute inset-0 grid place-items-center pointer-events-none transition-opacity duration-300 ${
          showControls || !playing ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="flex items-center gap-6 md:gap-10 pointer-events-auto">
          <button
            onClick={() => seekBy(-10)}
            aria-label="Back 10s"
            className="rounded-full bg-black/40 backdrop-blur p-3 md:p-3.5 ring-1 ring-white/15 text-white hover:bg-black/60 hover:scale-105 transition"
          >
            <RotateCcw className="h-6 w-6 md:h-7 md:w-7" />
          </button>
          <button
            onClick={togglePlay}
            aria-label={playing ? "Pause" : "Play"}
            className="rounded-full bg-primary/90 backdrop-blur p-4 md:p-5 shadow-2xl ring-1 ring-white/20 text-primary-foreground hover:scale-110 transition"
          >
            {playing ? (
              <Pause className="h-8 w-8 md:h-10 md:w-10 fill-current" />
            ) : (
              <Play className="h-8 w-8 md:h-10 md:w-10 fill-current translate-x-0.5" />
            )}
          </button>
          <button
            onClick={() => seekBy(10)}
            aria-label="Forward 10s"
            className="rounded-full bg-black/40 backdrop-blur p-3 md:p-3.5 ring-1 ring-white/15 text-white hover:bg-black/60 hover:scale-105 transition"
          >
            <RotateCw className="h-6 w-6 md:h-7 md:w-7" />
          </button>
        </div>
      </div>


      {/* Top gradient + title */}
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/70 to-transparent transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      />
      {title && (
        <div
          className={`absolute top-3 left-4 right-4 text-white/95 font-medium text-sm md:text-base drop-shadow transition-opacity duration-300 ${
            showControls ? "opacity-100" : "opacity-0"
          }`}
        >
          {title}
        </div>
      )}

      {/* Bottom controls */}
      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3 md:px-4 pt-10 pb-3 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Seek bar */}
        <div className="relative h-6 flex items-center group/seek">
          <div className="absolute inset-x-0 h-1.5 rounded-full bg-white/20 overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-white/30" style={{ width: `${bufferedPct}%` }} />
            <div className="absolute inset-y-0 left-0 bg-primary" style={{ width: `${progressPct}%` }} />
          </div>
          <div
            className="absolute h-3 w-3 rounded-full bg-primary shadow ring-2 ring-white/80 -translate-x-1/2 opacity-0 group-hover/seek:opacity-100 transition"
            style={{ left: `${progressPct}%` }}
          />
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.05}
            value={current}
            onChange={onSeek}
            onPointerDown={() => setScrubbing(true)}
            onPointerUp={() => setScrubbing(false)}
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
            aria-label="Seek"
          />
        </div>

        {/* Buttons row */}
        <div className="mt-2 flex items-center gap-2 md:gap-3 text-white">
          <div className="group/vol flex items-center gap-1">

            <button onClick={toggleMute} className="p-1.5 hover:text-primary transition" aria-label={muted ? "Unmute" : "Mute"}>
              {muted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={muted ? 0 : volume}
              onChange={onVolume}
              className="w-0 group-hover/vol:w-20 md:w-20 accent-primary transition-all duration-300"
              aria-label="Volume"
            />
          </div>

          <div className="text-xs md:text-sm tabular-nums text-white/90 ml-1">
            {fmt(current)} <span className="text-white/50">/ {fmt(duration)}</span>
          </div>

          <div className="ml-auto flex items-center gap-1 md:gap-2">
            <div className="relative">
              <button
                onClick={() => setSpeedOpen((v) => !v)}
                className="p-1.5 hover:text-primary transition flex items-center gap-1 text-xs md:text-sm"
                aria-label="Playback speed"
              >
                <Settings2 className="h-5 w-5" />
                <span className="hidden sm:inline">{speed}x</span>
              </button>
              {speedOpen && (
                <div className="absolute bottom-full right-0 mb-2 rounded-lg bg-black/90 backdrop-blur border border-white/10 py-1 min-w-[90px] shadow-xl">
                  {SPEEDS.map((r) => (
                    <button
                      key={r}
                      onClick={() => setPlaybackRate(r)}
                      className={`block w-full text-left px-3 py-1.5 text-sm hover:bg-white/10 ${
                        r === speed ? "text-primary" : "text-white/90"
                      }`}
                    >
                      {r}x {r === 1 && <span className="text-white/40 text-xs">Normal</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={togglePip} className="p-1.5 hover:text-primary transition hidden md:block" aria-label="Picture in picture">
              <PictureInPicture2 className="h-5 w-5" />
            </button>

            <button onClick={toggleFullscreen} className="p-1.5 hover:text-primary transition" aria-label="Fullscreen">
              {fullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VideoPlayer;
