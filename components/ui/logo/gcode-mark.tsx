import { BOWL_PATH, SW, SPUR, SPLIT, SPLIT_W } from "./logo-geometry";

type Props = {
  ink: string; // letterform color (CSS value)
  splitColor: string; // must match the background behind the mark
  className?: string;
};

// The flat, static Gcode mark — the winning design. The diagonal channel is
// drawn in the background color, so pass the surface color as `splitColor`.
// Colors are applied via currentColor so they stay in sync with the theme
// after server-side rendering.
export function GcodeMark({ ink, splitColor, className }: Props) {
  return (
    <svg
      viewBox="136 136 752 752"
      className={className}
      role="img"
      aria-label="Gcode logo"
      xmlns="http://www.w3.org/2000/svg"
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
        style={{ color: splitColor }}
      />
    </svg>
  );
}
