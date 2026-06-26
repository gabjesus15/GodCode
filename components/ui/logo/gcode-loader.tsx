"use client";

import { motion } from "framer-motion";
import { VB, C, BOWL_PATH, SW, SPUR, SPLIT, SPLIT_W } from "./logo-geometry";

interface GcodeLoaderProps {
  ink: string;
  panelBg: string;
}

const DURATION = 3.8;
const ANCHOR_R = 373; // invisible circle that centers the bowl's bbox on C
const SPIN_SCALE = 0.55; // the spinning circle is compact...

// Clean loader: only the circle (the bowl of the G) spins, and it spins
// COMPACT. As it eases to a stop it expands to full size, the spur draws in
// and the diagonal channel fades in — completing the G. They hold, then fade
// out GENTLY, and only afterwards the circle shrinks back and accelerates away.
//
// Fluidity: both spinning segments cover the same angle in the same time, so
// the loop seam (mid-cruise) has matching speed/scale — no jump, no pop.
export function GcodeLoader({ ink, panelBg }: GcodeLoaderProps) {
  return (
    <svg
      viewBox={`0 0 ${VB} ${VB}`}
      className="h-28 w-28 sm:h-36 sm:w-36"
      style={{ overflow: "visible", color: ink }}
      aria-label="Gcode loading animation"
    >
      {/* The circle cruises compact, stops while expanding, holds, then shrinks
          back and accelerates away */}
      <motion.g
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
        initial={{ rotate: 0, scale: SPIN_SCALE }}
        animate={{
          rotate: [0, 360, 360, 720],
          scale: [SPIN_SCALE, SPIN_SCALE, 1, 1, SPIN_SCALE, SPIN_SCALE],
        }}
        transition={{
          rotate: {
            duration: DURATION,
            repeat: Infinity,
            times: [0, 0.28, 0.72, 1],
            ease: ["easeOut", "linear", "easeIn"],
          },
          scale: {
            duration: DURATION,
            repeat: Infinity,
            times: [0, 0.16, 0.28, 0.72, 0.88, 1],
            ease: "easeInOut",
          },
        }}
      >
        <circle cx={C} cy={C} r={ANCHOR_R} fill="none" />
        <path
          d={BOWL_PATH}
          fill="none"
          stroke="currentColor"
          strokeWidth={SW}
          strokeLinecap="round"
        />
      </motion.g>

      {/* Spur draws in when the circle settles, holds, then fades out gently */}
      <motion.line
        x1={SPUR.x1}
        y1={SPUR.y1}
        x2={SPUR.x2}
        y2={SPUR.y2}
        stroke="currentColor"
        strokeWidth={SW}
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: [0, 0, 1, 1, 1, 1], opacity: [0, 0, 1, 1, 0, 0] }}
        transition={{
          duration: DURATION,
          repeat: Infinity,
          ease: "easeInOut",
          times: [0, 0.3, 0.44, 0.58, 0.72, 1],
        }}
      />

      {/* Diagonal channel fades in just behind the spur and out with it */}
      <motion.line
        x1={SPLIT.x1}
        y1={SPLIT.y1}
        x2={SPLIT.x2}
        y2={SPLIT.y2}
        stroke="currentColor"
        strokeWidth={SPLIT_W}
        strokeLinecap="round"
        style={{ color: panelBg }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0, 1, 1, 0, 0] }}
        transition={{
          duration: DURATION,
          repeat: Infinity,
          ease: "easeInOut",
          times: [0, 0.34, 0.46, 0.58, 0.72, 1],
        }}
      />
    </svg>
  );
}
