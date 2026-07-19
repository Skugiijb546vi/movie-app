import { cn } from "@/lib/utils";

type Size = "xs" | "sm" | "md" | "lg";

const sizeMap: Record<Size, { pad: string; text: string; gap: string; dot: string }> = {
  xs: { pad: "px-1.5 py-[1px]", text: "text-[9px]",  gap: "gap-1",   dot: "h-1 w-1" },
  sm: { pad: "px-2 py-[2px]",   text: "text-[10px]", gap: "gap-1",   dot: "h-1 w-1" },
  md: { pad: "px-2.5 py-0.5",   text: "text-xs",     gap: "gap-1.5", dot: "h-1.5 w-1.5" },
  lg: { pad: "px-3 py-1",       text: "text-sm",     gap: "gap-1.5", dot: "h-1.5 w-1.5" },
};

/**
 * Minimal, premium VIP mark.
 * A hairline gold pill with a small dot glyph and tracked-out label.
 * `variant="solid"` for CTAs/buttons.
 */
export function VipBadge({
  size = "sm",
  variant = "outline",
  className,
  showLabel = true,
}: {
  size?: Size;
  variant?: "outline" | "solid";
  className?: string;
  showLabel?: boolean;
}) {
  const s = sizeMap[size];
  return (
    <span
      className={cn(
        variant === "solid" ? "vip-badge-solid" : "vip-badge",
        "inline-flex items-center rounded-full font-semibold uppercase",
        s.pad,
        s.text,
        s.gap,
        className,
      )}
      title="VIP"
    >
      <span
        aria-hidden
        className={cn("rounded-full shrink-0", s.dot)}
        style={{ background: variant === "solid" ? "#1a1200" : "#f5c85a" }}
      />
      {showLabel && <span>VIP</span>}
    </span>
  );
}

/** Subtle static gold hairline ring around an avatar, with optional floating crown. */
export function VipAvatarRing({
  children,
  active,
  crown = false,
  size = "md",
  className,
}: {
  children: React.ReactNode;
  active: boolean;
  crown?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  if (!active) return <>{children}</>;
  return (
    <span className={cn("vip-ring relative inline-flex rounded-full", className)}>
      {children}
      {crown && (
        <span aria-hidden className={cn("vip-crown", size === "sm" && "vip-crown-sm")} title="VIP">
          <svg viewBox="0 0 32 22" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="vipCrownGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fff6d0" />
                <stop offset="40%" stopColor="#f5c85a" />
                <stop offset="100%" stopColor="#8a5a0a" />
              </linearGradient>
              <linearGradient id="vipCrownShine" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgba(255,255,255,0)" />
                <stop offset="50%" stopColor="rgba(255,255,255,0.85)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </linearGradient>
            </defs>
            {/* 3-point classic crown */}
            <path
              d="M3 8.5c-.6-.5-.1-1.5.7-1.2L10 9.2l4.6-6.1c.7-.9 2.1-.9 2.8 0L22 9.2l6.3-1.9c.8-.3 1.3.7.7 1.2l-3 8.4c-.2.5-.7.9-1.3.9H7.3c-.6 0-1.1-.4-1.3-.9L3 8.5z"
              fill="url(#vipCrownGrad)"
              stroke="rgba(90,60,8,0.75)"
              strokeWidth="0.7"
              strokeLinejoin="round"
            />
            {/* base band */}
            <rect x="6.4" y="17.2" width="19.2" height="2.2" rx="1" fill="url(#vipCrownGrad)" stroke="rgba(90,60,8,0.75)" strokeWidth="0.6" />
            {/* jewels */}
            <circle cx="16" cy="12" r="1.4" fill="#e94560" stroke="rgba(90,60,8,0.7)" strokeWidth="0.4" />
            <circle cx="9.5" cy="13" r="1" fill="#4fc3f7" stroke="rgba(90,60,8,0.7)" strokeWidth="0.35" />
            <circle cx="22.5" cy="13" r="1" fill="#66d17a" stroke="rgba(90,60,8,0.7)" strokeWidth="0.35" />
          </svg>
        </span>
      )}
    </span>
  );
}
