"use client";

import { useReducedMotion } from "framer-motion";

export function LandingAnimatedGrid() {
  const prefersReduced = useReducedMotion();
  const animate = !prefersReduced;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className={`absolute -left-[15%] -top-[20%] h-[500px] w-[500px] rounded-full bg-indigo-500/20 blur-[100px] sm:h-[650px] sm:w-[650px] ${animate ? "animate-[aurora-1_8s_ease-in-out_infinite]" : ""}`}
      />
      <div
        className={`absolute -bottom-[20%] -right-[15%] h-[450px] w-[450px] rounded-full bg-violet-500/20 blur-[100px] sm:h-[600px] sm:w-[600px] ${animate ? "animate-[aurora-2_10s_ease-in-out_infinite]" : ""}`}
      />
      <div
        className={`absolute left-[20%] top-[10%] h-[400px] w-[400px] rounded-full bg-blue-500/15 blur-[90px] sm:h-[500px] sm:w-[500px] ${animate ? "animate-[aurora-3_7s_ease-in-out_infinite]" : ""}`}
      />

      {/* Subtle noise texture */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
        backgroundRepeat: "repeat",
        backgroundSize: "128px 128px",
      }} />
    </div>
  );
}
