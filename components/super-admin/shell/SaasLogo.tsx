"use client";

import { GcodeMark } from "@/components/ui/logo";
import { WordmarkReveal } from "@/components/ui/logo/wordmark-reveal";

const MARK_CLASS = { sm: "h-7 w-7", md: "h-9 w-9", lg: "h-12 w-12" } as const;

interface SaasLogoProps {
  size?: "sm" | "md" | "lg";
  animated?: boolean;
}

export function SaasLogo({ size = "md", animated = false }: SaasLogoProps) {
  const markClass = MARK_CLASS[size];
  const text =
    size === "lg" ? "text-[34px] leading-none" : size === "sm" ? "text-lg" : "text-xl";

  if (animated) {
    return (
      <WordmarkReveal
        ink="var(--logo-ink)"
        panelBg="var(--logo-split)"
        markClassName={`shrink-0 ${markClass}`}
        wordSize={size === "lg" ? "34px" : size === "sm" ? "18px" : "22px"}
      />
    );
  }

  return (
    <span className="inline-flex items-center gap-2.5" aria-label="Gcode">
      <GcodeMark
        ink="var(--logo-ink)"
        splitColor="var(--logo-split)"
        className={`shrink-0 ${markClass}`}
      />
      <span
        className={`${text} font-bold tracking-tight`}
        style={{ color: "var(--logo-ink)" }}
      >
        <span style={{ color: "var(--logo-accent)" }}>code</span>
      </span>
    </span>
  );
}
