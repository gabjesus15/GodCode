"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BOWL_PATH, SW, SPUR, SPLIT, SPLIT_W } from "./logo-geometry";

const WORD = "code";

interface WordmarkRevealProps {
  ink: string;
  panelBg: string;
  markClassName?: string;
  wordSize?: string;
}

// The mark (which IS the G) is always visible so server-side rendering never
// ships an invisible logo. Then "code" runs a typewriter loop: typed out
// letter by letter, held, deleted with backspaces, and repeated — with a
// blinking caret (a nod to the logo's cursor).
export function WordmarkReveal({
  ink,
  panelBg,
  markClassName = "h-24 w-24 shrink-0 sm:h-28 sm:w-28",
  wordSize = "clamp(56px, 7.5vw, 80px)",
}: WordmarkRevealProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    let i = 0;
    let dir = 1; // 1 = typing, -1 = deleting
    const tick = () => {
      i += dir;
      setCount(i);
      let delay: number;
      if (dir === 1 && i >= WORD.length) {
        dir = -1;
        delay = 1600; // hold the full word
      } else if (dir === -1 && i <= 0) {
        dir = 1;
        delay = 700; // pause while empty
      } else {
        delay = dir === 1 ? 135 : 75; // type slower than you delete
      }
      t = setTimeout(tick, delay);
    };
    t = setTimeout(tick, 900); // start after a short beat
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <motion.svg
        viewBox="136 136 752 752"
        className={markClassName}
        aria-label="Gcode mark"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{ color: ink }}
      >
        <path
          d={BOWL_PATH}
          fill="none"
          stroke="currentColor"
          strokeWidth={SW}
          strokeLinecap="round"
        />
        <line
          x1={SPUR.x1}
          y1={SPUR.y1}
          x2={SPUR.x2}
          y2={SPUR.y2}
          stroke="currentColor"
          strokeWidth={SW}
          strokeLinecap="round"
        />
        <line
          x1={SPLIT.x1}
          y1={SPLIT.y1}
          x2={SPLIT.x2}
          y2={SPLIT.y2}
          stroke="currentColor"
          strokeWidth={SPLIT_W}
          strokeLinecap="round"
          style={{ color: panelBg }}
        />
      </motion.svg>

      <div
        className="relative"
        style={{
          fontFamily: "var(--font-space-grotesk), sans-serif",
          fontWeight: 700,
          fontSize: wordSize,
          letterSpacing: "-0.03em",
          lineHeight: 1,
          color: ink,
        }}
      >
        {/* invisible sizer reserves the full width so the mark never shifts */}
        <span
          aria-hidden
          style={{ visibility: "hidden", whiteSpace: "nowrap", paddingRight: "0.2em" }}
        >
          {WORD}
        </span>

        {/* typed text + blinking caret, overlaid from the left */}
        <span
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            whiteSpace: "nowrap",
          }}
        >
          <span>{WORD.slice(0, count)}</span>
          <motion.span
            aria-hidden
            style={{
              display: "inline-block",
              width: "0.09em",
              height: "0.9em",
              marginLeft: "0.06em",
              backgroundColor: "currentColor",
              borderRadius: 2,
            }}
            animate={{ opacity: [1, 1, 0, 0] }}
            transition={{ duration: 1, repeat: Infinity, times: [0, 0.5, 0.5, 1], ease: "linear" }}
          />
        </span>
      </div>
    </div>
  );
}
