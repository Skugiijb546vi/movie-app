import { useEffect, useState } from "react";

export function Intro({ onDone }: { onDone: () => void }) {
  const [out, setOut] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setOut(true), 3000);
    const t2 = setTimeout(() => onDone(), 3700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-black overflow-hidden transition-opacity duration-700 ${
        out ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* pulsing ambient glow behind logo */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full blur-[140px] intro-glow"
        style={{ background: "color-mix(in oklab, var(--primary) 45%, transparent)" }}
      />
      {/* vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.9) 100%)" }}
      />

      <div className="relative flex flex-col items-center">
        {/* Netflix-style wordmark: starts huge & blurry, snaps down into place */}
        <h1
          className="relative overflow-hidden text-6xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text whitespace-nowrap intro-netflix"
          style={{
            fontFamily: "'Inter', sans-serif",
            backgroundImage:
              "linear-gradient(to bottom, #ffffff 0%, color-mix(in oklab, var(--primary) 40%, #fff) 55%, color-mix(in oklab, var(--primary) 90%, #000) 100%)",
            filter: "drop-shadow(0 0 40px color-mix(in oklab, var(--primary) 60%, transparent))",
          }}
        >
          SEBAR TV
          {/* sheen sweep */}
          <span
            className="absolute inset-0 intro-sheen pointer-events-none"
            style={{
              background:
                "linear-gradient(110deg, transparent 40%, rgba(255,255,255,0.55) 50%, transparent 60%)",
            }}
          />
        </h1>

        {/* accent bar under logo */}
        <div className="mt-5 h-[2px] relative overflow-hidden intro-bar-wrap">
          <div
            className="h-full rounded-full"
            style={{
              background:
                "linear-gradient(to right, transparent, var(--primary), color-mix(in oklab, var(--primary) 70%, #fff), var(--primary), transparent)",
              boxShadow: "0 0 18px color-mix(in oklab, var(--primary) 80%, transparent)",
            }}
          />
        </div>
      </div>

      <style>{`
        /* Netflix TUDUM-style: fly in from huge & blurry, snap to place, then punch-out */
        @keyframes introNetflix {
          0%   { opacity: 0; transform: scale(2.4);  filter: blur(30px) drop-shadow(0 0 0 transparent); letter-spacing: .2em; }
          35%  { opacity: 1; transform: scale(1);    filter: blur(0)     drop-shadow(0 0 40px color-mix(in oklab, var(--primary) 60%, transparent)); letter-spacing: -.02em; }
          70%  { opacity: 1; transform: scale(1);    filter: blur(0)     drop-shadow(0 0 40px color-mix(in oklab, var(--primary) 60%, transparent)); }
          100% { opacity: 0; transform: scale(1.35); filter: blur(14px)  drop-shadow(0 0 0 transparent); }
        }
        @keyframes introSheen {
          0%   { transform: translateX(-120%); }
          100% { transform: translateX(120%); }
        }
        @keyframes introBar {
          0%   { width: 0px;   opacity: 0; }
          40%  { width: 180px; opacity: 1; }
          80%  { width: 180px; opacity: 1; }
          100% { width: 0px;   opacity: 0; }
        }
        @keyframes introGlow {
          0%   { opacity: 0;   transform: scale(.6); }
          40%  { opacity: .7;  transform: scale(1.1); }
          80%  { opacity: .55; transform: scale(1.15); }
          100% { opacity: 0;   transform: scale(1.4); }
        }
        .intro-netflix  { animation: introNetflix 3s cubic-bezier(.16,1,.3,1) forwards; }
        .intro-sheen    { animation: introSheen 2.2s .7s ease-out forwards; }
        .intro-bar-wrap { animation: introBar 3s cubic-bezier(.16,1,.3,1) forwards; }
        .intro-glow     { animation: introGlow 3s ease-out forwards; }
      `}</style>
    </div>
  );
}
