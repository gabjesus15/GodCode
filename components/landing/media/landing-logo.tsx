import { GcodeMark } from "@/components/ui/logo";

interface LandingLogoProps {
  className?: string;
  forceLightText?: boolean;
}

export function LandingLogo({ className, forceLightText = false }: LandingLogoProps) {
  const ink = forceLightText ? "#0f172a" : "var(--logo-ink)";
  const split = forceLightText ? "#ffffff" : "var(--logo-split)";
  const textColor = forceLightText ? "#0f172a" : "var(--logo-ink)";

  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`} aria-label="Gcode">
      <GcodeMark ink={ink} splitColor={split} className="h-10 w-10 shrink-0" />
      <span
        className="hidden text-[28px] font-bold leading-none tracking-tight sm:inline"
        style={{ color: textColor, fontFamily: "var(--font-space-grotesk), sans-serif" }}
      >
        <span style={{ color: "var(--logo-accent)" }}>code</span>
      </span>
    </span>
  );
}
